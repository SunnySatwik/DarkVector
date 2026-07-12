import logging
import time
from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session
from pydantic import BaseModel, Field
from app.dependencies.database import get_db
from app.services.llm.llm_service import LLMService

router = APIRouter(
    prefix="/chat",
    tags=["Chat"],
)

logger = logging.getLogger("darkvector.api.chat")

from typing import List, Dict, Any, Optional

class ChatRequest(BaseModel):
    investigation_id: Optional[str] = None
    alert_id: Optional[str] = None
    message: str
    history: List[Dict[str, Any]] = Field(default_factory=list)

class ChatResponse(BaseModel):
    reply: str

@router.post("/", response_model=ChatResponse)
def chat(request: ChatRequest, db: Session = Depends(get_db)):
    start_time = time.perf_counter()
    inv_id = request.investigation_id
    try:
        reply = LLMService.chat(
            db=db,
            investigation_id=request.investigation_id,
            alert_id=request.alert_id,
            message=request.message,
            history=request.history,
        )
        elapsed_ms = round((time.perf_counter() - start_time) * 1000)
        logger.info(
            f"[Chat] Success for investigation_id={inv_id} in {elapsed_ms}ms"
        )
        return ChatResponse(reply=reply)
    except Exception as e:
        elapsed_ms = round((time.perf_counter() - start_time) * 1000)
        logger.exception(
            f"[Chat] Failed for investigation_id={inv_id} in {elapsed_ms}ms"
        )
        raise HTTPException(
            status_code=500,
            detail=f"Chat processing failed: {str(e)}"
        )
