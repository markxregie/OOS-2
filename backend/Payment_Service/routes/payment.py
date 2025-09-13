from fastapi import APIRouter, Depends, HTTPException, status
from fastapi.security import OAuth2PasswordBearer
from pydantic import BaseModel
from typing import List, Optional
import httpx
import logging
import base64
import os
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
class CheckoutRequest(BaseModel):
    amount: float
    description: str
    reference_number: str
    redirect_url: str

class CartItem(BaseModel):
    product_id: int
    product_name: str
    product_type: Optional[str] = None
    product_category: Optional[str] = None
    quantity: int
    price: float

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

# ---- CHECKOUT ENDPOINT ----
@router.post("/create-checkout")
async def create_checkout_session(payload: CheckoutRequest, token: str = Depends(oauth2_scheme)):
    await validate_token_and_roles(token, ["user", "admin", "staff"])
    try:
        amount_in_centavos = int(payload.amount * 100)
        encoded_key = base64.b64encode(f"{PAYMONGO_SECRET_KEY}:".encode()).decode()

        headers = {
            "accept": "application/json",
            "authorization": f"Basic {encoded_key}",
            "content-type": "application/json",
        }

        body = {
            "data": {
                "attributes": {
                    "billing": None,
                    "send_email_receipt": False,
                    "show_description": True,
                    "show_line_items": True,
                    "line_items": [{
                        "name": "OOS Order",
                        "amount": amount_in_centavos,
                        "currency": "PHP",
                        "description": payload.description,
                        "quantity": 1
                    }],
                    "description": payload.description,
                    "reference_number": payload.reference_number,
                    "payment_method_types": ["gcash", "card"],
                    "success_url": f"{payload.redirect_url}?status=success",
                    "cancel_url": f"{payload.redirect_url}?status=cancel"
                }
            }
        }

        async with httpx.AsyncClient() as client:
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
            # Step 1: Save delivery info
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

            # Step 2: Add cart items
            for item in payload.cart_items:
                cart_payload = {
                    "username": payload.username,
                    "product_id": item.product_id,
                    "product_name": item.product_name,
                    "product_type": item.product_type,
                    "product_category": item.product_category,
                    "quantity": item.quantity,
                    "price": item.price,
                    "order_type": payload.order_type
                }
                cart_response = await client.post(
                    "http://localhost:7004/cart/",
                    json=cart_payload,
                    headers={"Authorization": f"Bearer {token}"}
                )
                cart_response.raise_for_status()

            # Step 3: Finalize order
            finalize_response = await client.post(
                f"http://localhost:7004/cart/finalize?username={payload.username}",
                headers={"Authorization": f"Bearer {token}"}
            )
            if finalize_response.status_code == 404:
                logger.error(f"No pending order found for user {payload.username}")
                raise HTTPException(status_code=404, detail=f"No pending order found for user {payload.username}")
            finalize_response.raise_for_status()

            # Step 4: Update order payment details
            update_order_payload = {
                "username": payload.username,
                "payment_method": payload.payment_method,
                "subtotal": payload.subtotal,
                "delivery_fee": payload.delivery_fee,
                "total_amount": payload.total,
                "delivery_notes": payload.notes or (payload.delivery_info.Notes if payload.delivery_info else "")
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