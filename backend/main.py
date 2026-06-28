from fastapi import FastAPI

from app.core.config import settings
from app.api.v1.events import router as event_router
from app.api.v1.analyze import router as analyze_router
app = FastAPI(
    title=settings.APP_NAME,
    version=settings.APP_VERSION,
)
app.include_router(
    analyze_router,
    prefix="/api/v1",
)
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