from fastapi import APIRouter, HTTPException
from database import get_db_connection, update_product_prep_time, get_product_prep_time, get_all_product_prep_times
from pydantic import BaseModel
from typing import List

router = APIRouter()

class PrepTimeEntry(BaseModel):
    productId: int
    productName: str
    prepTimeMinutes: int

class PrepTimesRequest(BaseModel):
    prepTimes: List[PrepTimeEntry]

class PrepTimeResponse(BaseModel):
    productId: int
    prepTimeMinutes: int


@router.get("/prep-times", response_model=dict)
async def get_all_prep_times():
    """
    Get all product preparation times.
    """
    try:
        prep_times = await get_all_product_prep_times()
        return prep_times
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Error retrieving preparation times: {str(e)}")


@router.post("/prep-times", response_model=dict)
async def save_preparation_times(request: PrepTimesRequest):
    """
    Save preparation times for multiple products.
    
    Expected request body:
    {
        "prepTimes": [
            {"productId": 1, "prepTimeMinutes": 15},
            {"productId": 2, "prepTimeMinutes": 10}
        ]
    }
    """
    if not request.prepTimes:
        raise HTTPException(status_code=400, detail="No preparation times provided")
    
    try:
        success_count = 0
        failed_items = []
        
        for item in request.prepTimes:
            # Validate prep time
            if item.prepTimeMinutes < 0:
                failed_items.append({
                    "productId": item.productId,
                    "reason": "Prep time cannot be negative"
                })
                continue
            
            # Update in database
            result = await update_product_prep_time(item.productId, item.prepTimeMinutes, item.productName)
            if result:
                success_count += 1
            else:
                failed_items.append({
                    "productId": item.productId,
                    "reason": "Database update failed"
                })
        
        return {
            "message": f"Successfully saved {success_count} preparation times",
            "success_count": success_count,
            "failed_count": len(failed_items),
            "failed_items": failed_items if failed_items else None
        }
    
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Error saving preparation times: {str(e)}")



    finally:
        await conn.close()


@router.get("/prep-times/{product_id}", response_model=dict)
async def get_preparation_time(product_id: int):
    """
    Get the preparation time for a specific product.
    """
    try:
        prep_time = await get_product_prep_time(product_id)
        return {
            "productId": product_id,
            "prepTimeMinutes": prep_time
        }
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Error retrieving preparation time: {str(e)}")