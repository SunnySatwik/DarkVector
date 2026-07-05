import time

from fastapi import (
    APIRouter,
    Depends,
    Header,
    HTTPException,
    status,
)
from sqlalchemy.orm import Session

from app.core.config import settings
from app.database.session import get_db
from app.schemas.telemetry import (
    TelemetryEventCreate,
    TelemetryEventResponse,
)
from app.services.telemetry import TelemetryIngestionService

router = APIRouter(
    prefix="/telemetry",
    tags=["Telemetry"],
)


@router.post(
    "",
    response_model=TelemetryEventResponse,
    status_code=status.HTTP_201_CREATED,
)
def ingest_telemetry(
    event: TelemetryEventCreate,
    db: Session = Depends(get_db),
    x_api_key: str | None = Header(default=None),
):
    if x_api_key != settings.SENTINEL_API_KEY:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Invalid Sentinel API key",
        )

    start = time.perf_counter()

    stored = TelemetryIngestionService.ingest(
        db=db,
        event=event,
    )

    elapsed = (time.perf_counter() - start) * 1000

    print(
        f"[Telemetry] "
        f"{stored.hostname} | "
        f"{stored.event_type} | "
        f"{elapsed:.2f} ms"
    )

    return stored