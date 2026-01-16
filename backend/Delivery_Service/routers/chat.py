from fastapi import APIRouter, HTTPException, Depends, Header, Request, WebSocket, WebSocketDisconnect
from fastapi.exceptions import RequestValidationError
from pydantic import BaseModel, ValidationError
from typing import Optional, List, Dict
from datetime import datetime
import sys
import os
import traceback
import json

sys.path.append(os.path.dirname(os.path.dirname(__file__)))
from database import get_db_connection

router = APIRouter()

# Store active WebSocket connections by order_id
active_connections: Dict[int, List[WebSocket]] = {}

class ChatMessage(BaseModel):
    order_id: int
    sender_id: str
    sender_type: str  # 'customer' or 'rider'
    message: str

class MessageResponse(BaseModel):
    id: int
    order_id: int
    sender_id: str
    sender_type: str
    message: str
    timestamp: str

@router.post("/chat/send")
async def send_message(request: Request):
    """Send a chat message between customer and rider"""
    try:
        # Get raw body for debugging
        body = await request.json()
        print(f"Raw request body: {body}")
        
        # Validate with Pydantic
        chat_message = ChatMessage(**body)
        print(f"Validated chat message: {chat_message}")
        
        authorization = request.headers.get("authorization")
        conn = await get_db_connection()
        cursor = await conn.cursor()
        
        # Verify the order exists and get rider/customer info (using OrderID, UserName, AssignedRiderID)
        await cursor.execute("""
            SELECT o.OrderID, o.UserName, o.AssignedRiderID 
            FROM Orders o 
            WHERE o.OrderID = ?
        """, (chat_message.order_id,))
        
        order = await cursor.fetchone()
        if not order:
            raise HTTPException(status_code=404, detail="Order not found")
        
        order_id, customer_id, rider_id = order
        
        # Debug logging
        print(f"Chat Debug - Order ID: {order_id}, Customer ID: {customer_id}, Rider ID: {rider_id}")
        print(f"Chat Debug - Sender ID: {chat_message.sender_id}, Sender Type: {chat_message.sender_type}")
        
        # Verify sender is authorized (either the customer or the rider for this order)
        if chat_message.sender_type == 'customer':
            # Verify sender_id matches the order's customer
            if str(customer_id) != str(chat_message.sender_id):
                raise HTTPException(status_code=403, detail=f"Not authorized: customer_id={customer_id}, sender_id={chat_message.sender_id}")
        elif chat_message.sender_type == 'rider':
            # Verify sender_id matches the order's rider
            if not rider_id:
                raise HTTPException(status_code=400, detail=f"Order {order_id} has no rider assigned yet")
            if str(rider_id) != str(chat_message.sender_id):
                raise HTTPException(status_code=403, detail=f"Not authorized: rider_id={rider_id}, sender_id={chat_message.sender_id}")
        else:
            raise HTTPException(status_code=400, detail="Invalid sender_type")
        
        # Create chat table if it doesn't exist
        await cursor.execute("""
            IF NOT EXISTS (SELECT * FROM sysobjects WHERE name='chat_messages' AND xtype='U')
            CREATE TABLE chat_messages (
                id INT IDENTITY(1,1) PRIMARY KEY,
                order_id INT NOT NULL,
                sender_id NVARCHAR(50) NOT NULL,
                sender_type NVARCHAR(20) NOT NULL,
                message NVARCHAR(MAX) NOT NULL,
                timestamp DATETIME DEFAULT GETDATE(),
                FOREIGN KEY (order_id) REFERENCES orders(OrderID)
            )
        """)
        await conn.commit()
        
        # Insert the message
        await cursor.execute("""
            INSERT INTO chat_messages (order_id, sender_id, sender_type, message)
            VALUES (?, ?, ?, ?)
        """, (chat_message.order_id, chat_message.sender_id, chat_message.sender_type, chat_message.message))
        
        await conn.commit()
        
        await cursor.close()
        await conn.close()
        
        return {"message": "Message sent successfully"}
        
    except ValidationError as ve:
        print(f"Validation error: {ve}")
        print(f"Validation errors: {ve.errors()}")
        raise HTTPException(status_code=422, detail=ve.errors())
    except HTTPException:
        raise
    except Exception as e:
        print(f"Error sending message: {e}")
        print(f"Traceback: {traceback.format_exc()}")
        raise HTTPException(status_code=500, detail=str(e))

@router.get("/chat/messages/{order_id}")
async def get_messages(order_id: int, authorization: Optional[str] = Header(None)):
    """Get all chat messages for an order"""
    try:
        conn = await get_db_connection()
        cursor = await conn.cursor()
        
        # Verify the order exists (using OrderID instead of id)
        await cursor.execute("""
            SELECT OrderID FROM orders WHERE OrderID = ?
        """, (order_id,))
        
        order = await cursor.fetchone()
        if not order:
            raise HTTPException(status_code=404, detail="Order not found")
        
        # Check if chat_messages table exists
        await cursor.execute("""
            SELECT COUNT(*) FROM sysobjects WHERE name='chat_messages' AND xtype='U'
        """)
        table_exists = (await cursor.fetchone())[0]
        
        if not table_exists:
            await cursor.close()
            await conn.close()
            return {"messages": []}
        
        # Get all messages for this order
        await cursor.execute("""
            SELECT id, order_id, sender_id, sender_type, message, timestamp
            FROM chat_messages
            WHERE order_id = ?
            ORDER BY timestamp ASC
        """, (order_id,))
        
        rows = await cursor.fetchall()
        
        messages = []
        for row in rows:
            messages.append({
                "id": row[0],
                "order_id": row[1],
                "sender_id": row[2],
                "sender_type": row[3],
                "message": row[4],
                "timestamp": row[5].isoformat() if row[5] else None
            })
        
        await cursor.close()
        await conn.close()
        
        return {"messages": messages}
        
    except HTTPException:
        raise
    except Exception as e:
        print(f"Error fetching messages: {e}")
        raise HTTPException(status_code=500, detail=str(e))

# WebSocket connection manager
class ConnectionManager:
    def __init__(self):
        self.active_connections: Dict[int, List[WebSocket]] = {}
    
    async def connect(self, websocket: WebSocket, order_id: int):
        await websocket.accept()
        if order_id not in self.active_connections:
            self.active_connections[order_id] = []
        self.active_connections[order_id].append(websocket)
        print(f"WebSocket connected for order {order_id}. Total connections: {len(self.active_connections[order_id])}")
    
    def disconnect(self, websocket: WebSocket, order_id: int):
        if order_id in self.active_connections:
            self.active_connections[order_id].remove(websocket)
            if len(self.active_connections[order_id]) == 0:
                del self.active_connections[order_id]
            print(f"WebSocket disconnected for order {order_id}")
    
    async def broadcast(self, message: dict, order_id: int):
        if order_id in self.active_connections:
            disconnected = []
            for connection in self.active_connections[order_id]:
                try:
                    await connection.send_json(message)
                except Exception as e:
                    print(f"Error sending message: {e}")
                    disconnected.append(connection)
            
            # Clean up disconnected connections
            for connection in disconnected:
                try:
                    self.disconnect(connection, order_id)
                except:
                    pass

manager = ConnectionManager()

@router.websocket("/chat/ws/{order_id}")
async def websocket_endpoint(websocket: WebSocket, order_id: int):
    """WebSocket endpoint for real-time chat"""
    await manager.connect(websocket, order_id)
    
    try:
        while True:
            # Receive message from WebSocket
            data = await websocket.receive_json()
            print(f"Received WebSocket message: {data}")
            
            # Validate message data
            try:
                chat_message = ChatMessage(**data)
            except ValidationError as ve:
                await websocket.send_json({"error": "Invalid message format", "details": ve.errors()})
                continue
            
            # Verify the order exists and authorization
            conn = await get_db_connection()
            cursor = await conn.cursor()
            
            try:
                # Get order details
                await cursor.execute("""
                    SELECT o.OrderID, o.UserName, o.AssignedRiderID 
                    FROM Orders o 
                    WHERE o.OrderID = ?
                """, (order_id,))
                
                order = await cursor.fetchone()
                if not order:
                    await websocket.send_json({"error": "Order not found"})
                    continue
                
                _, customer_id, rider_id = order
                
                # Verify sender authorization
                if chat_message.sender_type == 'customer':
                    if str(customer_id) != str(chat_message.sender_id):
                        await websocket.send_json({"error": "Not authorized"})
                        continue
                elif chat_message.sender_type == 'rider':
                    if not rider_id or str(rider_id) != str(chat_message.sender_id):
                        await websocket.send_json({"error": "Not authorized"})
                        continue
                else:
                    await websocket.send_json({"error": "Invalid sender_type"})
                    continue
                
                # Create table if needed
                await cursor.execute("""
                    IF NOT EXISTS (SELECT * FROM sysobjects WHERE name='chat_messages' AND xtype='U')
                    CREATE TABLE chat_messages (
                        id INT IDENTITY(1,1) PRIMARY KEY,
                        order_id INT NOT NULL,
                        sender_id NVARCHAR(50) NOT NULL,
                        sender_type NVARCHAR(20) NOT NULL,
                        message NVARCHAR(MAX) NOT NULL,
                        timestamp DATETIME DEFAULT GETDATE(),
                        FOREIGN KEY (order_id) REFERENCES Orders(OrderID)
                    )
                """)
                await conn.commit()
                
                # Insert the message
                await cursor.execute("""
                    INSERT INTO chat_messages (order_id, sender_id, sender_type, message)
                    OUTPUT INSERTED.id, INSERTED.timestamp
                    VALUES (?, ?, ?, ?)
                """, (order_id, chat_message.sender_id, chat_message.sender_type, chat_message.message))
                
                result = await cursor.fetchone()
                message_id = result[0]
                timestamp = result[1].isoformat() if result[1] else datetime.now().isoformat()
                
                await conn.commit()
                
                # Prepare message to broadcast
                broadcast_message = {
                    "id": message_id,
                    "order_id": order_id,
                    "sender_id": chat_message.sender_id,
                    "sender_type": chat_message.sender_type,
                    "message": chat_message.message,
                    "timestamp": timestamp
                }
                
                # Broadcast to all connected clients for this order
                await manager.broadcast(broadcast_message, order_id)
                
            finally:
                await cursor.close()
                await conn.close()
                
    except WebSocketDisconnect:
        manager.disconnect(websocket, order_id)
        print(f"Client disconnected from order {order_id}")
    except Exception as e:
        print(f"WebSocket error: {e}")
        print(f"Traceback: {traceback.format_exc()}")
        manager.disconnect(websocket, order_id)
