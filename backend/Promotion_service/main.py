from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from fastapi.staticfiles import StaticFiles
from database import get_db_connection  # connection checker (optional)
from routers.promotion import router as promotion_router

app = FastAPI(title="Promotion Service")

# CORS config — allow all related frontend & backend origins
app.add_middleware(
    CORSMiddleware,
    allow_origins=[
        "http://localhost:5000",  # OOS frontend
        "http://192.168.100.14:5000",  # OOS LAN frontend

        "http://127.0.0.1:4000",  # Auth service
        "http://localhost:4000",

    ],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Mount uploads directory to serve files
app.mount("/uploads", StaticFiles(directory="uploads"), name="uploads")

app.include_router(promotion_router)

# Health check (optional)
@app.get("/")
async def root():
    return {"message": "Promotion Service Running"}

# Run locally
if __name__ == "__main__":
    import uvicorn
    uvicorn.run("main:app", host="127.0.0.1", port=7010, reload=True)