from fastapi import APIRouter, Depends, HTTPException
from database import get_db_connection
import aioodbc
import httpx
import json

router = APIRouter(tags=["Track Order"])

@router.get("/{order_id}")
async def get_order_status(order_id: int, conn: aioodbc.Connection = Depends(get_db_connection)):
    try:
        cursor = await conn.cursor()

        # Fetch the main order details (with AssignedRiderID)
        query = """
            SELECT 
                o.OrderID AS id,
                o.OrderType AS orderType,
                o.Status AS status,
                o.OrderDate AS date,
                o.ReferenceNumber AS ref_no,
                o.AssignedRiderID AS rider_id,
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
            "status": row.status,
            "date": row.date.isoformat(),
            "rider_id": row.rider_id,
            "products": json.loads(row.products) if row.products else []
        }

        # 🔹 If rider assigned → fetch details from Auth service
        if row.rider_id:
            try:
                async with httpx.AsyncClient() as client:
                    r = await client.get(f"http://localhost:4000/users/riders/{row.rider_id}")
                    if r.status_code == 200:
                        rider_info = r.json()
                        order_details.update({
                            "rider_name": rider_info.get("FullName"),
                            "rider_phone": rider_info.get("Phone"),
                            "rider_plate": rider_info.get("PlateNumber"),
                        })
            except Exception as e:
                print(f"⚠️ Failed to fetch rider info: {e}")

        return order_details

    except Exception as e:
        print(f"Database error: {e}")
        raise HTTPException(status_code=500, detail="Internal server error while fetching order details.")
    finally:
        if 'cursor' in locals() and cursor:
            await cursor.close()
        if 'conn' in locals() and conn:
            await conn.close()
