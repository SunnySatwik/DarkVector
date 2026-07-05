from __future__ import annotations

import asyncio
import logging

from app.database.session import SessionLocal
from app.services.detection.scheduler import DetectionScheduler

logger = logging.getLogger(__name__)


async def detection_loop():

    logger.info("Detection worker started.")

    while True:
        print(">>> Running detection cycle")
        db = SessionLocal()

        try:

            print("===== Detection Cycle =====")

            count = DetectionScheduler.run(db)

            print(f"Detections: {count}")

        except Exception:

            logger.exception(
                "Detection scheduler failed."
            )

        finally:

            db.close()

        await asyncio.sleep(5)