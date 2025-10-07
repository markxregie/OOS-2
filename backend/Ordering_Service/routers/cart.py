from fastapi import APIRouter, Depends, HTTPException, status
from fastapi.security import OAuth2PasswordBearer
from pydantic import BaseModel
from typing import List, Optional
from datetime import datetime, date
from database import get_db_connection
import httpx
import logging

logger = logging.getLogger(__name__)

router = APIRouter()

oauth2_scheme = OAuth2PasswordBearer(tokenUrl="http://localhost:4000/auth/token")


async def validate_token_and_roles(token: str, allowed_roles: List[str]):
    USER_SERVICE_ME_URL = "http://localhost:4000/auth/users/me"
    async with httpx.AsyncClient() as client:
        try:
            response = await client.get(USER_SERVICE_ME_URL, headers={"Authorization": f"Bearer {token}"})
            response.raise_for_status()
        except httpx.HTTPStatusError as e:
            error_detail = f"Auth service error: {e.response.status_code} - {e.response.text}"
            logger.error(error_detail)
            raise HTTPException(status_code=e.response.status_code, detail=error_detail)
        except httpx.RequestError as e:
            logger.error(f"Auth service unavailable: {e}")
            raise HTTPException(status_code=status.HTTP_503_SERVICE_UNAVAILABLE, detail=f"Auth service unavailable: {e}")

    user_data = response.json()
    if user_data.get("userRole") not in allowed_roles:
        raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="Access denied.")

    return user_data

@router.get("/admin/orders/total")
async def get_total_orders(token: str = Depends(oauth2_scheme)):
    await validate_token_and_roles(token, ["admin", "staff"])
    conn = await get_db_connection()
    cursor = await conn.cursor()
    try:
        await cursor.execute("SELECT COUNT(*) FROM Orders")
        result = await cursor.fetchone()
        total_orders = result[0] if result else 0
    finally:
        await cursor.close()
        await conn.close()
    return {"total_orders": total_orders}



class CartItem(BaseModel):
    username: str
    product_id: int
    product_name: str
    quantity: int
    price: float
    product_type: Optional[str] = None
    product_category: Optional[str] = None
    order_type: str
    notes: Optional[str] = None


class CartResponse(BaseModel):
    order_item_id: int
    product_id: Optional[int]
    product_name: str
    quantity: int
    price: float
    product_type: Optional[str]
    product_category: Optional[str]
    order_type: str
    status: str
    created_at: str
    notes: Optional[str] = None


class DeliveryInfoRequest(BaseModel):
    FirstName: str
    MiddleName: Optional[str] = None
    LastName: str
    Address: str
    City: str
    Province: str
    Landmark: Optional[str] = None
    EmailAddress: Optional[str] = None
    PhoneNumber: str
    Notes: Optional[str] = None

class FinalizeOrderRequest(BaseModel):
    username: str
    notes: Optional[str] = None

class UpdatePaymentDetails(BaseModel):
    username: str
    payment_method: str
    subtotal: float
    delivery_fee: float
    total_amount: float
    delivery_notes: Optional[str] = None
    reference_number: Optional[str] = None

class UpdateStatusRequest(BaseModel):
    new_status: str

@router.get("/admin/orders/manage")
async def get_all_orders(token: str = Depends(oauth2_scheme)):
    await validate_token_and_roles(token, ["admin", "staff", "cashier"])

    conn = await get_db_connection()
    cursor = await conn.cursor()

    try:
        await cursor.execute("""
            SELECT
                o.OrderID,
                o.UserName,
                o.OrderDate,
                o.OrderType,
                o.PaymentMethod,
                o.TotalAmount,
                o.DeliveryNotes,
                o.Status,
                o.ReferenceNumber,

                di.EmailAddress,
                di.PhoneNumber,
                di.Address,
                di.City,
                di.Province,
                di.Landmark

            FROM Orders o
                LEFT JOIN (
                    SELECT FirstName, EmailAddress, PhoneNumber, Address, City, Province, Landmark,
                           ROW_NUMBER() OVER (PARTITION BY FirstName ORDER BY (SELECT NULL)) as rn
                    FROM DeliveryInfo
                ) di ON di.FirstName = o.UserName AND di.rn = 1
            ORDER BY o.OrderDate DESC
        """)

        orders_data = await cursor.fetchall()

        orders = []
        for row in orders_data:
            order_id = row[0]

            # Get item details with price
            await cursor.execute("""
                SELECT ProductName, Quantity, Price 
                FROM OrderItems 
                WHERE OrderID = ?
            """, (order_id,))
            item_rows = await cursor.fetchall()

            item_list = []
            for item in item_rows:
                item_list.append({
                    "name": item[0],
                    "quantity": item[1],
                    "price": float(item[2])
                })

            delivery_address = ", ".join(filter(None, [row[11], row[12], row[13], row[14]]))

            orders.append({
                "order_id": row[0],
                "customer_name": row[1],
                "order_date": row[2].strftime("%Y-%m-%d %H:%M:%S"),
                "order_type": row[3],
                "payment_method": row[4],
                "total_amount": float(row[5]),
                "deliveryNotes": row[6],
                "order_status": row[7],
                "reference_number": row[8],
                "emailAddress": row[9],
                "phoneNumber": row[10],
                "deliveryAddress": delivery_address,
                "items": item_list
            })

        return orders

    except Exception as e:
        logger.error(f"Failed to fetch orders: {e}", exc_info=True)
        raise HTTPException(status_code=500, detail="Failed to retrieve orders")
    finally:
        await cursor.close()
        await conn.close()

@router.get("/admin/orders/today_count")
async def get_todays_orders_count(token: str = Depends(oauth2_scheme)):
    await validate_token_and_roles(token, ["admin", "staff"])
    conn = await get_db_connection()
    cursor = await conn.cursor()
    try:
        today_str = date.today().strftime("%Y-%m-%d")
        await cursor.execute("""
            SELECT COUNT(*)
            FROM Orders
            WHERE CONVERT(date, OrderDate) = ?
        """, (today_str,))
        result = await cursor.fetchone()
        count = result[0] if result else 0
    finally:
        await cursor.close()
        await conn.close()
    return {"todays_orders": count}

@router.get("/admin/orders/pending")
async def get_all_pending_orders(token: str = Depends(oauth2_scheme)):
    await validate_token_and_roles(token, ["admin", "staff"])

    conn = await get_db_connection()
    cursor = await conn.cursor()

    try:
        await cursor.execute("""
            SELECT 
                o.OrderID,
                o.UserName,
                o.OrderDate,
                o.OrderType,
                o.PaymentMethod,
                o.TotalAmount,
                o.Status,
                STRING_AGG(CONCAT(oi.ProductName, ' (x', CAST(oi.Quantity AS VARCHAR), ')'), ', ') AS Items
            FROM Orders o
            LEFT JOIN OrderItems oi ON o.OrderID = oi.OrderID
            WHERE o.Status = 'Pending'
            GROUP BY o.OrderID, o.UserName, o.OrderDate, o.OrderType, o.PaymentMethod, o.TotalAmount, o.Status
            ORDER BY o.OrderDate DESC
        """)

        rows = await cursor.fetchall()
    except Exception as e:
        logger.error(f"Failed to fetch pending orders: {e}", exc_info=True)
        raise HTTPException(status_code=500, detail="Failed to retrieve pending orders")
    finally:
        await cursor.close()
        await conn.close()

    orders = []
    for row in rows:
        orders.append({
            "order_id": row[0],
            "customer_name": row[1],
            "order_date": row[2].strftime("%Y-%m-%d %H:%M:%S"),
            "order_type": row[3],
            "payment_method": row[4],
            "total_amount": float(row[5]),
            "order_status": row[6],
            "items": row[7] if row[7] else ""
        })

    return orders

@router.get("cart/admin/orders/pending")
async def get_pending_orders_count(token: str = Depends(oauth2_scheme)):
    await validate_token_and_roles(token, ["admin", "staff"])
    conn = await get_db_connection()
    cursor = await conn.cursor()
    try:
        await cursor.execute("SELECT COUNT(*) FROM Orders WHERE Status = 'Pending'")
        result = await cursor.fetchone()
        pending_count = result[0] if result else 0
    finally:
        await cursor.close()
        await conn.close()
    return {"pending_orders_count": pending_count}

@router.get("/orders/history")
async def get_user_orders(token: str = Depends(oauth2_scheme)):
    user_data = await validate_token_and_roles(token, ["user"])
    username = user_data.get("username")
    conn = await get_db_connection()
    cursor = await conn.cursor()

    await cursor.execute("""
        SELECT o.OrderID, o.OrderDate, o.OrderType, o.Status, oi.ProductName, oi.Quantity, oi.Price
        FROM Orders o
        JOIN OrderItems oi ON o.OrderID = oi.OrderID
        WHERE o.UserName = ?
        ORDER BY o.OrderDate DESC
    """, (username,))

    rows = await cursor.fetchall()
    await cursor.close()
    await conn.close()

    # Structure the data by order
    orders = {}
    for row in rows:
        order_id = row[0]
        if order_id not in orders:
            orders[order_id] = {
                "id": order_id,
                "date": row[1],
                "orderType": row[2],
                "status": row[3],
                "products": [],
            }
        orders[order_id]["products"].append({
            "name": row[4],
            "quantity": row[5],
            "price": float(row[6])
        })

    return list(orders.values())

@router.put("/update-payment")
async def update_payment_details(payload: UpdatePaymentDetails, token: str = Depends(oauth2_scheme)):
    await validate_token_and_roles(token, ["user", "admin", "staff"])

    conn = await get_db_connection()
    cursor = await conn.cursor()
    try:
        await cursor.execute("""
            SELECT OrderID FROM Orders
            WHERE UserName = ? AND Status = 'Pending' AND PaymentStatus = 'Paid'
            ORDER BY OrderDate DESC
            OFFSET 0 ROWS FETCH NEXT 1 ROWS ONLY
        """, (payload.username,))
        order = await cursor.fetchone()

        if not order:
            raise HTTPException(status_code=404, detail="No paid order found to update")

        order_id = order[0]

        await cursor.execute("""
            UPDATE Orders
            SET PaymentMethod = ?, Subtotal = ?, DeliveryFee = ?, TotalAmount = ?, DeliveryNotes = ?, ReferenceNumber = ?
            WHERE OrderID = ?
        """, (
            payload.payment_method,
            payload.subtotal,
            payload.delivery_fee,
            payload.total_amount,
            payload.delivery_notes or '',
            payload.reference_number,
            order_id
        ))

        await conn.commit()
    except Exception as e:
        logger.error(f"Error updating order payment details: {e}", exc_info=True)
        raise HTTPException(status_code=500, detail="Failed to update order payment details")
    finally:
        await cursor.close()
        await conn.close()

    return {"message": "Order payment details updated successfully"}



@router.post("/deliveryinfo", status_code=status.HTTP_201_CREATED)
async def add_delivery_info(delivery_info: DeliveryInfoRequest, token: str = Depends(oauth2_scheme)):
    await validate_token_and_roles(token, ["user", "admin", "staff"])
    conn = await get_db_connection()
    cursor = await conn.cursor()
    try:
        await cursor.execute("""
            INSERT INTO DeliveryInfo (
                FirstName, MiddleName, LastName, Address, City, Province, Landmark, EmailAddress, PhoneNumber, Notes
            ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
        """, (
            delivery_info.FirstName,
            delivery_info.MiddleName,
            delivery_info.LastName,
            delivery_info.Address,
            delivery_info.City,
            delivery_info.Province,
            delivery_info.Landmark,
            delivery_info.EmailAddress,
            delivery_info.PhoneNumber,
            delivery_info.Notes
        ))
        await conn.commit()
    except Exception as e:
        logger.error(f"Error adding delivery info: {e}")
        raise HTTPException(status_code=500, detail="Failed to add delivery info")
    finally:
        await cursor.close()
        await conn.close()
    return {"message": "Delivery info added successfully"}


@router.get("/{username}", response_model=List[CartResponse])
async def get_cart(username: str, token: str = Depends(oauth2_scheme)):
    await validate_token_and_roles(token, ["user", "admin", "staff"])
    conn = await get_db_connection()
    cursor = await conn.cursor()

    await cursor.execute("""
        SELECT OrderID, OrderDate, Status
        FROM Orders
        WHERE UserName = ? AND Status = 'Pending' AND PaymentStatus = 'Unpaid'
        ORDER BY OrderDate DESC
        OFFSET 0 ROWS FETCH NEXT 1 ROWS ONLY
    """, (username,))
    order = await cursor.fetchone()

    if not order:
        await cursor.close()
        await conn.close()
        return []

    order_id = order[0]

    await cursor.execute("""
        SELECT OrderItemID, ProductName, ProductType, ProductCategory, Quantity, Price
        FROM OrderItems
        WHERE OrderID = ?
    """, (order_id,))
    items = await cursor.fetchall()
    await cursor.close()
    await conn.close()

    cart = []
    for item in items:
        cart.append(CartResponse(
            order_item_id=item[0],
            product_id=None,
            product_name=item[1],
            product_type=item[2],
            product_category=item[3],
            quantity=item[4],
            price=float(item[5]),
            order_type=order[2],
            status=order[2],
            created_at=order[1].strftime("%Y-%m-%d %H:%M:%S")
        ))
    return cart


@router.post("/", status_code=status.HTTP_201_CREATED)
async def add_to_cart(item: CartItem, token: str = Depends(oauth2_scheme)):
    await validate_token_and_roles(token, ["user", "admin", "staff"])
    conn = await get_db_connection()
    cursor = await conn.cursor()
    try:
        # Look for unpaid & pending order
        await cursor.execute("""
            SELECT OrderID
            FROM Orders
            WHERE UserName = ? AND Status = 'Pending' AND PaymentStatus = 'Unpaid'
            ORDER BY OrderDate DESC
            OFFSET 0 ROWS FETCH NEXT 1 ROWS ONLY
        """, (item.username,))
        order = await cursor.fetchone()

        if order:
            order_id = order[0]
        else:
            await cursor.execute("""
                INSERT INTO Orders (
                    UserName, OrderType, PaymentMethod, Subtotal, DeliveryFee,
                    TotalAmount, DeliveryNotes, Status, PaymentStatus
                )
                OUTPUT INSERTED.OrderID
                VALUES (?, ?, ?, 0, 0, 0, '', 'Pending', 'Unpaid')
            """, (item.username, item.order_type, 'Cash'))
            row = await cursor.fetchone()
            order_id = row[0] if row else None

        # Check if item already in cart
        await cursor.execute("""
            SELECT OrderItemID, Quantity FROM OrderItems
            WHERE OrderID = ? AND ProductName = ? AND ProductType = ? AND ProductCategory = ?
        """, (
            order_id, item.product_name,
            item.product_type or '', item.product_category or ''
        ))
        existing_item = await cursor.fetchone()

        if existing_item:
            order_item_id, current_qty = existing_item
            await cursor.execute("""
                UPDATE OrderItems
                SET Quantity = ?
                WHERE OrderItemID = ?
            """, (current_qty + item.quantity, order_item_id))
        else:
            await cursor.execute("""
                INSERT INTO OrderItems (OrderID, ProductName, ProductType, ProductCategory, Quantity, Price)
                VALUES (?, ?, ?, ?, ?, ?)
            """, (
                order_id,
                item.product_name,
                item.product_type or '',
                item.product_category or '',
                item.quantity,
                item.price
            ))

        await conn.commit()

    except Exception as e:
        logger.error(f"Error adding to cart: {e}")
        raise HTTPException(status_code=500, detail="Failed to add item to cart")
    finally:
        await cursor.close()
        await conn.close()

    return {"message": "Item added to cart"}


@router.put("/quantity/{order_item_id}")
async def update_quantity(order_item_id: int, new_quantity: int, token: str = Depends(oauth2_scheme)):
    await validate_token_and_roles(token, ["user", "admin", "staff"])
    if new_quantity <= 0:
        raise HTTPException(status_code=400, detail="Quantity must be at least 1")

    conn = await get_db_connection()
    cursor = await conn.cursor()
    try:
        await cursor.execute("""
            UPDATE OrderItems
            SET Quantity = ?
            WHERE OrderItemID = ?
        """, (new_quantity, order_item_id))
        await conn.commit()
    except Exception as e:
        logger.error(f"Error updating quantity: {e}")
        raise HTTPException(status_code=500, detail="Failed to update quantity")
    finally:
        await cursor.close()
        await conn.close()
    return {"message": "Quantity updated"}


@router.delete("/{order_item_id}", status_code=status.HTTP_200_OK)
async def remove_from_cart(order_item_id: int, token: str = Depends(oauth2_scheme)):
    await validate_token_and_roles(token, ["user", "admin", "staff"])
    conn = await get_db_connection()
    cursor = await conn.cursor()
    try:
        logger.info(f"Removing from cart: {order_item_id}")
        await cursor.execute("DELETE FROM OrderItems WHERE OrderItemID = ?", (order_item_id,))
        await conn.commit()
    except Exception as e:
        logger.error(f"Error removing from cart: {e}")
        raise HTTPException(status_code=500, detail="Failed to remove item from cart")
    finally:
        await cursor.close()
        await conn.close()
    return {"message": "Item removed from cart"}


@router.post("/finalize", status_code=status.HTTP_200_OK)
async def finalize_order(username: str, token: str = Depends(oauth2_scheme)):
    await validate_token_and_roles(token, ["user", "admin", "staff"])
    conn = await get_db_connection()
    cursor = await conn.cursor()
    try:
        # Select only unpaid orders
        await cursor.execute("""
            SELECT OrderID FROM Orders
            WHERE UserName = ? AND Status = 'Pending' AND PaymentStatus = 'Unpaid'
            ORDER BY OrderDate DESC
            OFFSET 0 ROWS FETCH NEXT 1 ROWS ONLY
        """, (username,))
        order = await cursor.fetchone()
        if not order:
            raise HTTPException(status_code=404, detail="No pending unpaid order found")

        order_id = order[0]

        # Finalize by setting PaymentStatus to Paid
        await cursor.execute("""
            UPDATE Orders
            SET PaymentStatus = 'Paid'
            WHERE OrderID = ?
        """, (order_id,))
        await conn.commit()
    except Exception as e:
        logger.error(f"Error finalizing order: {e}", exc_info=True)
        raise HTTPException(status_code=500, detail=f"Failed to finalize order: {str(e)}")
    finally:
        await cursor.close()
        await conn.close()

    return {"message": "Order finalized and marked as Paid"}

@router.patch("/admin/orders/{order_id}/status", status_code=status.HTTP_200_OK)
async def update_order_status(order_id: int, request: UpdateStatusRequest, token: str = Depends(oauth2_scheme)):
    """
    Updates the status of a specific online order.
    """
    user_data = await validate_token_and_roles(token, ["admin", "staff", "cashier", "user"])
    username = user_data.get("username")
    user_role = user_data.get("userRole")

    conn = await get_db_connection()
    cursor = await conn.cursor()
    try:
        # Check if the order exists and get the owner
        await cursor.execute("SELECT OrderID, UserName FROM Orders WHERE OrderID = ?", (order_id,))
        order = await cursor.fetchone()
        if not order:
            raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Order not found")

        order_owner = order[1]

        # If user is not admin/staff/cashier, check ownership
        if user_role == "user" and order_owner != username:
            raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="You can only update your own orders")

        # Update the status
        await cursor.execute(
            "UPDATE Orders SET Status = ? WHERE OrderID = ?",
            (request.new_status, order_id)
        )
        await conn.commit()

        logger.info(f"Updated status for order {order_id} to {request.new_status}")
        return {"message": f"Order status successfully updated to {request.new_status}"}

    except Exception as e:
        await conn.rollback()
        logger.error(f"Error updating order status for OrderID {order_id}: {e}", exc_info=True)
        raise HTTPException(status_code=status.HTTP_500_INTERNAL_SERVER_ERROR, detail="Failed to update order status.")
    finally:
        await cursor.close()
        await conn.close()