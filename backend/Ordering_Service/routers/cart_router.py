from fastapi import APIRouter, Depends, HTTPException, status
from fastapi.security import OAuth2PasswordBearer
from pydantic import BaseModel
from typing import List, Optional
import logging
import httpx

from database import get_db_connection

logger = logging.getLogger(__name__)

router = APIRouter(prefix="/usercart", tags=["User Cart"])


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


class CartItem(BaseModel):
    username: str
    product_id: int
    product_name: str
    product_type: str
    product_category: str
    quantity: int
    price: float
    product_image: Optional[str] = None
    max_quantity: int
    addons: Optional[List[dict]] = []


class CartItemResponse(BaseModel):
    cart_item_id: int
    username: str
    product_id: int
    product_name: str
    product_type: str
    product_category: str
    quantity: int
    price: float
    product_image: Optional[str] = None
    max_quantity: int
    addons: List[dict]


class AddCartItemRequest(BaseModel):
    product_id: int
    product_name: str
    product_type: str
    product_category: str
    quantity: int
    price: float
    product_image: Optional[str] = None
    max_quantity: int
    addons: Optional[List[dict]] = []


class UpdateCartItemRequest(BaseModel):
    quantity: Optional[int] = None
    price: Optional[float] = None
    product_image: Optional[str] = None


class AddonRequest(BaseModel):
    addon_name: str
    price: float
    addon_id: Optional[int] = None


@router.get("/{username}", response_model=List[CartItemResponse])
async def get_cart(username: str, token: str = Depends(oauth2_scheme)):
    user_data = await validate_token_and_roles(token, ["user", "admin", "staff"])
    if user_data.get("username") != username and user_data.get("userRole") not in ["admin", "staff"]:
        raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="Access denied.")

    conn = await get_db_connection()
    cursor = await conn.cursor()
    try:
        await cursor.execute("""
            SELECT ci.CartItemID, ci.Username, ci.ProductID, ci.ProductName, ci.ProductType,
                   ci.ProductCategory, ci.Quantity, ci.Price, ci.ProductImage, ci.MaxQuantity
            FROM cartItems ci
            WHERE ci.Username = ?
        """, (username,))
        items = await cursor.fetchall()

        cart = []
        for item in items:
            cart_item_id = item[0]
            await cursor.execute("""
                SELECT AddonName, Price, AddonID
                FROM cartItemAddons
                WHERE CartItemID = ?
            """, (cart_item_id,))
            addons = await cursor.fetchall()
            addons_list = [{"addon_name": a[0], "price": float(a[1]), "addon_id": a[2]} for a in addons]

            cart.append(CartItemResponse(
                cart_item_id=cart_item_id,
                username=item[1],
                product_id=item[2],
                product_name=item[3],
                product_type=item[4],
                product_category=item[5],
                quantity=item[6],
                price=float(item[7]),
                product_image=item[8],
                max_quantity=item[9],
                addons=addons_list
            ))
        return cart
    except Exception as e:
        logger.error(f"Error fetching cart for {username}: {e}")
        raise HTTPException(status_code=500, detail="Failed to fetch cart")
    finally:
        await cursor.close()
        await conn.close()


@router.post("/add", status_code=status.HTTP_201_CREATED)
async def add_to_cart(request: AddCartItemRequest, token: str = Depends(oauth2_scheme)):
    user_data = await validate_token_and_roles(token, ["user", "admin", "staff"])
    username = user_data.get("username")

    conn = await get_db_connection()
    cursor = await conn.cursor()
    try:
        # --- Step 1: total quantity across ALL variants of this product
        await cursor.execute("""
            SELECT COALESCE(SUM(Quantity), 0)
            FROM cartItems
            WHERE Username = ? AND ProductID = ?
        """, (username, request.product_id))
        total_in_cart = (await cursor.fetchone())[0]

        # if max reached already -> block immediately
        if request.max_quantity > 0 and total_in_cart >= request.max_quantity:
            raise HTTPException(
                status_code=400,
                detail=f"Cannot add more than {request.max_quantity} of this product to cart (including all addon variations)."
            )

        # --- Step 2: Normalize addon signature for variant match
        addon_names = sorted([a["addon_name"] for a in (request.addons or [])])
        addon_signature = ",".join(addon_names) if addon_names else ""

        # --- Step 3: Find if same product+addon combo already exists
        await cursor.execute("""
            SELECT ci.CartItemID, ci.Quantity,
                   STUFF((SELECT ',' + ca.AddonName
                          FROM cartItemAddons ca
                          WHERE ca.CartItemID = ci.CartItemID
                          ORDER BY ca.AddonName
                          FOR XML PATH('')), 1, 1, '') AS AddonList
            FROM cartItems ci
            WHERE ci.Username = ? AND ci.ProductID = ?
        """, (username, request.product_id))
        rows = await cursor.fetchall()

        existing = None
        for row in rows:
            cart_item_id, qty, addons = row
            if (addons or "") == addon_signature:
                existing = (cart_item_id, qty)
                break

        # --- Step 4: enforce max limit including this add
        if total_in_cart + request.quantity > request.max_quantity:
            raise HTTPException(
                status_code=400,
                detail=f"Cannot add more than {request.max_quantity} of this product to cart (including all addon variations)."
            )

        # --- Step 5: Update or insert
        if existing:
            cart_item_id, current_qty = existing
            new_qty = current_qty + request.quantity
            if new_qty + (total_in_cart - current_qty) > request.max_quantity:
                raise HTTPException(
                    status_code=400,
                    detail=f"Cannot add more than {request.max_quantity} of this product to cart (including all addon variations)."
                )
            await cursor.execute(
                "UPDATE cartItems SET Quantity = ? WHERE CartItemID = ?",
                (new_qty, cart_item_id)
            )
        else:
            await cursor.execute("""
                INSERT INTO cartItems (Username, ProductID, ProductName, ProductType,
                                       ProductCategory, Quantity, Price, ProductImage, MaxQuantity)
                OUTPUT INSERTED.CartItemID
                VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
            """, (
                username, request.product_id, request.product_name,
                request.product_type, request.product_category,
                request.quantity, request.price, request.product_image,
                request.max_quantity
            ))
            cart_item_id = (await cursor.fetchone())[0]

            for addon in (request.addons or []):
                await cursor.execute("""
                    INSERT INTO cartItemAddons (CartItemID, AddonName, Price, AddonID)
                    VALUES (?, ?, ?, ?)
                """, (cart_item_id, addon["addon_name"], addon["price"], addon.get("addon_id")))

        await conn.commit()
        logger.info(f"[Cart Debug] user={username}, product={request.product_id}, total_in_cart={total_in_cart}, after_add={total_in_cart + request.quantity}, max={request.max_quantity}")
        return {"message": "Item added to cart", "cart_item_id": cart_item_id}

    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Error adding to cart: {e}")
        raise HTTPException(status_code=500, detail="Failed to add item to cart")
    finally:
        await cursor.close()
        await conn.close()



@router.put("/update/{cart_item_id}")
async def update_cart_item(cart_item_id: int, request: UpdateCartItemRequest, token: str = Depends(oauth2_scheme)):
    user_data = await validate_token_and_roles(token, ["user", "admin", "staff"])
    username = user_data.get("username")

    conn = await get_db_connection()
    cursor = await conn.cursor()
    try:
        # Verify ownership
        await cursor.execute("SELECT Username FROM cartItems WHERE CartItemID = ?", (cart_item_id,))
        item = await cursor.fetchone()
        if not item or item[0] != username:
            raise HTTPException(status_code=404, detail="Cart item not found")

        update_fields = []
        params = []
        if request.quantity is not None:
            update_fields.append("Quantity = ?")
            params.append(request.quantity)
        if request.price is not None:
            update_fields.append("Price = ?")
            params.append(request.price)
        if request.product_image is not None:
            update_fields.append("ProductImage = ?")
            params.append(request.product_image)

        if update_fields:
            query = f"UPDATE cartItems SET {', '.join(update_fields)} WHERE CartItemID = ?"
            params.append(cart_item_id)
            await cursor.execute(query, params)
            await conn.commit()

        return {"message": "Cart item updated"}
    except Exception as e:
        logger.error(f"Error updating cart item {cart_item_id}: {e}")
        raise HTTPException(status_code=500, detail="Failed to update cart item")
    finally:
        await cursor.close()
        await conn.close()


@router.delete("/remove/{cart_item_id}")
async def remove_from_cart(cart_item_id: int, token: str = Depends(oauth2_scheme)):
    user_data = await validate_token_and_roles(token, ["user", "admin", "staff"])
    username = user_data.get("username")

    conn = await get_db_connection()
    cursor = await conn.cursor()
    try:
        # Verify ownership
        await cursor.execute("SELECT Username FROM cartItems WHERE CartItemID = ?", (cart_item_id,))
        item = await cursor.fetchone()
        if not item or item[0] != username:
            raise HTTPException(status_code=404, detail="Cart item not found")

        # Delete addons first
        await cursor.execute("DELETE FROM cartItemAddons WHERE CartItemID = ?", (cart_item_id,))
        # Delete item
        await cursor.execute("DELETE FROM cartItems WHERE CartItemID = ?", (cart_item_id,))
        await conn.commit()

        return {"message": "Item removed from cart"}
    except Exception as e:
        logger.error(f"Error removing cart item {cart_item_id}: {e}")
        raise HTTPException(status_code=500, detail="Failed to remove item from cart")
    finally:
        await cursor.close()
        await conn.close()


@router.delete("/clear/{username}")
async def clear_cart(username: str, token: str = Depends(oauth2_scheme)):
    user_data = await validate_token_and_roles(token, ["user", "admin", "staff"])
    if user_data.get("username") != username and user_data.get("userRole") not in ["admin", "staff"]:
        raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="Access denied.")

    conn = await get_db_connection()
    cursor = await conn.cursor()
    try:
        # Delete addons
        await cursor.execute("""
            DELETE FROM cartItemAddons WHERE CartItemID IN (
                SELECT CartItemID FROM cartItems WHERE Username = ?
            )
        """, (username,))
        # Delete items
        await cursor.execute("DELETE FROM cartItems WHERE Username = ?", (username,))
        await conn.commit()

        return {"message": "Cart cleared"}
    except Exception as e:
        logger.error(f"Error clearing cart for {username}: {e}")
        raise HTTPException(status_code=500, detail="Failed to clear cart")
    finally:
        await cursor.close()
        await conn.close()


@router.post("/addons/{cart_item_id}")
async def add_addons_to_cart_item(cart_item_id: int, addons: List[AddonRequest], token: str = Depends(oauth2_scheme)):
    user_data = await validate_token_and_roles(token, ["user", "admin", "staff"])
    username = user_data.get("username")

    conn = await get_db_connection()
    cursor = await conn.cursor()
    try:
        # Verify ownership
        await cursor.execute("SELECT Username FROM cartItems WHERE CartItemID = ?", (cart_item_id,))
        item = await cursor.fetchone()
        if not item or item[0] != username:
            raise HTTPException(status_code=404, detail="Cart item not found")

        for addon in addons:
            await cursor.execute("""
                INSERT INTO cartItemAddons (CartItemID, AddonName, Price, AddonID)
                VALUES (?, ?, ?, ?)
            """, (cart_item_id, addon.addon_name, addon.price, addon.addon_id))

        await conn.commit()
        return {"message": "Addons added to cart item"}
    except Exception as e:
        logger.error(f"Error adding addons to cart item {cart_item_id}: {e}")
        raise HTTPException(status_code=500, detail="Failed to add addons")
    finally:
        await cursor.close()
        await conn.close()
