from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from database import get_db_connection  # connection checker (optional)
from routers.concerns import router as concerns_router

app = FastAPI(title="Concerns Service")

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

app.include_router(concerns_router)

# Health check (optional)
@app.get("/")
async def root():
    return {"message": "Concerns Service Running"}

# Run locally
if __name__ == "__main__":
    import uvicorn
    uvicorn.run("main:app", host="127.0.0.1", port=7007, reload=True)
