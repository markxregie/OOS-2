from fastapi import APIRouter, HTTPException
from database import get_db_connection, get_product_prep_time, get_product_prep_time_by_name
from pydantic import BaseModel
from typing import Optional
import httpx
import os
from dotenv import load_dotenv

# Load environment variables from .env file
load_dotenv()

router = APIRouter()

# Google Maps API Key from environment variable
GOOGLE_MAPS_API_KEY = os.getenv("REACT_APP_GOOGLE_MAPS_API_KEY", "")

class DeliveryTimeRequest(BaseModel):
    order_id: int
    customer_lat: Optional[float] = None
    customer_lng: Optional[float] = None

class DeliveryTimeResponse(BaseModel):
    total_estimated_minutes: int
    prep_time_minutes: int
    drive_time_minutes: int
    breakdown: dict

async def get_order_products(order_id: int):
    """
    Fetch products and quantities for a given order from the OrderItems table.
    Returns list of (ProductName, Quantity) tuples.
    """
    conn = await get_db_connection()
    try:
        async with conn.cursor() as cursor:
            # Query the OrderItems table to get products by name and quantity
            query = """
            SELECT ProductName, Quantity FROM OrderItems 
            WHERE OrderID = ?
            """
            await cursor.execute(query, (order_id,))
            rows = await cursor.fetchall()
            
            if rows:
                result = [(row[0], row[1]) for row in rows]
                print(f"DEBUG: Found {len(result)} products for order {order_id}: {result}")
                return result
            else:
                print(f"DEBUG: No products found for order {order_id}")
                return []
            
    except Exception as e:
        print(f"DEBUG: Database Error - Failed to fetch order products for order {order_id}: {e}")
        return []
    finally:
        await conn.close()

async def calculate_prep_time(order_id: int) -> tuple:
    """
    Calculate total preparation time based on product prep times and quantities.
    Formula: sum(prep_time * quantity) for all items in order
    
    Returns: (total_prep_time_minutes, breakdown_dict)
    """
    products = await get_order_products(order_id)
    
    if not products:
        return 0, {"error": "No products found for order"}
    
    total_prep_time = 0
    breakdown = {}
    
    for product_name, quantity in products:
        # Lookup prep time by product name
        prep_time = await get_product_prep_time_by_name(product_name)
        item_total_time = prep_time * quantity
        total_prep_time += item_total_time
        
        print(f"DEBUG: Product '{product_name}' - Prep Time: {prep_time} mins, Quantity: {quantity}, Total: {item_total_time} mins")
        
        breakdown[product_name] = {
            "quantity": quantity,
            "prep_time_per_unit": prep_time,
            "total_time": item_total_time
        }
    
    print(f"DEBUG: Total prep time for order {order_id}: {total_prep_time} mins")
    return total_prep_time, breakdown

async def get_drive_time_from_store(customer_lat: float, customer_lng: float) -> Optional[int]:
    """
    Use Google Maps Distance Matrix API to get drive time from store to customer.
    Store location is hardcoded (or can be made configurable).
    
    Returns: drive time in minutes (or None if API call fails)
    """
    # Default store location (configure as needed)
    store_lat = 14.5547
    store_lng = 121.0244
    
    if not GOOGLE_MAPS_API_KEY or GOOGLE_MAPS_API_KEY == "YOUR_GOOGLE_MAPS_API_KEY_HERE":
        # Fallback: estimate drive time using Haversine formula (25 km/h average)
        return estimate_drive_time(store_lat, store_lng, customer_lat, customer_lng)
    
    try:
        url = "https://maps.googleapis.com/maps/api/distancematrix/json"
        params = {
            "origins": f"{store_lat},{store_lng}",
            "destinations": f"{customer_lat},{customer_lng}",
            "key": GOOGLE_MAPS_API_KEY,
            "mode": "driving"
        }
        
        async with httpx.AsyncClient(timeout=10) as client:
            response = await client.get(url, params=params)
            data = response.json()
            
            if data.get("status") == "OK" and data.get("rows"):
                elements = data["rows"][0].get("elements", [])
                if elements and elements[0].get("status") == "OK":
                    duration_seconds = elements[0]["duration"]["value"]
                    drive_mins = duration_seconds // 60  # Convert to minutes
                    print(f"DEBUG: Google Maps API - Drive time: {drive_mins} mins from Google API")
                    return drive_mins
        
        # Fallback if API doesn't return valid data
        print(f"DEBUG: Google Maps API returned status: {data.get('status')}, falling back to Haversine")
        return estimate_drive_time(store_lat, store_lng, customer_lat, customer_lng)
    
    except Exception as e:
        print(f"Error calling Google Maps API: {e}")
        # Fallback to Haversine estimation
        return estimate_drive_time(store_lat, store_lng, customer_lat, customer_lng)

def estimate_drive_time(lat1: float, lng1: float, lat2: float, lng2: float, avg_speed_kmh: float = 25) -> int:
    """
    Estimate drive time using Haversine formula with average speed of 25 km/h.
    Returns: estimated drive time in minutes
    """
    import math
    
    R = 6371  # Earth's radius in km
    
    lat1_rad = math.radians(lat1)
    lat2_rad = math.radians(lat2)
    delta_lat = math.radians(lat2 - lat1)
    delta_lng = math.radians(lng2 - lng1)
    
    a = math.sin(delta_lat / 2) ** 2 + math.cos(lat1_rad) * math.cos(lat2_rad) * math.sin(delta_lng / 2) ** 2
    c = 2 * math.asin(math.sqrt(a))
    
    distance_km = R * c
    minutes = (distance_km / avg_speed_kmh) * 60
    
    # Enforce a minimum of 5 minutes
    result = max(5, int(round(minutes)))
    print(f"DEBUG: Haversine fallback - Distance: {distance_km:.2f} km, Drive time: {result} mins")
    return result

@router.post("/estimate-delivery-time")
async def estimate_delivery_time(request: DeliveryTimeRequest):
    """
    Estimate total delivery time for an order.
    
    Formula: Total Estimated Time = Prep Time + Drive Time
    
    Where:
    - Prep Time = sum(product_prep_time * product_quantity) for all items
    - Drive Time = Google Maps estimated drive time from store to customer
    
    Request body:
    {
        "order_id": 123,
        "customer_lat": 14.5555,
        "customer_lng": 121.0300
    }
    """
    if not request.customer_lat or not request.customer_lng:
        raise HTTPException(status_code=400, detail="Customer location (lat, lng) is required")
    
    try:
        # Calculate preparation time
        prep_time_minutes, prep_breakdown = await calculate_prep_time(request.order_id)
        
        # Get drive time from store to customer
        drive_time_minutes = await get_drive_time_from_store(request.customer_lat, request.customer_lng)
        
        if drive_time_minutes is None:
            raise HTTPException(status_code=500, detail="Failed to calculate drive time")
        
        # Total delivery time
        total_estimated_minutes = prep_time_minutes + drive_time_minutes
        
        print(f"DEBUG: FINAL RESULT for Order {request.order_id}: {prep_time_minutes} (prep) + {drive_time_minutes} (drive) = {total_estimated_minutes} min")
        
        return DeliveryTimeResponse(
            total_estimated_minutes=total_estimated_minutes,
            prep_time_minutes=prep_time_minutes,
            drive_time_minutes=drive_time_minutes,
            breakdown={
                "prep_breakdown": prep_breakdown,
                "formula": "Total = Prep Time + Drive Time",
                "formula_explanation": f"{prep_time_minutes} min (prep) + {drive_time_minutes} min (drive) = {total_estimated_minutes} min"
            }
        )
    
    except Exception as e:
        print(f"DEBUG: ERROR in estimate_delivery_time: {str(e)}")
        raise HTTPException(status_code=500, detail=f"Error calculating delivery time: {str(e)}")


@router.get("/estimate-delivery-time/{order_id}")
async def estimate_delivery_time_simple(order_id: int, customer_lat: float, customer_lng: float):
    """
    Simplified endpoint: GET /delivery/estimate-delivery-time/{order_id}?customer_lat=14.5555&customer_lng=121.0300
    """
    return await estimate_delivery_time(DeliveryTimeRequest(
        order_id=order_id,
        customer_lat=customer_lat,
        customer_lng=customer_lng
    ))
