from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from routers.trackorder import router as trackorder_router

app = FastAPI(title="Track Order Service")

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

app.include_router(trackorder_router, prefix="/trackorder")

# Health check (optional)
@app.get("/")
async def root():
    return {"message": "Track Order Service Running"}

# Run locally
if __name__ == "__main__":
    import uvicorn
    uvicorn.run("main:app", host="127.0.0.1", port=7008, reload=True)
