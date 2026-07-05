import sys
from sqlalchemy.orm import Session
from app.dependencies.database import SessionLocal
from app.services.investigation_service import InvestigationService
from app.repositories.timeline_repository import TimelineRepository
from app.services.llm.llm_service import LLMService

db = SessionLocal()
try:
    investigations = InvestigationService.list_investigations(db)
    if not investigations:
        print("No investigations found.")
        sys.exit(0)
    
    inv = investigations[0]
    print(f"Testing report generation for Investigation ID: {inv.investigation_id}")
    
    timeline_repo = TimelineRepository(db)
    timeline_events = timeline_repo.list_for_investigation(inv.investigation_id)
    
    report_content = LLMService.generate_report(db, inv, timeline_events)
    print("\n--- REPORT CONTENT ---")
    print(report_content)
    print("----------------------")
finally:
    db.close()
