from contextlib import asynccontextmanager
import asyncio

from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

from app.core.config import settings

from app.api.v1.analyze import router as analyze_router
from app.api.v1.chat import router as chat_router
from app.api.v1.investigations import router as investigation_router
from app.api.v1.telemetry import router as telemetry_router

from app.services.detection.background_worker import detection_loop


background_task = None


@asynccontextmanager
async def lifespan(app: FastAPI):
    print(">>> Lifespan started")
    global background_task

    background_task = asyncio.create_task(
        detection_loop()
    )

    yield

    background_task.cancel()

    try:
        await background_task
    except asyncio.CancelledError:
        pass


app = FastAPI(
    title=settings.APP_NAME,
    version=settings.APP_VERSION,
    lifespan=lifespan,
)

# -------------------- Routers --------------------

app.include_router(
    investigation_router,
    prefix="/api/v1",
)

app.include_router(
    analyze_router,
    prefix="/api/v1",
)

app.include_router(
    chat_router,
    prefix="/api/v1",
)

app.include_router(
    telemetry_router,
    prefix="/api/v1",
)

# -------------------- CORS --------------------

origins = [
    "http://localhost:3000",
    "http://127.0.0.1:3000",
    "http://localhost:5173",
    "http://127.0.0.1:5173",
]

app.add_middleware(
    CORSMiddleware,
    allow_origins=origins,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)


# -------------------- Health --------------------

@app.get("/")
def root():
    return {
        "name": settings.APP_NAME,
        "version": settings.APP_VERSION,
        "status": "running",
    }


@app.get("/health")
def health():
    return {
        "status": "healthy",
    }


@app.get("/version")
def version():
    return {
        "version": settings.APP_VERSION,
    }