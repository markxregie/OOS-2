from fastapi import APIRouter, UploadFile, File, Form, HTTPException
from fastapi.responses import JSONResponse
from database import get_db_connection
import os
from datetime import datetime
from typing import Optional

router = APIRouter()

# Create uploads directory if it doesn't exist
UPLOAD_DIR = "uploads"
if not os.path.exists(UPLOAD_DIR):
    os.makedirs(UPLOAD_DIR)

@router.post("/upload-promotion")
async def upload_promotion(
    title: str = Form(...),
    start_date: str = Form(...),
    end_date: str = Form(...),
    file: UploadFile = File(...)
):
    """
    Upload a promotion banner with title, dates, and image
    """
    try:
        # Validate file type
        if not file.content_type.startswith("image/"):
            raise HTTPException(status_code=400, detail="File must be an image")

        # Generate unique filename with timestamp
        timestamp = datetime.now().strftime("%Y%m%d_%H%M%S")
        file_extension = os.path.splitext(file.filename)[1]
        unique_filename = f"{timestamp}_{title.replace(' ', '_')}{file_extension}"
        file_path = os.path.join(UPLOAD_DIR, unique_filename)

        # Save file
        with open(file_path, "wb") as buffer:
            content = await file.read()
            buffer.write(content)

        # Validate and parse dates
        try:
            start = datetime.strptime(start_date, "%Y-%m-%d").date()
        except ValueError:
            raise HTTPException(status_code=400, detail="Invalid start_date format. Expected YYYY-MM-DD")

        try:
            end = datetime.strptime(end_date, "%Y-%m-%d").date()
        except ValueError:
            raise HTTPException(status_code=400, detail="Invalid end_date format. Expected YYYY-MM-DD")

        if start >= end:
            raise HTTPException(status_code=400, detail="Start date must be before end date")

        # Determine status based on dates
        current_date = datetime.now().date()
        status = "Active" if start <= current_date <= end else "Inactive"

        # Insert into database
        conn = await get_db_connection()
        cursor = await conn.cursor()

        query = """
        INSERT INTO promotions (title, start_date, end_date, image_path, status, created_at)
        VALUES (?, ?, ?, ?, ?, GETDATE())
        """

        await cursor.execute(query, (title, start_date, end_date, unique_filename, status))
        await conn.commit()
        await cursor.close()
        await conn.close()

        return JSONResponse(
            content={
                "message": "Promotion uploaded successfully",
                "promotion": {
                    "title": title,
                    "start_date": start_date,
                    "end_date": end_date,
                    "image_path": f"/uploads/{unique_filename}",
                    "status": status
                }
            },
            status_code=201
        )

    except Exception as e:
        print(f"Upload error: {str(e)}")
        print(f"Error type: {type(e)}")
        import traceback
        traceback.print_exc()
        raise HTTPException(status_code=500, detail=f"Upload failed: {str(e)}")

@router.get("/promotions")
async def get_promotions():
    """
    Get all active promotions
    """
    try:
        conn = await get_db_connection()
        cursor = await conn.cursor()

        query = """
        SELECT id, title, start_date, end_date, image_path, created_at
        FROM promotions
        WHERE is_deleted = 0 AND start_date <= GETDATE() AND end_date >= GETDATE()
        ORDER BY created_at DESC
        """

        await cursor.execute(query)
        rows = await cursor.fetchall()

        promotions = []
        for row in rows:
            promotions.append({
                "id": row[0],
                "title": row[1],
                "startDate": str(row[2]),
                "endDate": str(row[3]),
                "image": f"http://localhost:7010/uploads/{row[4]}" if row[4] else None,
                "status": "Active",
                "created_at": str(row[5])
            })

        await cursor.close()
        await conn.close()

        return {"promotions": promotions}

    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Failed to fetch promotions: {str(e)}")

@router.get("/promotions/inactive")
async def get_inactive_promotions():
    """
    Get all inactive promotions
    """
    try:
        conn = await get_db_connection()
        cursor = await conn.cursor()

        query = """
        SELECT id, title, start_date, end_date, image_path, created_at
        FROM promotions
        WHERE is_deleted = 1 OR (start_date > GETDATE() OR end_date < GETDATE())
        ORDER BY created_at DESC
        """

        await cursor.execute(query)
        rows = await cursor.fetchall()

        promotions = []
        for row in rows:
            promotions.append({
                "id": row[0],
                "title": row[1],
                "startDate": str(row[2]),
                "endDate": str(row[3]),
                "image": f"http://localhost:7010/uploads/{row[4]}" if row[4] else None,
                "status": "Inactive",
                "created_at": str(row[5])
            })

        await cursor.close()
        await conn.close()

        return {"promotions": promotions}

    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Failed to fetch inactive promotions: {str(e)}")

@router.put("/promotion/{promotion_id}")
async def update_promotion(
    promotion_id: int,
    title: Optional[str] = Form(None),
    start_date: Optional[str] = Form(None),
    end_date: Optional[str] = Form(None),
    file: Optional[UploadFile] = File(None)
):
    """
    Update a promotion (title, dates, and/or image)
    """
    try:
        conn = await get_db_connection()
        cursor = await conn.cursor()

        # Get current promotion data
        await cursor.execute("SELECT title, start_date, end_date, image_path FROM promotions WHERE id = ?", (promotion_id,))
        current = await cursor.fetchone()

        if not current:
            raise HTTPException(status_code=404, detail="Promotion not found")

        # Update values
        new_title = title if title is not None else current[0]
        new_start_date = start_date if start_date is not None else str(current[1])
        new_end_date = end_date if end_date is not None else str(current[2])
        new_image_path = current[3]

        # Handle file upload if provided
        if file:
            if not file.content_type.startswith("image/"):
                raise HTTPException(status_code=400, detail="File must be an image")

            # Delete old file if exists
            if current[3] and os.path.exists(os.path.join(UPLOAD_DIR, current[3])):
                os.remove(os.path.join(UPLOAD_DIR, current[3]))

            # Generate new filename
            timestamp = datetime.now().strftime("%Y%m%d_%H%M%S")
            file_extension = os.path.splitext(file.filename)[1]
            unique_filename = f"{timestamp}_{new_title.replace(' ', '_')}{file_extension}"
            file_path = os.path.join(UPLOAD_DIR, unique_filename)

            # Save new file
            with open(file_path, "wb") as buffer:
                content = await file.read()
                buffer.write(content)

            new_image_path = unique_filename

        # Validate and parse dates
        try:
            start = datetime.strptime(new_start_date, "%Y-%m-%d").date()
        except ValueError:
            raise HTTPException(status_code=400, detail="Invalid start_date format. Expected YYYY-MM-DD")

        try:
            end = datetime.strptime(new_end_date, "%Y-%m-%d").date()
        except ValueError:
            raise HTTPException(status_code=400, detail="Invalid end_date format. Expected YYYY-MM-DD")

        if start >= end:
            raise HTTPException(status_code=400, detail="Start date must be before end date")

        # Determine status based on dates
        current_date = datetime.now().date()
        status = "Active" if start <= current_date <= end else "Inactive"

        # Update database
        query = """
        UPDATE promotions
        SET title = ?, start_date = ?, end_date = ?, image_path = ?
        WHERE id = ?
        """

        await cursor.execute(query, (new_title, new_start_date, new_end_date, new_image_path, promotion_id))
        await conn.commit()
        await cursor.close()
        await conn.close()

        return JSONResponse(
            content={
                "message": "Promotion updated successfully",
                "promotion": {
                    "id": promotion_id,
                    "title": new_title,
                    "start_date": new_start_date,
                    "end_date": new_end_date,
                    "image_path": f"/uploads/{new_image_path}" if new_image_path else None,
                    "status": status
                }
            }
        )

    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Update failed: {str(e)}")

@router.delete("/promotion/{promotion_id}")
async def delete_promotion(promotion_id: int):
    """
    Soft delete a promotion (mark as deleted and set status to inactive)
    """
    try:
        conn = await get_db_connection()
        cursor = await conn.cursor()

        # Soft delete - mark as deleted
        await cursor.execute("UPDATE promotions SET is_deleted = 1 WHERE id = ?", (promotion_id,))
        await conn.commit()
        await cursor.close()
        await conn.close()

        return {"message": "Promotion deleted successfully"}

    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Delete failed: {str(e)}")
