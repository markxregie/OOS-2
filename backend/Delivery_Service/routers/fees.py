from fastapi import APIRouter, HTTPException
from database import get_db_connection
from pydantic import BaseModel
from typing import Optional

router = APIRouter()

class DeliverySettings(BaseModel):
    BaseFee: float
    BaseDistanceKm: float
    ExtraFeePerKm: float
    MaxRadiusKm: float
    IsSurgePricingActive: bool
    SurgeFlatFee: Optional[float] = 20.00

@router.get("/settings", response_model=DeliverySettings)
async def get_delivery_settings():
    """
    Fetch the current delivery settings from the database.
    """
    conn = await get_db_connection()
    try:
        async with conn.cursor() as cursor:
            await cursor.execute("SELECT TOP 1 BaseFee, BaseDistanceKm, ExtraFeePerKm, MaxRadiusKm, IsSurgePricingActive, SurgeFlatFee FROM DeliverySettings ORDER BY SettingID DESC")
            row = await cursor.fetchone()
            if not row:
                raise HTTPException(status_code=404, detail="Delivery settings not found")
            settings = DeliverySettings(
                BaseFee=float(row[0]),
                BaseDistanceKm=float(row[1]),
                ExtraFeePerKm=float(row[2]),
                MaxRadiusKm=float(row[3]),
                IsSurgePricingActive=bool(row[4]),
                SurgeFlatFee=float(row[5]) if row[5] else 20.00
            )
            return settings
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Database error: {str(e)}")
    finally:
        await conn.close()

@router.put("/settings")
async def update_delivery_settings(settings: DeliverySettings):
    """
    Update the delivery settings in the database.
    """
    conn = await get_db_connection()
    try:
        async with conn.cursor() as cursor:
            await cursor.execute("""
                UPDATE DeliverySettings
                SET BaseFee = ?, BaseDistanceKm = ?, ExtraFeePerKm = ?, MaxRadiusKm = ?, IsSurgePricingActive = ?, SurgeFlatFee = ?, UpdatedAt = GETDATE()
                WHERE SettingID = (SELECT TOP 1 SettingID FROM DeliverySettings ORDER BY SettingID DESC)
            """, (
                settings.BaseFee,
                settings.BaseDistanceKm,
                settings.ExtraFeePerKm,
                settings.MaxRadiusKm,
                1 if settings.IsSurgePricingActive else 0,
                settings.SurgeFlatFee or 20.00
            ))
            if cursor.rowcount == 0:
                raise HTTPException(status_code=404, detail="No settings found to update")
            return {"message": "Delivery settings updated successfully"}
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Database error: {str(e)}")
    finally:
        await conn.close()

def calculate_delivery_fee(distance_km: float, settings: DeliverySettings) -> float:
    """
    Calculate the delivery fee based on distance and settings.
    """
    if distance_km > settings.MaxRadiusKm:
        raise ValueError(f"Distance {distance_km} km exceeds maximum radius of {settings.MaxRadiusKm} km")
    
    total = settings.BaseFee
    extra_distance = max(0, distance_km - settings.BaseDistanceKm)
    total += extra_distance * settings.ExtraFeePerKm
    if settings.IsSurgePricingActive:
        total += settings.SurgeFlatFee or 20.00
    return round(total, 2)
