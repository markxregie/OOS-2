from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from routers.predictive import router as predictive_router


app = FastAPI(title="Predictive Service")

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



# Include routers
app.include_router(predictive_router, prefix="/api", tags=["predictive"])

# Health check (optional)
@app.get("/")
async def root():
    return {"message": "Predictive Service Running"}

# Run locally
if __name__ == "__main__":
    import uvicorn
    uvicorn.run("main:app", host="127.0.0.1", port=7009, reload=True)
