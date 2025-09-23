from fastapi import APIRouter, Depends, HTTPException, status
from fastapi.security import OAuth2PasswordBearer
from pydantic import BaseModel
from typing import Optional
from database import get_db_connection
import httpx
import logging

logger = logging.getLogger(__name__)
router = APIRouter()

oauth2_scheme = OAuth2PasswordBearer(tokenUrl="http://localhost:4000/auth/token")

# --- AUTH VALIDATOR ---
async def validate_token_and_roles(token: str, allowed_roles: list[str]):
    USER_SERVICE_ME_URL = "http://localhost:4000/auth/users/me"
    async with httpx.AsyncClient() as client:
        try:
            response = await client.get(USER_SERVICE_ME_URL, headers={"Authorization": f"Bearer {token}"})
            response.raise_for_status()
        except httpx.HTTPStatusError as e:
            logger.error(f"Auth service error: {e.response.status_code} - {e.response.text}")
            raise HTTPException(status_code=e.response.status_code, detail="Authentication failed.")
        except httpx.RequestError as e:
            logger.error(f"Auth service unavailable: {e}")
            raise HTTPException(status_code=status.HTTP_503_SERVICE_UNAVAILABLE, detail="Auth service unavailable.")

    user_data = response.json()
    if user_data.get("userRole") not in allowed_roles:
        raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="Access denied.")

    return user_data.get("username")

# --- DELIVERY INFO MODEL ---
class DeliveryInfoRequest(BaseModel):
    FirstName: str
    MiddleName: Optional[str] = None
    LastName: str
    Address: str
    City: str
    Province: str
    Landmark: Optional[str] = None
    EmailAddress: Optional[str] = None
    PhoneNumber: str
    Notes: Optional[str] = None
# --- ROUTE: Get Delivery Info by OrderID ---
@router.get("/info/{order_id}")
async def get_delivery_info(order_id: int, token: str = Depends(oauth2_scheme)):
    await validate_token_and_roles(token, ["user", "admin", "staff"])

    conn = await get_db_connection()
    cursor = await conn.cursor()

    try:
        await cursor.execute("""
            SELECT FirstName, MiddleName, LastName, Address,
                   City, Province, Landmark, EmailAddress,
                   PhoneNumber, Notes
            FROM DeliveryInfo
            WHERE OrderID = ?
        """, (order_id,))
        row = await cursor.fetchone()

        if not row:
            raise HTTPException(status_code=404, detail="Delivery info not found for this OrderID")

        return {
            "FirstName": row[0],
            "MiddleName": row[1],
            "LastName": row[2],
            "Address": row[3],
            "City": row[4],
            "Province": row[5],
            "Landmark": row[6],
            "EmailAddress": row[7],
            "PhoneNumber": row[8],
            "Notes": row[9]
        }

    except Exception as e:
        logger.error(f"Error retrieving delivery info: {e}")
        raise HTTPException(status_code=500, detail="Failed to retrieve delivery info")

    finally:
        await cursor.close()
        await conn.close()

@router.post("/info", status_code=status.HTTP_201_CREATED)
async def add_delivery_info(delivery_info: DeliveryInfoRequest, token: str = Depends(oauth2_scheme)):
    username = await validate_token_and_roles(token, ["user", "admin", "staff"])

    conn = await get_db_connection()
    cursor = await conn.cursor()

    try:
        # Find latest order for this user
        await cursor.execute("""
            SELECT TOP 1 OrderID
            FROM Orders
            WHERE UserName = ? AND Status = 'Pending'
            ORDER BY OrderDate DESC
        """, (username,))
        order = await cursor.fetchone()

        if not order:
            raise HTTPException(status_code=404, detail="No active pending order found for user")

        order_id = order[0]

        # Now check payment
        await cursor.execute("SELECT PaymentStatus FROM Orders WHERE OrderID = ?", (order_id,))
        payment = await cursor.fetchone()
        if not payment or payment[0] != "Paid":
            raise HTTPException(status_code=400, detail="Order not paid yet")

        # Insert delivery info
        await cursor.execute("""
            INSERT INTO DeliveryInfo (
                FirstName, MiddleName, LastName, Address,
                City, Province, Landmark, EmailAddress,
                PhoneNumber, Notes, OrderID
            )
            VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
        """, (
            delivery_info.FirstName,
            delivery_info.MiddleName,
            delivery_info.LastName,
            delivery_info.Address,
            delivery_info.City,
            delivery_info.Province,
            delivery_info.Landmark,
            delivery_info.EmailAddress,
            delivery_info.PhoneNumber,
            delivery_info.Notes,
            order_id
        ))
        await conn.commit()

    except Exception as e:
        logger.error(f"Error adding delivery info: {e}")
        raise HTTPException(status_code=500, detail="Failed to add delivery info")
    finally:
        await cursor.close()
        await conn.close()

    return {"message": "Delivery info added successfully", "order_id": order_id}

# --- GET Delivery Orders with Items + Delivery Info ---
@router.get("/admin/delivery/orders")
async def get_delivery_orders(token: str = Depends(oauth2_scheme)):
    await validate_token_and_roles(token, ["admin", "staff"])

    conn = await get_db_connection()
    cursor = await conn.cursor()

    try:
        await cursor.execute("""
            SELECT 
                o.OrderID, o.UserName, o.OrderDate, o.Status, o.PaymentMethod, 
                o.TotalAmount, di.FirstName, di.MiddleName, di.LastName,
                di.PhoneNumber, di.Address, di.City, di.Province, di.Notes, di.Landmark
            FROM Orders o
            LEFT JOIN DeliveryInfo di ON o.OrderID = di.OrderID
            ORDER BY o.OrderDate DESC
        """)
        rows = await cursor.fetchall()

        orders = []
        for row in rows:
            order_id = row[0]

            # Fetch items
            await cursor.execute("""
                SELECT ProductName, Quantity, Price
                FROM OrderItems
                WHERE OrderID = ?
            """, (order_id,))
            items = await cursor.fetchall()

            item_list = [
                {"name": i[0], "quantity": i[1], "price": float(i[2])}
                for i in items
            ]

            orders.append({
                "id": order_id,
                "customerName": f"{row[6]} {row[7] or ''} {row[8]}".strip(),
                "phone": row[9],
                "address": ", ".join(filter(None, [row[10], row[11], row[12]])),
                "orderedAt": row[2].strftime("%Y-%m-%d %H:%M:%S"),
                "currentStatus": row[3].lower().replace(" ", ""),  # e.g. Pending -> pending
                "paymentMethod": row[4],
                "total": float(row[5]) if row[5] else 0,
                "notes": row[13],
                "items": item_list,
                "assignedRider": None  # later i-link sa RiderOrders
            })

        return orders

    except Exception as e:
        logger.error(f"Error fetching delivery orders: {e}", exc_info=True)
        raise HTTPException(status_code=500, detail="Failed to fetch delivery orders")

    finally:
        await cursor.close()
        await conn.close()