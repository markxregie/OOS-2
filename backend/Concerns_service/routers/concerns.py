from fastapi import APIRouter, HTTPException, status
from pydantic import BaseModel
from database import get_db_connection
from typing import List
import logging

logger = logging.getLogger(__name__)

router = APIRouter()

class ConcernRequest(BaseModel):
    name: str
    email: str
    subject: str
    message: str

class ConcernResponse(BaseModel):
    id: int
    name: str
    email: str
    subject: str
    message: str
    status: str
    submitted_at: str

class StatusUpdate(BaseModel):
    status: str

@router.post("/concerns", status_code=status.HTTP_201_CREATED)
async def submit_concern(concern: ConcernRequest):
    conn = await get_db_connection()
    cursor = await conn.cursor()
    try:
        await cursor.execute("""
            INSERT INTO Concerns (name, email, subject, message)
            VALUES (?, ?, ?, ?)
        """, (
            concern.name,
            concern.email,
            concern.subject,
            concern.message
        ))
        await conn.commit()
        logger.info(f"Concern submitted: {concern.dict()}")
    except Exception as e:
        logger.error(f"Error submitting concern: {e}")
        raise HTTPException(status_code=500, detail="Failed to submit concern")
    finally:
        await cursor.close()
        await conn.close()
    return {"message": "Concern submitted successfully"}

@router.get("/concerns", response_model=List[ConcernResponse])
async def get_concerns():
    conn = await get_db_connection()
    cursor = await conn.cursor()
    try:
        await cursor.execute("""
            SELECT id, name, email, subject, message, status, submitted_at
            FROM Concerns
            ORDER BY submitted_at DESC
        """)
        rows = await cursor.fetchall()
        concerns = []
        for row in rows:
            concerns.append(ConcernResponse(
                id=row[0],
                name=row[1],
                email=row[2],
                subject=row[3],
                message=row[4],
                status=row[5] or 'Pending',
                submitted_at=row[6].strftime("%Y-%m-%d %H:%M:%S") if row[6] else None
            ))
    except Exception as e:
        logger.error(f"Error fetching concerns: {e}")
        raise HTTPException(status_code=500, detail="Failed to fetch concerns")
    finally:
        await cursor.close()
        await conn.close()
    return concerns

@router.patch("/concerns/{concern_id}/status", status_code=status.HTTP_200_OK)
async def update_concern_status(concern_id: int, status_update: StatusUpdate):
    status = status_update.status
    if status not in ["Pending", "In Progress", "Resolved"]:
        raise HTTPException(status_code=400, detail="Invalid status")
    conn = await get_db_connection()
    cursor = await conn.cursor()
    try:
        await cursor.execute("""
            UPDATE Concerns
            SET status = ?
            WHERE id = ?
        """, (status, concern_id))
        await conn.commit()
        if cursor.rowcount == 0:
            raise HTTPException(status_code=404, detail="Concern not found")
        logger.info(f"Concern {concern_id} status updated to {status}")
    except Exception as e:
        logger.error(f"Error updating concern status: {e}")
        raise HTTPException(status_code=500, detail="Failed to update concern status")
    finally:
        await cursor.close()
        await conn.close()
    return {"message": f"Concern status updated to {status}"}

@router.delete("/concerns/{concern_id}", status_code=status.HTTP_200_OK)
async def delete_concern(concern_id: int):
    conn = await get_db_connection()
    cursor = await conn.cursor()
    try:
        await cursor.execute("DELETE FROM Concerns WHERE id = ?", (concern_id,))
        await conn.commit()
        if cursor.rowcount == 0:
            raise HTTPException(status_code=404, detail="Concern not found")
        logger.info(f"Concern {concern_id} deleted")
    except Exception as e:
        logger.error(f"Error deleting concern: {e}")
        raise HTTPException(status_code=500, detail="Failed to delete concern")
    finally:
        await cursor.close()
        await conn.close()
    return {"message": "Concern deleted successfully"}
