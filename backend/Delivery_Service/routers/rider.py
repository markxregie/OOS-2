from fastapi import APIRouter, HTTPException
import httpx
import logging

router = APIRouter()
logger = logging.getLogger(__name__)

@router.get("/riders")
async def get_riders_from_auth():
    """
    Fetch riders from the auth service with proper error handling and timeout.
    """
    try:
        # Set a 10-second timeout to prevent hanging
        async with httpx.AsyncClient(timeout=10.0) as client:
            response = await client.get("http://localhost:4000/users/riders")
            
            # Check if response is successful
            if response.status_code != 200:
                logger.error(f"Auth service returned status {response.status_code}: {response.text}")
                raise HTTPException(
                    status_code=502,
                    detail=f"Auth service error: {response.status_code}"
                )
            
            return response.json()
    
    except httpx.TimeoutException:
        logger.error("Auth service request timed out")
        raise HTTPException(
            status_code=504,
            detail="Auth service is not responding (timeout)"
        )
    except httpx.ConnectError as e:
        logger.error(f"Cannot connect to auth service: {str(e)}")
        raise HTTPException(
            status_code=503,
            detail="Auth service is unreachable. Check if port 4000 is running."
        )
    except Exception as e:
        logger.error(f"Error fetching riders: {str(e)}")
        raise HTTPException(
            status_code=500,
            detail=f"Internal server error: {str(e)}"
        )

