from fastapi import APIRouter


router = APIRouter()

import httpx

@router.get("/riders")
async def get_riders_from_auth():
    async with httpx.AsyncClient() as client:
        response = await client.get("http://localhost:4000/users/riders")
        return response.json()

