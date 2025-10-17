from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from fastapi.staticfiles import StaticFiles
import os
import sys

# Ensure correct import path
sys.path.append(os.path.dirname(__file__))

# Import your routers (we’ll later add routes like notifications.py and websocket.py)
from routers import notification, websocket

app = FastAPI(title="Notification Service")

# Include routers
app.include_router(notification.router, prefix="/notifications", tags=["Notifications"])
app.include_router(websocket.router, prefix="/ws", tags=["WebSocket"])

# Optional: mount static files for uploaded proof images (if needed)
if not os.path.exists("uploads"):
    os.makedirs("uploads")
app.mount("/uploads", StaticFiles(directory="uploads"), name="uploads")

# CORS setup — match your Auth and OOS frontend pattern
app.add_middleware(
    CORSMiddleware,
    allow_origins=[
        "http://localhost:5000",        # OOS frontend
        "http://192.168.100.14:5000",   # OOS LAN frontend

        "http://127.0.0.1:4000",        # Auth service
        "http://localhost:4000",

        "http://127.0.0.1:7001",        # Delivery Service
        "http://localhost:7001",

        "http://127.0.0.1:7004",        # Ordering Service
        "http://localhost:7004",

        "http://127.0.0.1:7005",        # Payment Service
        "http://localhost:7005",

        "http://localhost:4001",        # POS Frontend
        "http://127.0.0.1:4001",
    ],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Health check endpoint
@app.get("/")
async def root():
    return {"message": "Notification Service Running"}

# Run app
if __name__ == "__main__":
    import uvicorn
    uvicorn.run("main:app", port=7002, host="127.0.0.1", reload=True)
