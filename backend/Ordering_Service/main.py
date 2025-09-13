from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from routers import cart  # router module
from routers import cart, delivery  # router module
from database import get_db_connection  # connection checker (optional)

app = FastAPI(title="Ordering Service")

# CORS config — allow all related frontend & backend origins
app.add_middleware(
    CORSMiddleware,
    allow_origins=[
        "http://localhost:5000",  # OOS frontend
        "http://192.168.100.14:5000",  # OOS LAN frontend

        "http://127.0.0.1:4000",  # Auth service
        "http://localhost:4000",

        "http://127.0.0.1:7004",  # This service itself
        "http://localhost:7004",

        "http://127.0.0.1:8001",  # This service itself
        "http://localhost:8001",
        "http://127.0.0.1:7005",  # This service itself
        "http://localhost:7005",
        "http://localhost:4001", # POS Frontend
    ],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Include cart routes
app.include_router(cart.router, prefix="/cart", tags=["Cart"])
app.include_router(delivery.router, prefix="/delivery")

# Health check (optional)
@app.get("/")
async def root():
    return {"message": "Ordering Service Running"}

# Run locally
if __name__ == "__main__":
    import uvicorn
    uvicorn.run("main:app", host="127.0.0.1", port=7004, reload=True)
