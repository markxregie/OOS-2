from fastapi import APIRouter, Depends, HTTPException
from database import get_db_connection
import aioodbc
import httpx
import json

router = APIRouter(tags=["Track Order"])

@router.get("/{order_id}")
async def get_order_status(order_id: int, conn: aioodbc.Connection = Depends(get_db_connection)):
    cursor = None
    try:
        cursor = await conn.cursor()

        # Fetch the main order details
        # Added TRIM to Status to prevent stepper issues
        query = """
            SELECT 
                o.OrderID AS id,
                o.OrderType AS orderType,
                o.Status AS status,
                o.OrderDate AS date,
                o.ReferenceNumber AS ref_no,
                o.AssignedRiderID AS rider_id,
                o.TotalAmount AS total,
                (
                    SELECT 
                        oi.ProductName AS name,
                        oi.Price AS price,
                        oi.Quantity AS quantity,
                        (
                            SELECT 
                                oia.AddOnID AS addon_id,
                                oia.AddOnName AS addon_name,
                                oia.Price AS price
                            FROM OrderItemAddOns oia
                            WHERE oia.OrderItemID = oi.OrderItemID
                            FOR JSON PATH
                        ) AS addons
                    FROM OrderItems oi
                    WHERE oi.OrderID = o.OrderID
                    FOR JSON PATH
                ) AS products
            FROM Orders o
            WHERE o.OrderID = ?
        """
        await cursor.execute(query, (order_id,))
        row = await cursor.fetchone()

        if not row:
            raise HTTPException(status_code=404, detail="Order not found")

        # Parse order info
        order_details = {
            "id": row.id,
            "ref_no": row.ref_no,
            "orderType": row.orderType,
            # .strip() removes whitespace that might break the Frontend Stepper logic
            "status": row.status.strip() if row.status else "pending", 
            "date": row.date.isoformat() if row.date else None,
            "rider_id": row.rider_id,
            "total": float(row.total) if row.total else 0.00,
            "products": json.loads(row.products) if row.products else []
        }

        # 🔹 If rider assigned → fetch details from Auth service (localhost:4000)
        if row.rider_id:
            try:
                async with httpx.AsyncClient() as client:
                    # First try the delivery service (likely has the live location updates)
                    try:
                        r = await client.get(f"http://localhost:7004/delivery/rider/{row.rider_id}/location", timeout=2.0)
                        if r.status_code == 200:
                            loc = r.json()
                            lat = loc.get("lat") or loc.get("latitude") or loc.get("Lat")
                            lng = loc.get("lng") or loc.get("longitude") or loc.get("Lng")
                            if lat and lng:
                                order_details.update({
                                    "rider_lat": lat,
                                    "rider_lng": lng
                                })
                    except Exception:
                        # ignore delivery-service lookup failure and fallback to auth service below
                        pass

                    # Adjust timeout to prevent hanging if auth service is slow; used for rider metadata
                    try:
                        r = await client.get(f"http://localhost:4000/users/riders/{row.rider_id}", timeout=5.0)
                        if r.status_code == 200:
                            rider_info = r.json()

                            # Map rider info AND Location if available (but don't overwrite live location)
                            order_details.update({
                                "rider_name": rider_info.get("FullName"),
                                "rider_phone": rider_info.get("Phone"),
                                "rider_plate": rider_info.get("PlateNumber"),
                                # Try multiple casing variations for location keys but only set if not already present
                                **({} if (order_details.get("rider_lat") and order_details.get("rider_lng")) else {
                                    "rider_lat": rider_info.get("Lat") or rider_info.get("lat") or rider_info.get("CurrentLat"),
                                    "rider_lng": rider_info.get("Lng") or rider_info.get("lng") or rider_info.get("CurrentLng")
                                })
                            })
                    except Exception:
                        # ignore auth service lookup failure
                        pass
            except Exception as e:
                print(f"⚠️ Failed to fetch rider info: {e}")
                # We do NOT raise an error here; we return the order details without rider info
                # so the user can still see the order status.

        return order_details

    except Exception as e:
        print(f"Database error in trackorder: {e}")
        raise HTTPException(status_code=500, detail=f"Internal server error: {str(e)}")
    finally:
        # Robust cleanup
        if cursor:
            await cursor.close()
        if conn:
            await conn.close()