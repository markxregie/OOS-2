from fastapi import APIRouter, Depends, HTTPException, status
from fastapi.security import OAuth2PasswordBearer
from pydantic import BaseModel
from typing import List, Optional
from datetime import datetime, date, timedelta
from database import get_db_connection
import httpx
import asyncio
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
    addons: Optional[List[dict]] = []


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
        # Update SQL query to include CashierName
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
                o.CashierName,  -- CashierName included here
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
                SELECT OrderItemID, ProductName, Quantity, Price, ProductCategory
                FROM OrderItems
                WHERE OrderID = ?
            """, (order_id,))
            item_rows = await cursor.fetchall()

            item_list = []
            for item in item_rows:
                order_item_id = item[0]
                # Get add-ons for this item
                await cursor.execute("""
                    SELECT AddOnName, Price, AddOnID
                    FROM OrderItemAddOns
                    WHERE OrderItemID = ?
                """, (order_item_id,))
                addon_rows = await cursor.fetchall()
                addons_list = [
                    {
                        "addon_name": addon[0],
                        "price": float(addon[1]),
                        "addon_id": addon[2]
                    }
                    for addon in addon_rows
                ]
                item_list.append({
                    "name": item[1],
                    "quantity": item[2],
                    "price": float(item[3]),
                    "category": item[4],
                    "addons": addons_list
                })

            delivery_address = ", ".join(filter(None, [row[11], row[12], row[13], row[14]]))

            # Include the CashierName in the response
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
                "cashier_name": row[9],  # Add the CashierName here
                "emailAddress": row[10],
                "phoneNumber": row[11],
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
        SELECT o.OrderID, o.OrderDate, o.OrderType, o.Status
        FROM Orders o
        WHERE o.UserName = ?
        ORDER BY o.OrderDate DESC
    """, (username,))

    order_rows = await cursor.fetchall()

    orders = []
    for order_row in order_rows:
        order_id = order_row[0]

        # Get items for this order
        await cursor.execute("""
            SELECT OrderItemID, ProductName, Quantity, Price
            FROM OrderItems
            WHERE OrderID = ?
        """, (order_id,))
        item_rows = await cursor.fetchall()

        products = []
        for item in item_rows:
            order_item_id = item[0]
            # Get add-ons for this item
            await cursor.execute("""
                SELECT AddOnName, Price, AddOnID
                FROM OrderItemAddOns
                WHERE OrderItemID = ?
            """, (order_item_id,))
            addon_rows = await cursor.fetchall()
            addons_list = [
                {
                    "addon_name": addon[0],
                    "price": float(addon[1]),
                    "addon_id": addon[2]
                }
                for addon in addon_rows
            ]
            products.append({
                "name": item[1],
                "quantity": item[2],
                "price": float(item[3]),
                "addons": addons_list
            })

        orders.append({
            "id": order_id,
            "date": order_row[1],
            "orderType": order_row[2],
            "status": order_row[3],
            "products": products,
        })

    await cursor.close()
    await conn.close()

    return orders

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

        # ✅ Notify user when order is placed (payment details updated)
        try:
            async with httpx.AsyncClient() as client:
                await client.post(
                    "http://localhost:7002/notifications/notifications/create",
                    params={
                        "username": payload.username,
                        "title": "Order Placed",
                        "message": f"Your order {payload.reference_number} has been placed successfully!",
                        "type": "Order",
                        "order_id": order_id
                    }
                )
        except Exception as notify_err:
            logger.error(f"Failed to send notification: {notify_err}")

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
    logger.info(f"Adding to cart: {item.dict()}")
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

        merge = False
        if existing_item:
            order_item_id, current_qty = existing_item
            # Get existing addons
            await cursor.execute("""
                SELECT AddOnName FROM OrderItemAddOns WHERE OrderItemID = ? ORDER BY AddOnName
            """, (order_item_id,))
            existing_addons = [row[0] for row in await cursor.fetchall()]
            incoming_addons = sorted([a.get("name") or a.get("addon_name") for a in item.addons or []])
            if existing_addons == incoming_addons:
                merge = True
                await cursor.execute("""
                    UPDATE OrderItems SET Quantity = Quantity + ? WHERE OrderItemID = ?
                """, (item.quantity, order_item_id))

        if not merge:
            await cursor.execute("""
                INSERT INTO OrderItems (OrderID, ProductName, ProductType, ProductCategory, Quantity, Price)
                OUTPUT INSERTED.OrderItemID
                VALUES (?, ?, ?, ?, ?, ?)
            """, (
                order_id, item.product_name, item.product_type or '',
                item.product_category or '', item.quantity, item.price
            ))
            row = await cursor.fetchone()
            order_item_id = row[0] if row else None

            if item.addons:
                logger.info(f"Processing addons for new item {order_item_id}: {item.addons}")
                for addon in item.addons:
                    try:
                        addon_name = addon.get("name") or addon.get("addon_name")
                        if not addon_name:
                            continue

                        await cursor.execute("""
                            INSERT INTO OrderItemAddOns (OrderItemID, AddOnName, Price, AddOnID)
                            VALUES (?, ?, ?, ?)
                        """, (
                            order_item_id,
                            addon_name,
                            addon.get("price", 0),
                            addon.get("addon_id")
                        ))
                        logger.info(f"Successfully inserted addon {addon_name} for new item {order_item_id}")
                    except Exception as e:
                        logger.error(f"Error inserting addon for new item {order_item_id}: {e}")
                        raise

        await conn.commit()

    except Exception as e:
        logger.error(f"Error adding to cart: {e}")
        raise HTTPException(status_code=500, detail="Failed to add item to cart")
    finally:
        await cursor.close()
        await conn.close()

    return {"message": "Item added to cart", "order_item_id": order_item_id}


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

@router.post("/update_addons", status_code=status.HTTP_200_OK)
async def update_addons_for_item(order_item_id: int, addons: List[dict], token: str = Depends(oauth2_scheme)):
    await validate_token_and_roles(token, ["user", "admin", "staff"])
    logger.info(f"Updating addons for order_item_id {order_item_id}: {addons}")
    conn = await get_db_connection()
    cursor = await conn.cursor()
    try:
        for addon in addons:
            try:
                logger.info(f"Checking addon: {addon}")
                await cursor.execute("""
                    SELECT COUNT(*) FROM OrderItemAddOns WHERE OrderItemID = ? AND AddOnName = ?
                """, (order_item_id, addon.get("addon_name")))
                exists = await cursor.fetchone()
                logger.info(f"Addon exists check: {exists}")
                if exists and exists[0] == 0:
                    logger.info(f"Inserting addon: {addon}")
                    await cursor.execute("""
                        INSERT INTO OrderItemAddOns (OrderItemID, AddOnName, Price, AddOnID)
                        VALUES (?, ?, ?, ?)
                    """, (
                        order_item_id,
                        addon.get("addon_name"),
                        addon.get("price", 0),
                        addon.get("addon_id")
                    ))
                    logger.info(f"Successfully inserted addon {addon.get('addon_name')} for item {order_item_id}")
                else:
                    logger.info(f"Addon {addon.get('addon_name')} already exists for item {order_item_id}")
            except Exception as e:
                logger.error(f"Error inserting addon {addon.get('addon_name')} for item {order_item_id}: {e}")
                raise
        await conn.commit()
    except Exception as e:
        logger.error(f"Error updating addons for order_item_id {order_item_id}: {e}")
        raise HTTPException(status_code=500, detail="Failed to update addons")
    finally:
        await cursor.close()
        await conn.close()

    return {"message": "Addons updated successfully"}

@router.patch("/admin/orders/{order_id}/status", status_code=status.HTTP_200_OK)
async def update_order_status(
    order_id: int,
    request: UpdateStatusRequest,
    token: str = Depends(oauth2_scheme)
):
    user_data = await validate_token_and_roles(token, ["admin", "staff", "cashier", "user"])
    username = user_data.get("username")
    user_role = user_data.get("userRole")

    conn = await get_db_connection()
    cursor = await conn.cursor()
    try:
        # Check if the order exists
        await cursor.execute("SELECT OrderID, UserName FROM Orders WHERE OrderID = ?", (order_id,))
        order = await cursor.fetchone()
        if not order:
            raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Order not found")

        order_owner = order[1]

        # If user is not admin/staff/cashier, check ownership
        if user_role == "user" and order_owner != username:
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN,
                detail="You can only update your own orders"
            )

        # ✅ Update status AND cashier name when accepting order
        if request.new_status == "PREPARING":
            await cursor.execute(
                "UPDATE Orders SET Status = ?, CashierName = ? WHERE OrderID = ?",
                (request.new_status, username, order_id)
            )
        else:
            await cursor.execute(
                "UPDATE Orders SET Status = ? WHERE OrderID = ?",
                (request.new_status, order_id)
            )

        await conn.commit()

        logger.info(f"Updated status for order {order_id} to {request.new_status}")

        # Get reference number
        await cursor.execute("SELECT ReferenceNumber FROM Orders WHERE OrderID = ?", (order_id,))
        ref = await cursor.fetchone()

        reference_number = ref.ReferenceNumber if ref else f"#{order_id}"
        # ✅ Notify customer about the status update
        try:
            async with httpx.AsyncClient() as client:
                await client.post(
                    "http://localhost:7002/notifications/notifications/create",
                    params={
                        "username": order_owner,
                        "title": "Order Update",
                        "message": f"Your order {reference_number} is now {request.new_status}.",
                        "type": "Order",
                        "order_id": order_id
                    }
                )
        except Exception as notify_err:
            logger.error(f"Failed to send order update notification: {notify_err}")

        return {"message": f"Order status successfully updated to {request.new_status}"}

    except Exception as e:
        await conn.rollback()
        logger.error(f"Error updating order status for OrderID {order_id}: {e}", exc_info=True)
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Failed to update order status."
        )
    finally:
        await cursor.close()
        await conn.close()

@router.patch("/rider/orders/{order_id}/status", status_code=status.HTTP_200_OK)
async def update_rider_order_status(
    order_id: int,
    request: UpdateStatusRequest,
    token: str = Depends(oauth2_scheme)
):
    user_data = await validate_token_and_roles(token, ["rider"])
    username = user_data.get("username")
    rider_id = user_data.get("id") or user_data.get("userId")  # Assuming user_data has 'id' or 'userId'

    conn = await get_db_connection()
    cursor = await conn.cursor()
    try:
        # Check if the order exists and is assigned to this rider
        await cursor.execute("SELECT OrderID FROM Orders WHERE OrderID = ? AND AssignedRiderID = ?", (order_id, rider_id))
        order = await cursor.fetchone()
        if not order:
            raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Order not found or not assigned to you")

        # Update status
        await cursor.execute(
            "UPDATE Orders SET Status = ? WHERE OrderID = ?",
            (request.new_status, order_id)
        )

        await conn.commit()

        logger.info(f"Rider {username} updated status for order {order_id} to {request.new_status}")
        return {"message": f"Order status successfully updated to {request.new_status}"}

    except Exception as e:
        await conn.rollback()
        logger.error(f"Error updating rider order status for OrderID {order_id}: {e}", exc_info=True)
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Failed to update order status."
        )
    finally:
        await cursor.close()
        await conn.close()

@router.patch("/admin/orders/auto-cancel/{reference_number}")
async def auto_cancel_order_by_reference(
    reference_number: str,
    cancellation_data: dict
):
    """
    Endpoint called by POS to cancel an OOS order that has expired.
    This is called by the POS system's auto-cancel task.
    """
    conn = await get_db_connection()
    cursor = await conn.cursor()
    
    try:
        # Find the order by reference number
        await cursor.execute("""
            SELECT OrderID, UserName, Status 
            FROM Orders 
            WHERE ReferenceNumber = ?
        """, (reference_number,))
        
        order = await cursor.fetchone()
        
        if not order:
            logger.warning(f"Order with reference {reference_number} not found in OOS")
            raise HTTPException(status_code=404, detail="Order not found")
        
        order_id = order[0]
        username = order[1]
        current_status = order[2]
        
        # Only cancel if still pending
        if current_status.lower() != 'pending':
            logger.info(f"Order {order_id} is {current_status}, skipping auto-cancel")
            return {
                "message": f"Order already has status: {current_status}",
                "order_id": order_id
            }
        
        # Update order status to cancelled
        await cursor.execute("""
            UPDATE Orders 
            SET Status = 'Cancelled', 
                DeliveryNotes = CONCAT(
                    ISNULL(DeliveryNotes, ''), 
                    ' [AUTO-CANCELLED: Order expired after 30 minutes]'
                )
            WHERE OrderID = ?
        """, (order_id,))
        
        await conn.commit()
        
        logger.info(
            f"✅ Auto-cancelled OOS OrderID={order_id}, "
            f"Ref={reference_number}, Reason={cancellation_data.get('reason')}"
        )
        
        # Send notification to customer
        try:
            async with httpx.AsyncClient(timeout=10.0) as client:
                await client.post(
                    "http://localhost:7002/notifications/notifications/create",
                    params={
                        "username": username,
                        "title": "Order Automatically Cancelled",
                        "message": f"Your order #{order_id} was automatically cancelled due to payment timeout (30 minutes).",
                        "type": "Order",
                        "order_id": order_id
                    }
                )
        except Exception as notify_err:
            logger.error(f"Failed to send cancellation notification: {notify_err}")
        
        return {
            "message": "Order successfully auto-cancelled",
            "order_id": order_id,
            "reference_number": reference_number,
            "reason": cancellation_data.get("reason")
        }
        
    except Exception as e:
        await conn.rollback()
        logger.error(f"Error auto-cancelling order {reference_number}: {e}", exc_info=True)
        raise HTTPException(status_code=500, detail=f"Failed to cancel order: {str(e)}")
    finally:
        await cursor.close()
        await conn.close()


# Also add a background task for OOS to check its own orders
async def auto_cancel_expired_oos_orders():
    """
    Background task for OOS to independently check and cancel expired orders
    """
    while True:
        try:
            logger.info("🔍 OOS: Checking for expired pending orders...")
            conn = await get_db_connection()
            cursor = await conn.cursor()
            
            # Find orders pending for more than 30 minutes
            expiration_time = datetime.now() - timedelta(minutes=30)
            
            await cursor.execute("""
                SELECT OrderID, UserName, ReferenceNumber
                FROM Orders
                WHERE Status = 'Pending' 
                AND PaymentStatus = 'Unpaid'
                AND OrderDate < ?
            """, (expiration_time,))
            
            expired_orders = await cursor.fetchall()
            
            if expired_orders:
                logger.info(f"Found {len(expired_orders)} expired OOS orders")
                
                for order in expired_orders:
                    order_id = order[0]
                    username = order[1]
                    reference_number = order[2]
                    
                    try:
                        await cursor.execute("""
                            UPDATE Orders 
                            SET Status = 'Cancelled',
                                DeliveryNotes = CONCAT(
                                    ISNULL(DeliveryNotes, ''), 
                                    ' [AUTO-CANCELLED: Payment not completed within 30 minutes]'
                                )
                            WHERE OrderID = ?
                        """, (order_id,))
                        
                        await conn.commit()
                        
                        logger.info(f"✅ OOS auto-cancelled OrderID={order_id}")
                        
                        # Notify customer
                        try:
                            async with httpx.AsyncClient(timeout=10.0) as client:
                                await client.post(
                                    "http://localhost:7002/notifications/notifications/create",
                                    params={
                                        "username": username,
                                        "title": "Order Automatically Cancelled",
                                        "message": f"Your order #{order_id} was cancelled due to payment timeout.",
                                        "type": "Order",
                                        "order_id": order_id
                                    }
                                )
                        except Exception as notify_err:
                            logger.error(f"Failed to send notification: {notify_err}")
                            
                    except Exception as e:
                        await conn.rollback()
                        logger.error(f"Failed to cancel order {order_id}: {e}")
                        continue
            else:
                logger.info("No expired OOS orders found")
                
            await cursor.close()
            await conn.close()
            
        except Exception as e:
            logger.error(f"Error in OOS auto-cancel task: {e}", exc_info=True)
        
        # Check every 5 minutes
        await asyncio.sleep(300)