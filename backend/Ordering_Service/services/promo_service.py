import httpx
import logging
from typing import List, Dict

logger = logging.getLogger(__name__)

# POS Promo endpoint
POS_PROMO_URL = "http://localhost:9002/api/promotions/active"


async def fetch_active_promos(token: str) -> List[Dict]:
    """
    Fetch ACTIVE promotions from POS.
    This function MUST NOT apply any promo logic.
    """
    headers = {
        "Authorization": f"Bearer {token}"
    }
    
    try:
        async with httpx.AsyncClient(timeout=10.0) as client:
            response = await client.get(POS_PROMO_URL, headers=headers)
            response.raise_for_status()
            return response.json()

    except httpx.RequestError as e:
        logger.error(f"[PROMO] POS unreachable: {e}")
    except Exception as e:
        logger.exception(f"[PROMO] Unexpected error fetching promos: {e}")

    # Fail safe — NO PROMOS
    return []
