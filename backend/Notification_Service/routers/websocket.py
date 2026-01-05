from fastapi import APIRouter, WebSocket, WebSocketDisconnect, HTTPException, status, Query
from fastapi.security import OAuth2PasswordBearer
import httpx
import logging
import urllib.parse
from typing import List

router = APIRouter()
logger = logging.getLogger(__name__)

oauth2_scheme = OAuth2PasswordBearer(tokenUrl="http://localhost:4000/auth/token")

# --- AUTH VALIDATOR ---
async def validate_token_and_roles(token: str, allowed_roles: List[str]):
    USER_SERVICE_ME_URL = "http://localhost:4000/auth/users/me"
    logger.info(f"Validating token: {token[:50]}...")  # Log first 50 chars for debugging
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
    logger.info(f"User data received: {user_data}")
    if user_data.get("userRole") not in allowed_roles:
        logger.error(f"Role {user_data.get('userRole')} not in allowed roles: {allowed_roles}")
        raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="Access denied.")

    return user_data

# --- ACTIVE CONNECTIONS MANAGER ---
class ConnectionManager:
    def __init__(self):
        self.active_connections: dict[str, list[WebSocket]] = {}

    async def connect(self, websocket: WebSocket, username: str):
        await websocket.accept()
        if username not in self.active_connections:
            self.active_connections[username] = []
        self.active_connections[username].append(websocket)
        logger.info(f"✅ WebSocket connected for user: {username}")

    def disconnect(self, websocket: WebSocket, username: str):
        if username in self.active_connections:
            self.active_connections[username].remove(websocket)
            if not self.active_connections[username]:
                del self.active_connections[username]
        logger.info(f"❌ WebSocket disconnected for user: {username}")

    async def send_personal_message(self, message: dict, username: str):
        """
        Send message to a specific user's active WebSocket connections.
        """
        connections = self.active_connections.get(username, [])
        for conn in connections:
            try:
                await conn.send_json(message)
            except Exception as e:
                logger.warning(f"⚠️ Failed to send WebSocket message: {e}")

    async def broadcast(self, message: dict):
        """
        Broadcast message to all connected users.
        """
        for username, connections in self.active_connections.items():
            for conn in connections:
                try:
                    await conn.send_json(message)
                except Exception as e:
                    logger.warning(f"⚠️ Broadcast failed for {username}: {e}")

manager = ConnectionManager()


# --- WEBSOCKET ENDPOINT ---
@router.websocket("/ws/notifications/{username}")
async def websocket_endpoint(websocket: WebSocket, username: str, token: str = Query(None)):
    """
    WebSocket connection for real-time notifications per user.
    Example: ws://localhost:7002/ws/notifications/john_doe?token=...
    """
    # Extract token from query parameters
    if token is None:
        await websocket.close(code=1008, reason="Token required")
        return

    try:
        # Validate token and get user data
        user_data = await validate_token_and_roles(token, ["admin", "staff", "rider", "cashier", "user"])
        authenticated_username = user_data.get("username")
        user_role = user_data.get("userRole")
    except HTTPException as e:
        await websocket.close(code=1008, reason=e.detail)
        return

    # For riders, the username in URL is their ID, but token has actual username
    # Skip username match check for riders since their notifications use ID as username
    if user_role == "rider":
        # Allow connection for riders regardless of username mismatch
        pass
    elif authenticated_username != username:
        await websocket.close(code=1008, reason="Username mismatch")
        return

    # Proceed with connection if valid
    await manager.connect(websocket, username)
    try:
        while True:
            data = await websocket.receive_text()  # listen if needed
            logger.info(f"📩 Received message from {username}: {data}")
            # You can add command handling here later (e.g., mark as read)
    except WebSocketDisconnect:
        manager.disconnect(websocket, username)
    except Exception as e:
        logger.error(f"WebSocket error for {username}: {e}")
        manager.disconnect(websocket, username)
