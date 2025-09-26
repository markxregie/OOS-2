from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware# router module
from database import get_db_connection  
from routers import rider # connection checker (optional)

app = FastAPI(title="Ordering Service")

# CORS config — allow all related frontend & backend origins
app.add_middleware(
    CORSMiddleware,
    allow_origins=[
        "http://localhost:5000",  # OOS frontend
        "http://192.168.100.14:5000",  # OOS LAN frontend

        "http://127.0.0.1:4000",  # Auth service
        "http://localhost:4000",

        "http://127.0.0.1:7001",  # This service itself
        "http://localhost:7001",

    ],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Include cart routes

app.include_router(rider.router, prefix="/delivery", tags=["riders"])


# Health check (optional)
@app.get("/")
async def root():
    return {"message": "Delivery Service Running"}

# Run locally
if __name__ == "__main__":
    import uvicorn
    uvicorn.run("main:app", host="127.0.0.1", port=7001, reload=True)
