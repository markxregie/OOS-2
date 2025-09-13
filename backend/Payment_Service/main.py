from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

# Import routers
from routes import payment  # <- this is your PayMongo router

app = FastAPI(title="Payment Service")

# Include the payment router
app.include_router(payment.router, prefix='/payment', tags=['payment'])

# CORS configuration
app.add_middleware(
    CORSMiddleware,
    allow_origins=[
        "http://localhost:5000",  # OOS frontend
        "http://192.168.100.14:5000",  # OOS LAN frontend

        "http://127.0.0.1:4000",  # Auth service
        "http://localhost:4000",

        "http://127.0.0.1:7004",  #ordering service
        "http://localhost:7004",

        "http://127.0.0.1:7005",  #ordering service
        "http://localhost:7005",

 
    ],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Run the app (only used when running as a script directly)
if __name__ == "__main__":
    import uvicorn
    uvicorn.run("main:app", port=7005, host="127.0.0.1", reload=True)