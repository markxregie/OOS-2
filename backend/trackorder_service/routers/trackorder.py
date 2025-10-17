from fastapi import APIRouter, Depends, HTTPException
from database import get_db_connection
import aioodbc
import json

router = APIRouter(
    tags=["Track Order"]
)

@router.get("/{order_id}")
async def get_order_status(order_id: int, conn: aioodbc.Connection = Depends(get_db_connection)):
    try:
        cursor = await conn.cursor()

        # Fetch the main order details
        query = """
            SELECT o.OrderID as id, o.OrderType as orderType, o.Status as status, o.OrderDate as date,
            (
                SELECT oi.ProductName as name, oi.Price as price, oi.Quantity as quantity,
                (
                    SELECT oia.AddOnID as addon_id, oia.AddOnName as addon_name, oia.Price as price
                    FROM OrderItemAddOns oia
                    WHERE oia.OrderItemID = oi.OrderItemID
                    FOR JSON PATH
                ) as addons
                FROM OrderItems oi
                WHERE oi.OrderID = o.OrderID
                FOR JSON PATH
            ) as products
            FROM Orders o
            WHERE o.OrderID = ?
        """
        await cursor.execute(query, (order_id,))
        row = await cursor.fetchone()

        if not row:
            raise HTTPException(status_code=404, detail="Order not found")

        order_details = {
            "id": row.id,
            "orderType": row.orderType,
            "status": row.status,
            "date": row.date.isoformat(),
            "products": json.loads(row.products) if row.products else []
        }

        return order_details
    except Exception as e:
        print(f"Database error: {e}")
        raise HTTPException(status_code=500, detail="Internal server error while fetching order details.")
    finally:
        if 'cursor' in locals() and cursor:
            await cursor.close()
        if 'conn' in locals() and conn:
            await conn.close()