from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session
from pydantic import BaseModel
from app.dependencies.database import get_db
from app.services.llm.llm_service import LLMService

router = APIRouter(
    prefix="/chat",
    tags=["Chat"],
)

from typing import List, Dict, Any, Optional

class ChatRequest(BaseModel):
    investigation_id: Optional[str] = None
    alert_id: Optional[str] = None
    message: str
    history: List[Dict[str, Any]] = []

class ChatResponse(BaseModel):
    reply: str

@router.post("/", response_model=ChatResponse)
def chat(request: ChatRequest, db: Session = Depends(get_db)):
    try:
        reply = LLMService.chat(
            db=db,
            investigation_id=request.investigation_id,
            alert_id=request.alert_id,
            message=request.message,
            history=request.history,
        )
        return ChatResponse(reply=reply)
    except Exception as e:
        raise HTTPException(
            status_code=500,
            detail=f"Chat processing failed: {str(e)}"
        )
