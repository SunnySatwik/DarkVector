from __future__ import annotations

import asyncio
import logging

from app.database.session import SessionLocal
from app.services.detection.scheduler import DetectionScheduler

logger = logging.getLogger(__name__)


async def detection_loop() -> None:
    """
    Continuously executes autonomous detection cycles.

    A fresh database session is created for every cycle so database
    sessions are never shared across scheduler executions.
    """

    logger.info("Detection worker started.")

    try:
        while True:
            db = SessionLocal()

            try:
                detection_count = DetectionScheduler.run(db)

                logger.info(
                    "Detection scheduler cycle completed.",
                    extra={
                        "detections_processed": detection_count,
                    },
                )

            except Exception:
                logger.exception(
                    "Detection scheduler cycle failed."
                )

            finally:
                db.close()

            await asyncio.sleep(5)

    except asyncio.CancelledError:
        logger.info("Detection worker stopped.")
        raise