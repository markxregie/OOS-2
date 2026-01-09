from fastapi import APIRouter, HTTPException, status, UploadFile, File, Form
from pydantic import BaseModel
from database import get_db_connection
from typing import List, Optional
import logging
import os
import shutil
from datetime import datetime

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
    file_path: Optional[str] = None
    status: str
    submitted_at: str
    resolution_summary: Optional[str] = None

class StatusUpdate(BaseModel):
    status: str
    resolution_summary: Optional[str] = None

@router.post("/concerns", status_code=status.HTTP_201_CREATED)
async def submit_concern(
    name: str = Form(...),
    email: str = Form(...),
    subject: str = Form(...),
    message: str = Form(...),
    file: UploadFile = File(None)
):
    file_path = None
    if file:
        # Create uploads directory if it doesn't exist
        upload_dir = "uploads"
        os.makedirs(upload_dir, exist_ok=True)

        # Generate unique filename with timestamp
        timestamp = datetime.now().strftime("%Y%m%d_%H%M%S")
        file_extension = os.path.splitext(file.filename)[1]
        unique_filename = f"{timestamp}_{file.filename}"
        file_path = os.path.join(upload_dir, unique_filename)

        # Save the file
        with open(file_path, "wb") as buffer:
            shutil.copyfileobj(file.file, buffer)

    conn = await get_db_connection()
    cursor = await conn.cursor()
    try:
        await cursor.execute("""
            INSERT INTO Concerns (name, email, subject, message, file_path)
            VALUES (?, ?, ?, ?, ?)
        """, (
            name,
            email,
            subject,
            message,
            file_path
        ))
        await conn.commit()
        logger.info(f"Concern submitted: name={name}, email={email}, subject={subject}, file={file_path}")
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
            SELECT id, name, email, subject, message, file_path, status, submitted_at, resolution_summary
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
                file_path=row[5],
                status=row[6] or 'Pending',
                submitted_at=row[7].strftime("%Y-%m-%d %H:%M:%S") if row[7] else None,
                resolution_summary=row[8]
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
    resolution_summary = status_update.resolution_summary
    if status not in ["Pending", "In Progress", "Resolved"]:
        raise HTTPException(status_code=400, detail="Invalid status")
    conn = await get_db_connection()
    cursor = await conn.cursor()
    try:
        if resolution_summary is not None:
            await cursor.execute("""
                UPDATE Concerns
                SET status = ?, resolution_summary = ?
                WHERE id = ?
            """, (status, resolution_summary, concern_id))
        else:
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
