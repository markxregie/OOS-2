from fastapi import APIRouter, Depends, HTTPException, status
from fastapi.security import OAuth2PasswordBearer
from pydantic import BaseModel
from typing import List, Optional
import httpx
import logging
import base64
import os
import json
from dotenv import load_dotenv

# ---- LOAD ENV ----
load_dotenv()

# ---- PAYMONGO CONFIG ----
PAYMONGO_SECRET_KEY = os.getenv("PAYMONGO_SECRET_KEY")
if not PAYMONGO_SECRET_KEY:
    raise RuntimeError("PAYMONGO_SECRET_KEY not found in environment")

PAYMONGO_API_URL = "https://api.paymongo.com/v1/checkout_sessions"

# ---- FASTAPI SETUP ----
logger = logging.getLogger(__name__)
router = APIRouter()
oauth2_scheme = OAuth2PasswordBearer(tokenUrl="http://localhost:4000/auth/token")

# ---- AUTH VALIDATOR ----
async def validate_token_and_roles(token: str, allowed_roles: List[str]):
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

# ---- MODELS ----
class CheckoutItem(BaseModel):
    name: str
    quantity: int
    price: float
    addons: Optional[List[str]] = []

class CheckoutRequest(BaseModel):
    reference_number: str
    redirect_url: str
    items: List[CheckoutItem]
    delivery_fee: float
    order_type: str
    user_data: Optional[dict] = None
    discount: Optional[float] = 0.0  # Add discount field

class CartItem(BaseModel):
    product_id: int
    product_name: str
    product_type: Optional[str] = None
    product_category: Optional[str] = None
    quantity: int
    price: float
    addons: Optional[List[dict]] = []
    ordernotes: Optional[str] = None

class DeliveryInfo(BaseModel):
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

class ConfirmPaymentRequest(BaseModel):
    username: str
    order_type: str
    payment_method: str
    subtotal: float
    delivery_fee: float
    total: float
    notes: Optional[str] = None
    cart_items: List[CartItem]
    delivery_info: Optional[DeliveryInfo] = None
    reference_number: Optional[str] = None
    total_discount: Optional[float] = 0.0  # Add discount field

# ---- CHECKOUT ENDPOINT ----
@router.post("/create-checkout")
async def create_checkout_session(payload: CheckoutRequest, token: str = Depends(oauth2_scheme)):
    # Debug: Log received items and their addons
    for idx, item in enumerate(payload.items):
        logger.info(f"[CHECKOUT] Item {idx}: {item.name} | Addons: {getattr(item, 'addons', None)}")
    await validate_token_and_roles(token, ["user", "admin", "staff"])

    # Fetch user profile for customer info
    PROFILE_URL = "http://localhost:4000/users/profile"
    customer_id = None
    name, email, phone = "User", "", ""

    async with httpx.AsyncClient() as client:
        try:
            response = await client.get(PROFILE_URL, headers={"Authorization": f"Bearer {token}"})
            response.raise_for_status()
            profile_data = response.json()

            first_name = profile_data.get("firstName", "")
            last_name = profile_data.get("lastName", "")
            email = profile_data.get("email", "")
            phone = profile_data.get("phoneNumber", profile_data.get("phone", ""))
            name = f"{first_name} {last_name}".strip() or "User"

            # Create PayMongo customer if info is available
            if name and email:
                customer_body = {
                    "data": {
                        "attributes": {
                            "name": name,
                            "email": email,
                            "phone": phone
                        }
                    }
                }
                encoded_key = base64.b64encode(f"{PAYMONGO_SECRET_KEY}:".encode()).decode()
                customer_headers = {
                    "accept": "application/json",
                    "authorization": f"Basic {encoded_key}",
                    "content-type": "application/json",
                }

                customer_response = await client.post(
                    "https://api.paymongo.com/v1/customers",
                    headers=customer_headers,
                    json=customer_body
                )
                customer_response.raise_for_status()
                customer_data = customer_response.json()
                customer_id = customer_data["data"]["id"]

        except Exception as e:
            logger.warning(f"Failed to fetch profile or create customer: {e}")
            customer_id = None

    try:
        # Calculate total amount from items and delivery fee, minus discount
        subtotal = sum(item.price * item.quantity for item in payload.items)
        discount = payload.discount or 0.0
        
        logger.info(f"[CHECKOUT] Subtotal: ₱{subtotal}, Delivery: ₱{payload.delivery_fee}, Discount: ₱{discount}")

        # Create line items for each cart item
        line_items = []
        
        # Calculate exact subtotal after discount
        subtotal_after_discount = subtotal - discount
        
        # Calculate discount ratio if there's a discount
        # We'll proportionally reduce item prices since PayMongo doesn't support negative line items
        discount_ratio = 1.0
        if discount > 0 and subtotal > 0:
            discount_ratio = (subtotal - discount) / subtotal
            logger.info(f"[CHECKOUT] Applying discount ratio: {discount_ratio:.4f}")
        
        # Track accumulated centavos for rounding correction
        accumulated_centavos = 0
        
        for idx, item in enumerate(payload.items):
            # Apply discount ratio to item price (this is the TOTAL for the line item)
            original_price = item.price
            discounted_price = original_price * discount_ratio
            
            # PayMongo divides amount by quantity for display, so we need to:
            # 1. Calculate per-unit discounted price
            # 2. Round to centavos
            # 3. Multiply by quantity
            # This ensures PayMongo's display matches our calculation
            
            per_unit_price = discounted_price / item.quantity
            
            # For all items except the last one, use standard rounding
            if idx < len(payload.items) - 1:
                per_unit_centavos = round(per_unit_price * 100)
                item_amount = per_unit_centavos * item.quantity
                # Track the difference between ideal and rounded
                ideal_total = discounted_price * 100
                accumulated_centavos += ideal_total - item_amount
            else:
                # For the last item, adjust to ensure exact total
                per_unit_centavos = round(per_unit_price * 100)
                item_amount = per_unit_centavos * item.quantity + round(accumulated_centavos)
            
            # Build item name with embedded bullet list of addons (PayMongo shows only name)
            item_name_parts = [item.name]
            if discount > 0:
                item_name_parts[0] = f"{item.name} 🎉"  # Add emoji to indicate discount applied
            
            if item.addons and len(item.addons) > 0:
                # One newline before list; PayMongo may render as space if newline unsupported
                for addon in item.addons:
                    if isinstance(addon, str):
                        item_name_parts.append(f"• + {addon}")
                    elif isinstance(addon, dict):
                        a_name = addon.get("addon_name") or addon.get("AddOnName") or addon.get("name") or "Addon"
                        a_price = addon.get("price") or addon.get("Price") or 0
                        item_name_parts.append(f"• + {a_name} (₱{a_price})")
                    else:
                        item_name_parts.append(f"• + {str(addon)}")
            # Join with newline; fallback to ' | ' if newline stripped by gateway handled client-side
            item_name = "\n".join(item_name_parts)
            logger.info(f"[CHECKOUT] Item {idx+1}/{len(payload.items)}: {item.name}, Original: ₱{original_price}, Discounted: ₱{discounted_price:.2f}, Centavos: {item_amount}")
            
            line_items.append({
                "name": item_name,
                "amount": item_amount,
                "currency": "PHP",
                "description": f"Quantity: {item.quantity}",
                "quantity": item.quantity
            })

        # Add delivery fee as a separate line item if applicable
        if payload.delivery_fee > 0:
            delivery_amount = int(payload.delivery_fee * 100)
            line_items.append({
                "name": "Delivery Fee",
                "amount": delivery_amount,
                "currency": "PHP",
                "description": "Delivery charges",
                "quantity": 1
            })
        
        # Calculate final total from line items (should match our expected total)
        total_amount = subtotal * discount_ratio + payload.delivery_fee
        amount_in_centavos = int(total_amount * 100)
        logger.info(f"[CHECKOUT] Final total: ₱{total_amount:.2f}")

        encoded_key = base64.b64encode(f"{PAYMONGO_SECRET_KEY}:".encode()).decode()

        headers = {
            "accept": "application/json",
            "authorization": f"Basic {encoded_key}",
            "content-type": "application/json",
        }

        attributes = {
            "billing": {
                "name": name,
                "email": email,
                "phone": phone
            },
            "send_email_receipt": False,
            "show_description": True,
            "show_line_items": True,
            "line_items": line_items,
            "description": f"OOS Order - {payload.reference_number}" + (f" (Discount: ₱{discount:.2f})" if discount > 0 else ""),
            "reference_number": payload.reference_number,
            "payment_method_types": ["gcash", "paymaya", "card"],
            "success_url": f"{payload.redirect_url}?status=success",
            "cancel_url": f"{payload.redirect_url}?status=cancel"
        }

        if customer_id and name and email:
            attributes["customer"] = customer_id

        body = {
            "data": {
                "attributes": attributes
            }
        }

        async with httpx.AsyncClient() as client:
            logger.info(f"[CHECKOUT] Final line_items payload: {json.dumps(line_items, indent=2)}")
            response = await client.post(PAYMONGO_API_URL, headers=headers, json=body)
            response.raise_for_status()

        data = response.json()
        checkout_url = data["data"]["attributes"]["checkout_url"]
        return {"checkout_url": checkout_url}

    except httpx.HTTPStatusError as e:
        logger.error(f"PayMongo error: {e.response.status_code} - {e.response.text}")
        raise HTTPException(status_code=e.response.status_code, detail="PayMongo payment error.")
    except Exception as e:
        logger.error(f"Unexpected error creating checkout: {str(e)}")
        raise HTTPException(status_code=500, detail="Unexpected server error.")



# ---- CONFIRM PAYMENT ENDPOINT ----
@router.post("/confirm-payment")
async def confirm_payment(payload: ConfirmPaymentRequest, token: str = Depends(oauth2_scheme)):
    await validate_token_and_roles(token, ["user", "admin", "staff"])

    async with httpx.AsyncClient() as client:
        try:
            # Step 1: Add cart items
            for item in payload.cart_items:
                cart_payload = {
                    "username": payload.username,
                    "product_id": item.product_id,
                    "product_name": item.product_name,
                    "product_type": item.product_type,
                    "product_category": item.product_category,
                    "quantity": item.quantity,
                    "price": item.price,
                    "order_type": payload.order_type,
                    "addons": item.addons,
                    "ordernotes": item.ordernotes
                }
                cart_response = await client.post(
                    "http://localhost:7004/cart/",
                    json=cart_payload,
                    headers={"Authorization": f"Bearer {token}"}
                )
                cart_response.raise_for_status()

            # Step 2: Finalize order
            finalize_response = await client.post(
                f"http://localhost:7004/cart/finalize?username={payload.username}",
                headers={"Authorization": f"Bearer {token}"}
            )
            if finalize_response.status_code == 404:
                logger.error(f"No pending order found for user {payload.username}")
                raise HTTPException(status_code=404, detail=f"No pending order found for user {payload.username}")
            finalize_response.raise_for_status()

            # Step 3: Save delivery info
            if payload.delivery_info:
                delivery_info_payload = {
                    "FirstName": payload.delivery_info.FirstName,
                    "MiddleName": payload.delivery_info.MiddleName,
                    "LastName": payload.delivery_info.LastName,
                    "Address": payload.delivery_info.Address,
                    "City": payload.delivery_info.City,
                    "Province": payload.delivery_info.Province,
                    "Landmark": payload.delivery_info.Landmark,
                    "EmailAddress": payload.delivery_info.EmailAddress,
                    "PhoneNumber": payload.delivery_info.PhoneNumber,
                    "Notes": payload.delivery_info.Notes or payload.notes or ""
                }
                delivery_response = await client.post(
                    "http://localhost:7004/delivery/info",
                    json=delivery_info_payload,
                    headers={"Authorization": f"Bearer {token}"}
                )
                delivery_response.raise_for_status()

            # Step 4: Update order payment details
            update_order_payload = {
                "username": payload.username,
                "payment_method": payload.payment_method,
                "subtotal": payload.subtotal,
                "delivery_fee": payload.delivery_fee,
                "total_amount": payload.total,
                "delivery_notes": payload.notes or (payload.delivery_info.Notes if payload.delivery_info else ""),
                "reference_number": payload.reference_number
            }
            update_order_response = await client.put(
                "http://localhost:7004/cart/update-payment",
                json=update_order_payload,
                headers={"Authorization": f"Bearer {token}"}
            )
            update_order_response.raise_for_status()

            return {"message": "Payment confirmed and order placed successfully"}

        except httpx.HTTPStatusError as e:
            logger.error(f"Ordering service error: {e.response.status_code} - {e.response.text} for user {payload.username}")
            raise HTTPException(status_code=e.response.status_code, detail=f"Ordering service error: {e.response.text}")
        except Exception as e:
            logger.error(f"Unexpected error confirming payment: {str(e)}")
            raise HTTPException(status_code=500, detail="Unexpected server error.")

class UpdatePOSStatusRequest(BaseModel):
    newStatus: str

@router.patch("/auth/purchase_orders/online/{order_id}/status")
async def update_pos_order_status(
    order_id: int,
    request: UpdatePOSStatusRequest,
    token: str = Depends(oauth2_scheme)
):
    await validate_token_and_roles(token, ["rider", "admin", "staff", "cashier"])

    from database import get_db_connection  # Assuming shared database.py

    conn = await get_db_connection()
    cursor = await conn.cursor()
    try:
        # Check if the order exists
        await cursor.execute("SELECT OrderID FROM Orders WHERE OrderID = ?", (order_id,))
        order = await cursor.fetchone()
        if not order:
            raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Order not found")

        # Update status to completed
        await cursor.execute(
            "UPDATE Orders SET Status = ? WHERE OrderID = ?",
            (request.newStatus, order_id)
        )

        await conn.commit()

        logger.info(f"Updated POS order status for order {order_id} to {request.newStatus}")
        return {"message": f"POS order status successfully updated to {request.newStatus}"}

    except Exception as e:
        await conn.rollback()
        logger.error(f"Error updating POS order status for OrderID {order_id}: {e}", exc_info=True)
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Failed to update POS order status."
        )
    finally:
        await cursor.close()
        await conn.close()


@router.post("/confirm-payment-and-save-pos")
async def confirm_payment_and_save_pos(payload: ConfirmPaymentRequest, token: str = Depends(oauth2_scheme)):
    """
    Confirms payment and immediately saves the order to POS as PENDING.
    This way, when cashier accepts the order, they only need to update status and deduct inventory.
    """
    await validate_token_and_roles(token, ["user", "admin", "staff"])

    async with httpx.AsyncClient() as client:
        try:
            # NOTE: Items are already in the order from calculate-promos at checkout
            # We don't need to re-add them. Just finalize and update payment details.
            
            # Step 1: Finalize order in OOS (items already exist from calculate-promos)
            finalize_response = await client.post(
                f"http://localhost:7004/cart/finalize?username={payload.username}",
                headers={"Authorization": f"Bearer {token}"}
            )
            if finalize_response.status_code == 404:
                logger.error(f"No pending order found for user {payload.username}")
                raise HTTPException(status_code=404, detail=f"No pending order found for user {payload.username}")
            finalize_response.raise_for_status()
            
            # Get the created order ID from finalize response
            finalize_data = finalize_response.json()
            online_order_id = finalize_data.get("order_id")

            # Step 2: Save delivery info if provided
            if payload.delivery_info:
                delivery_info_payload = {
                    "FirstName": payload.delivery_info.FirstName,
                    "MiddleName": payload.delivery_info.MiddleName,
                    "LastName": payload.delivery_info.LastName,
                    "Address": payload.delivery_info.Address,
                    "City": payload.delivery_info.City,
                    "Province": payload.delivery_info.Province,
                    "Landmark": payload.delivery_info.Landmark,
                    "EmailAddress": payload.delivery_info.EmailAddress,
                    "PhoneNumber": payload.delivery_info.PhoneNumber,
                    "Notes": payload.delivery_info.Notes or payload.notes or ""
                }
                delivery_response = await client.post(
                    "http://localhost:7004/delivery/info",
                    json=delivery_info_payload,
                    headers={"Authorization": f"Bearer {token}"}
                )
                delivery_response.raise_for_status()

            # Step 3: Update order payment details in OOS
            update_order_payload = {
                "username": payload.username,
                "payment_method": payload.payment_method,
                "subtotal": payload.subtotal,
                "delivery_fee": payload.delivery_fee,
                "total_amount": payload.total,
                "delivery_notes": payload.notes or (payload.delivery_info.Notes if payload.delivery_info else ""),
                "reference_number": payload.reference_number,
                "total_discount": payload.total_discount or 0.0  # Include discount
            }
            update_order_response = await client.put(
                "http://localhost:7004/cart/update-payment",
                json=update_order_payload,
                headers={"Authorization": f"Bearer {token}"}
            )
            update_order_response.raise_for_status()

            # Step 4: Immediately save to POS as PENDING
            logger.info(f"=== SAVING ORDER TO POS AS PENDING ===")
            logger.info(f"Online Order ID: {online_order_id}")
            logger.info(f"Reference Number: {payload.reference_number}")
            
            # Get customer name from delivery info or username
            customer_name = payload.username
            if payload.delivery_info:
                customer_name = f"{payload.delivery_info.FirstName} {payload.delivery_info.LastName}".strip()
            
            # POS will generate its own SaleID, so we only send necessary data
            pos_order_payload = {
                "customer_name": customer_name,
                "cashier_name": "System",  # Will be updated when cashier accepts
                "order_type": payload.order_type,
                "payment_method": payload.payment_method,
                "subtotal": payload.subtotal,
                "discount": payload.total_discount or 0.0,  # Include promo discount
                "total_amount": payload.total,
                "status": "pending",  # Save as PENDING initially
                "reference_number": payload.reference_number,
                "items": [
                    {
                        "name": item.product_name,
                        "quantity": item.quantity,
                        "price": item.price,
                        "category": item.product_category,
                        "addons": item.addons or []
                    }
                    for item in payload.cart_items
                ]
            }

            logger.info(f"POS Payload: {json.dumps(pos_order_payload, indent=2)}")

            # Save to POS - FIXED: Proper error handling
            try:
                pos_response = await client.post(
                    "http://localhost:9000/auth/purchase_orders/online-order",
                    json=pos_order_payload,
                    headers={"Authorization": f"Bearer {token}"}
                )
                
                # Check status code instead of .ok attribute
                if pos_response.status_code not in [200, 201]:
                    error_text = pos_response.text
                    logger.error(f"Failed to save to POS: Status {pos_response.status_code} - {error_text}")
                    raise HTTPException(
                        status_code=500,
                        detail=f"Order created in OOS but failed to save to POS: {error_text}"
                    )
                
                pos_data = pos_response.json()
                logger.info(f"✅ Successfully saved to POS as PENDING - SaleID: {pos_data.get('pos_sale_id')}")

                return {
                    "message": "Payment confirmed, order placed successfully, and saved to POS as PENDING",
                    "online_order_id": online_order_id,
                    "pos_sale_id": pos_data.get("pos_sale_id"),
                    "reference_number": payload.reference_number
                }
                
            except httpx.HTTPStatusError as pos_error:
                logger.error(f"POS service HTTP error: {pos_error}")
                raise HTTPException(
                    status_code=500,
                    detail=f"Order created in OOS but POS service error: {str(pos_error)}"
                )

        except httpx.HTTPStatusError as e:
            logger.error(f"Service error: {e.response.status_code} - {e.response.text}")
            raise HTTPException(status_code=e.response.status_code, detail=f"Service error: {e.response.text}")
        except HTTPException:
            # Re-raise HTTPExceptions as-is
            raise
        except Exception as e:
            logger.error(f"Unexpected error: {str(e)}", exc_info=True)
            raise HTTPException(status_code=500, detail=f"Unexpected server error: {str(e)}")