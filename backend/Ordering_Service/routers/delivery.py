from fastapi import APIRouter, Depends, HTTPException, status
from fastapi.security import OAuth2PasswordBearer
from pydantic import BaseModel
from typing import Optional
from database import get_db_connection
import httpx
import logging

logger = logging.getLogger(__name__)
router = APIRouter()

oauth2_scheme = OAuth2PasswordBearer(tokenUrl="http://localhost:4000/auth/token")

# --- AUTH VALIDATOR ---
async def validate_token_and_roles(token: str, allowed_roles: list[str]):
    USER_SERVICE_ME_URL = "http://localhost:4000/auth/users/me"
    async with httpx.AsyncClient() as client:
        try:
            response = await client.get(USER_SERVICE_ME_URL, headers={"Authorization": f"Bearer {token}"})
            response.raise_for_status()
        except httpx.HTTPStatusError as e:
            logger.error(f"Auth service error: {e.response.status_code} - {e.response.text}")
            raise HTTPException(status_code=e.response.status_code, detail="Authentication failed.")
        except httpx.RequestError as e:
            logger.error(f"Auth service unavailable: {e}")
            raise HTTPException(status_code=status.HTTP_503_SERVICE_UNAVAILABLE, detail="Auth service unavailable.")

    user_data = response.json()
    if user_data.get("userRole") not in allowed_roles:
        raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="Access denied.")

    return user_data.get("username")

# --- DELIVERY INFO MODEL ---
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

class UpdateDeliveryStatusRequest(BaseModel):
    status: str
# --- ROUTE: Get Delivery Info by OrderID ---
@router.get("/info/{order_id}")
async def get_delivery_info(order_id: int, token: str = Depends(oauth2_scheme)):
    await validate_token_and_roles(token, ["user", "admin", "staff"])

    conn = await get_db_connection()
    cursor = await conn.cursor()

    try:
        await cursor.execute("""
            SELECT FirstName, MiddleName, LastName, Address,
                   City, Province, Landmark, EmailAddress,
                   PhoneNumber, Notes
            FROM DeliveryInfo
            WHERE OrderID = ?
        """, (order_id,))
        row = await cursor.fetchone()

        if not row:
            raise HTTPException(status_code=404, detail="Delivery info not found for this OrderID")

        return {
            "FirstName": row[0],
            "MiddleName": row[1],
            "LastName": row[2],
            "Address": row[3],
            "City": row[4],
            "Province": row[5],
            "Landmark": row[6],
            "EmailAddress": row[7],
            "PhoneNumber": row[8],
            "Notes": row[9]
        }

    except Exception as e:
        logger.error(f"Error retrieving delivery info: {e}")
        raise HTTPException(status_code=500, detail="Failed to retrieve delivery info")

    finally:
        await cursor.close()
        await conn.close()

@router.put("/orders/{order_id}/assign-rider")
async def assign_rider(order_id: int, rider_id: int, token: str = Depends(oauth2_scheme)):
    await validate_token_and_roles(token, ["admin", "staff"])  

    conn = await get_db_connection()
    cursor = await conn.cursor()
    try:
        # update Orders table
        await cursor.execute("""
            UPDATE Orders
            SET AssignedRiderID = ?
            WHERE OrderID = ?
        """, (rider_id, order_id))

        # update RiderOrders table (insert if not exists)
        await cursor.execute("""
            SELECT RiderOrderID FROM RiderOrders WHERE OrderID = ?
        """, (order_id,))
        existing = await cursor.fetchone()

        if existing:
            await cursor.execute("""
                UPDATE RiderOrders
                SET RiderID = ?, OrderStatus = 'Assigned'
                WHERE OrderID = ?
            """, (rider_id, order_id))
        else:
            await cursor.execute("""
                INSERT INTO RiderOrders (RiderID, OrderID, OrderStatus, CompletedOrders, Earnings)
                VALUES (?, ?, 'Assigned', 0, 0)
            """, (rider_id, order_id))

        await conn.commit()
        return {"message": "Rider assigned successfully", "order_id": order_id, "rider_id": rider_id}

    finally:
        await cursor.close()
        await conn.close()


@router.post("/info", status_code=status.HTTP_201_CREATED)
async def add_delivery_info(delivery_info: DeliveryInfoRequest, token: str = Depends(oauth2_scheme)):
    username = await validate_token_and_roles(token, ["user", "admin", "staff"])

    conn = await get_db_connection()
    cursor = await conn.cursor()

    try:
        # Find latest order for this user
        await cursor.execute("""
            SELECT TOP 1 OrderID
            FROM Orders
            WHERE UserName = ? AND Status = 'Pending'
            ORDER BY OrderDate DESC
        """, (username,))
        order = await cursor.fetchone()

        if not order:
            raise HTTPException(status_code=404, detail="No active pending order found for user")

        order_id = order[0]

        # Now check payment
        await cursor.execute("SELECT PaymentStatus FROM Orders WHERE OrderID = ?", (order_id,))
        payment = await cursor.fetchone()
        if not payment or payment[0] != "Paid":
            raise HTTPException(status_code=400, detail="Order not paid yet")

        # Insert delivery info
        await cursor.execute("""
            INSERT INTO DeliveryInfo (
                FirstName, MiddleName, LastName, Address,
                City, Province, Landmark, EmailAddress,
                PhoneNumber, Notes, OrderID
            )
            VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
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
            delivery_info.Notes,
            order_id
        ))
        await conn.commit()

    except Exception as e:
        logger.error(f"Error adding delivery info: {e}")
        raise HTTPException(status_code=500, detail="Failed to add delivery info")
    finally:
        await cursor.close()
        await conn.close()

    return {"message": "Delivery info added successfully", "order_id": order_id}

@router.put("/orders/{order_id}/status", status_code=status.HTTP_200_OK)
async def update_delivery_order_status(
    order_id: int,
    request: UpdateDeliveryStatusRequest,
    token: str = Depends(oauth2_scheme)
):
    await validate_token_and_roles(token, ["rider", "admin", "staff"])

    conn = await get_db_connection()
    cursor = await conn.cursor()
    try:
        # Check if the order exists
        await cursor.execute("SELECT OrderID FROM Orders WHERE OrderID = ?", (order_id,))
        order = await cursor.fetchone()
        if not order:
            raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Order not found")

        # Update status
        await cursor.execute(
            "UPDATE Orders SET Status = ? WHERE OrderID = ?",
            (request.status, order_id)
        )

        await conn.commit()

        # --- Update Rider Earnings if order is delivered ---
        if request.status.lower() == 'delivered':
            try:
                # Get rider ID and total amount
                await cursor.execute("""
                    SELECT AssignedRiderID, TotalAmount
                    FROM Orders
                    WHERE OrderID = ?
                """, (order_id,))
                order_info = await cursor.fetchone()
                if order_info and order_info[0]:  # rider_id exists
                    rider_id = order_info[0]
                    total_amount = float(order_info[1]) if order_info[1] else 0.0

                    # Update RiderOrders: increment CompletedOrders and add to Earnings
                    await cursor.execute("""
                        UPDATE RiderOrders
                        SET CompletedOrders = CompletedOrders + 1,
                            Earnings = Earnings + ?
                        WHERE RiderID = ? AND OrderID = ?
                    """, (total_amount, rider_id, order_id))

                    await conn.commit()
                    logger.info(f"Updated earnings for rider {rider_id}, order {order_id}: +{total_amount}")
            except Exception as earn_err:
                logger.warning(f"Failed to update rider earnings: {earn_err}")

        # --- Notify user about status change ---
        try:
            # Fetch username, reference number, and assigned rider ID
            await cursor.execute("""
                SELECT UserName, ReferenceNumber, AssignedRiderID
                FROM Orders
                WHERE OrderID = ?
            """, (order_id,))
            order_row = await cursor.fetchone()

            if order_row:
                username, reference_number, rider_id = order_row

                notif_title = "Order Update"
                notif_type = "OrderStatus"
                notif_message = f"Your order #{reference_number} is now {request.status.capitalize()}."

                # ✅ Match lowercase "pickedup" (no space)
                if request.status.strip().lower() == "pickedup" and rider_id:
                    try:
                        async with httpx.AsyncClient() as client:
                            rider_res = await client.get(f"http://localhost:4000/users/riders/{rider_id}")
                            if rider_res.status_code == 200:
                                rider = rider_res.json()
                                rider_name = rider.get("FullName", "your rider")
                                notif_message = f"Your order #{reference_number} has been picked up by {rider_name}."
                    except Exception as re:
                        print(f"⚠️ Failed to fetch rider info for notification: {re}")

                # Send notification to Notification microservice
                async with httpx.AsyncClient() as client:
                    await client.post(
                        "http://localhost:7002/notifications/create",
                        params={
                            "username": username,
                            "title": notif_title,
                            "message": notif_message,
                            "type": notif_type,
                            "order_id": order_id,
                        },
                        headers={"Authorization": f"Bearer {token}"}
                    )

        except Exception as notify_err:
            logger.warning(f"⚠️ Failed to send notification: {notify_err}")

        logger.info(f"Updated delivery status for order {order_id} to {request.status}")
        return {"message": f"Order status successfully updated to {request.status}"}

    except Exception as e:
        await conn.rollback()
        logger.error(f"Error updating delivery order status for OrderID {order_id}: {e}", exc_info=True)
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Failed to update order status."
        )
    finally:
        await cursor.close()
        await conn.close()

@router.get("/rider/{rider_id}/orders")
async def get_rider_orders(rider_id: int, token: str = Depends(oauth2_scheme)):
    await validate_token_and_roles(token, ["rider","admin"])  # only riders

    conn = await get_db_connection()
    cursor = await conn.cursor()
    try:
        await cursor.execute("""
            SELECT
                o.OrderID, o.UserName, o.OrderDate, o.Status, o.PaymentMethod,
                o.TotalAmount, di.FirstName, di.MiddleName, di.LastName,
                di.PhoneNumber, di.Address, di.City, di.Province, di.Notes, di.Landmark,
                o.ReferenceNumber
            FROM Orders o
            LEFT JOIN DeliveryInfo di ON o.OrderID = di.OrderID
            WHERE o.AssignedRiderID = ?
            ORDER BY o.OrderDate DESC
        """, (rider_id,))
        rows = await cursor.fetchall()

        orders = []
        for row in rows:
            order_id = row[0]
            username = row[1]
            reference_number = row[15] # Get the reference number

            await cursor.execute("""
                SELECT ProductName, Quantity, Price
                FROM OrderItems
                WHERE OrderID = ?
            """, (order_id,))
            items = await cursor.fetchall()

            item_list = [
                {"name": i[0], "quantity": i[1], "price": float(i[2])}
                for i in items
            ]

            # Compute customer details with fallback to user service if DeliveryInfo missing
            first_name = row[6]
            middle_name = row[7]
            last_name = row[8]
            phone = row[9]
            address = ", ".join(filter(None, [row[10], row[11], row[12]]))

            if not first_name:
                # Fetch from user service
                try:
                    async with httpx.AsyncClient() as client:
                        response = await client.get(f"http://localhost:4000/users/{username}")
                        if response.status_code == 200:
                            user_data = response.json()
                            first_name = user_data.get("firstName") or ""
                            middle_name = user_data.get("middleName") or ""
                            last_name = user_data.get("lastName") or ""
                            phone = user_data.get("phone") or phone
                            address = user_data.get("address") or address
                except Exception as e:
                    logger.warning(f"Failed to fetch user info for {username}: {e}")

            customer_name = f"{first_name or ''} {middle_name or ''} {last_name or ''}".strip() or "Unknown Customer"
            phone = phone or ""
            address = address or "Address not available"

            orders.append({
                "id": order_id,
                "referenceNumber": reference_number, # Add it to the response
                "customerName": customer_name,
                "phone": phone,
                "address": address,
                "orderedAt": row[2].strftime("%Y-%m-%d %H:%M:%S"),
                "currentStatus": row[3].lower().replace(" ", ""),
                "paymentMethod": row[4],
                "total": float(row[5]) if row[5] else 0,
                "notes": row[13],
                "items": item_list,
            })

        return orders

    finally:
        await cursor.close()
        await conn.close()

# --- GET Delivery Orders with Items + Delivery Info ---
@router.get("/admin/delivery/orders")
async def get_delivery_orders(token: str = Depends(oauth2_scheme)):
    await validate_token_and_roles(token, ["admin", "staff"])

    conn = await get_db_connection()
    cursor = await conn.cursor()

    try:
        await cursor.execute("""
            SELECT
                o.OrderID, o.UserName, o.OrderDate, o.Status, o.PaymentMethod,
                o.TotalAmount, di.FirstName, di.MiddleName, di.LastName,
                di.PhoneNumber, di.Address, di.City, di.Province, di.Notes, di.Landmark,
                             o.AssignedRiderID
            FROM Orders o
            LEFT JOIN DeliveryInfo di ON o.OrderID = di.OrderID
            WHERE o.OrderType = 'Delivery'
            ORDER BY o.OrderDate DESC
        """)
        rows = await cursor.fetchall()

        orders = []
        for row in rows:
            order_id = row[0]
            assigned_rider_id = row[15]   # ✅ make sure to define it here

            # Fetch items
            await cursor.execute("""
                SELECT OrderItemID, ProductName, Quantity, Price
                FROM OrderItems
                WHERE OrderID = ?
            """, (order_id,))
            items = await cursor.fetchall()

            item_list = []
            for item in items:
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
                    "addons": addons_list
                })

            rider_info = None
            if assigned_rider_id:
                # call Auth service para kunin rider details
                try:
                    async with httpx.AsyncClient() as client:
                        r = await client.get(f"http://localhost:4000/users/riders/{assigned_rider_id}")
                        if r.status_code == 200:
                            rider_info = r.json()
                except Exception as e:
                    logger.warning(f"Failed to fetch rider info for {assigned_rider_id}: {e}")

            # Handle None values for customer name
            first_name = row[6] or ""
            middle_name = row[7] or ""
            last_name = row[8] or ""
            customer_name = f"{first_name} {middle_name} {last_name}".strip()

            # Handle phone number
            phone_number = row[9] if row[9] else None

            # Handle address with fallback
            address_parts = [row[10], row[11], row[12]]
            address = ", ".join(filter(None, address_parts))
            if not address:
                address = "Address not available"

            orders.append({
                "id": order_id,
                "customerName": customer_name,
                "phone": phone_number,
                "address": address,
                "orderedAt": row[2].strftime("%Y-%m-%d %H:%M:%S"),
                "currentStatus": row[3].lower().replace(" ", ""),  # e.g. Pending -> pending
                "paymentMethod": row[4],
                "total": float(row[5]) if row[5] else 0,
                "notes": row[13],
                "items": item_list,
                "assignedRider": {
                    "id": assigned_rider_id,
                    "fullName": rider_info["FullName"] if rider_info else None,
                    "phone": rider_info["Phone"] if rider_info else None
                } if assigned_rider_id else None
            })

        return orders

    except Exception as e:
        logger.error(f"Error fetching delivery orders: {e}", exc_info=True)
        raise HTTPException(status_code=500, detail="Failed to fetch delivery orders")

    finally:
        await cursor.close()
        await conn.close()

@router.get("/orders/{order_id}/reference-number")
async def get_reference_number(order_id: int, token: str = Depends(oauth2_scheme)):
    await validate_token_and_roles(token, ["user", "admin", "rider"])

    conn = await get_db_connection()
    cursor = await conn.cursor()

    try:
        await cursor.execute(
            "SELECT ReferenceNumber FROM Orders WHERE OrderID = ?", (order_id,)
        )
        row = await cursor.fetchone()

        if not row:
            raise HTTPException(
                status_code=404, detail="Order not found"
            )

        return {"ReferenceNumber": row[0]}

    except Exception as e:
        logger.error(f"Error retrieving reference number: {e}")
        raise HTTPException(
            status_code=500, detail="Failed to retrieve reference number"
        )

    finally:
        await cursor.close()
        await conn.close()
