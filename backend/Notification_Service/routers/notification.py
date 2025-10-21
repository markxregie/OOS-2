from fastapi import APIRouter, HTTPException, Query, Depends, status
from fastapi.security import OAuth2PasswordBearer
from pydantic import BaseModel
from database import get_db_connection
from routers.websocket import manager
import httpx
import logging
from typing import List

# 🔌 Import manager from websocket.py
from .websocket import manager

router = APIRouter()
logger = logging.getLogger(__name__)

oauth2_scheme = OAuth2PasswordBearer(tokenUrl="http://localhost:4000/auth/token")

# --- AUTH VALIDATOR ---
async def validate_token_and_roles(token: str, allowed_roles: List[str]):
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

# --- Pydantic Model ---
class NotificationCreate(BaseModel):
    username: str
    title: str
    message: str
    type: str
    order_id: int | None = None


# --- CREATE Notification ---
@router.post("/notifications/create")
async def create_or_update_notification(
    username: str = Query(...),
    title: str = Query(...),
    message: str = Query(...),
    type: str = Query(...),
    order_id: int | None = Query(None)
):
    conn = await get_db_connection()
    cursor = await conn.cursor()
    try:
        # 🔍 Check if there's already a notification for this user + order
        await cursor.execute("""
            SELECT TOP 1 NotificationID
            FROM Notifications
            WHERE UserName = ? AND OrderID = ?
        """, (username, order_id))
        existing = await cursor.fetchone()

        if existing:
            # 🔁 Update existing notification message
            await cursor.execute("""
                UPDATE Notifications
                SET Title = ?, Message = ?, Type = ?, IsRead = 0, CreatedAt = GETDATE()
                WHERE NotificationID = ?
            """, (title, message, type, existing[0]))
            action = "updated"
        else:
            # 🆕 Insert new notification if none exists
            await cursor.execute("""
                INSERT INTO Notifications (UserName, Title, Message, Type, OrderID, IsRead, CreatedAt)
                VALUES (?, ?, ?, ?, ?, 0, GETDATE())
            """, (username, title, message, type, order_id))
            action = "created"

        await conn.commit()

        # ✅ ALWAYS broadcast (for both create + update)
        await manager.send_personal_message({
            "username": username,
            "title": title,
            "message": message,
            "type": type,
            "order_id": order_id
        }, username)

        logger.info(f"🔔 Notification {action} for user={username}, order_id={order_id}")
        return {"status": "success", "action": action}

    except Exception as e:
        logger.error(f"Failed to create/update notification: {e}")
        raise HTTPException(status_code=500, detail=str(e))
    finally:
        await cursor.close()
        await conn.close()


# --- GET Notifications by Username ---
@router.get("/notifications/{username}")
async def get_notifications(username: str, token: str = Depends(oauth2_scheme)):
    await validate_token_and_roles(token, ["admin", "staff", "rider", "cashier", "user"])
    """
    Fetch all notifications for a specific user.
    """
    conn = await get_db_connection()
    cursor = await conn.cursor()
    try:
        await cursor.execute("""
            SELECT NotificationID, Title, Message, Type, IsRead, CreatedAt, OrderID
            FROM Notifications
            WHERE UserName = ?
            ORDER BY CreatedAt DESC
        """, (username,))
        rows = await cursor.fetchall()

        notifications = [
            {
                "id": row[0],
                "title": row[1],
                "message": row[2],
                "type": row[3],
                "isRead": row[4],
                "createdAt": row[5].strftime("%Y-%m-%d %H:%M:%S"),
                "orderId": row[6],
            }
            for row in rows
        ]
        return notifications

    except Exception as e:
        logger.error(f"❌ Failed to fetch notifications: {e}")
        raise HTTPException(status_code=500, detail="Failed to fetch notifications")

    finally:
        await cursor.close()
        await conn.close()


# --- MARK as Read ---
@router.put("/notifications/{notification_id}/read")
async def mark_notification_as_read(notification_id: int, token: str = Depends(oauth2_scheme)):
    await validate_token_and_roles(token, ["admin", "staff", "rider", "cashier", "user"])
    """
    Mark a notification as read (when user clicks it).
    """
    conn = await get_db_connection()
    cursor = await conn.cursor()
    try:
        await cursor.execute("""
            UPDATE Notifications
            SET IsRead = 1
            WHERE NotificationID = ?
        """, (notification_id,))
        await conn.commit()

        return {"message": "Notification marked as read"}

    except Exception as e:
        logger.error(f"❌ Failed to mark notification as read: {e}")
        raise HTTPException(status_code=500, detail="Failed to mark notification as read")

    finally:
        await cursor.close()
        await conn.close()
