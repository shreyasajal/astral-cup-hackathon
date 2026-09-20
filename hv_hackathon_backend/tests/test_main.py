
from fastapi.testclient import TestClient
from unittest.mock import MagicMock, patch
import pytest
import sys
import os

# Add the project root to sys.path so we can import src
sys.path.append(os.path.dirname(os.path.dirname(os.path.abspath(__file__))))

from src.main import app

@pytest.fixture
def client():
    with patch("src.main.rag_engine") as mock_rag, \
         patch("src.main.llm_client") as mock_llm:
        
        # Setup mocks for startup
        mock_rag.load_data.return_value = None
        mock_rag.initialize_embeddings.return_value = None
        
        # Setup mocks for analyze
        mock_rag.get_categories.return_value = ["Criminal Law", "Civil Law"]
        mock_llm.classify_case.return_value = "Criminal Law"
        
        mock_rag.search.return_value = {
            "cases": [
                {
                    "judgement": {
                        "case_summary": "Summary 1",
                        "case_details": {"category": "Criminal Law"},
                        "legal_arguments": {"winning_arguments": "Arg 1"},
                        "outcome": {"relief_granted": "Granted"}
                    },
                    "score": 0.9
                }
            ],
            "acts": [
                {
                    "act": {
                        "act_identification": {"act_title": "Act 1"},
                        "act_overview": {"purpose": "Purpose 1"}
                    },
                    "score": 0.8
                }
            ]
        }
        
        # Setup mocks for chat
        mock_llm.chat.return_value = "This is a response."

        with TestClient(app) as c:
            yield c

def test_analyze_endpoint(client):
    response = client.post("/analyze", json={"description": "A theft case"})
    assert response.status_code == 200
    data = response.json()
    assert data["category"] == "Criminal Law"
    assert len(data["relevant_cases"]) == 1
    assert data["relevant_cases"][0]["case_summary"] == "Summary 1"
    assert len(data["relevant_acts"]) == 1
    assert data["relevant_acts"][0]["act_title"] == "Act 1"

def test_chat_endpoint(client):
    # Construct a context object similar to what AnalysisResponse returns
    context = {
        "category": "Criminal Law",
        "relevant_cases": [
            {
                "case_summary": "Summary 1",
                "category": "Criminal Law",
                "winning_arguments": "Arg 1",
                "outcome": "Granted",
                "similarity_score": 0.9
            }
        ],
        "relevant_acts": [
            {
                "act_title": "Act 1",
                "section_title": "See Act details",
                "description": "Purpose 1",
                "similarity_score": 0.8
            }
        ]
    }
    
    response = client.post("/chat", json={
        "message": "What is the punishment?",
        "history": [],
        "context": context
    })
    assert response.status_code == 200
    assert response.json()["response"] == "This is a response."

def test_analyze_endpoint_error(client):
    with patch("src.main.llm_client.classify_case", side_effect=Exception("LLM Error")):
        response = client.post("/analyze", json={"description": "A theft case"})
        assert response.status_code == 500
        assert "LLM Error" in response.json()["detail"]

def test_chat_endpoint_error(client):
    with patch("src.main.llm_client.chat", side_effect=Exception("Chat Error")):
        response = client.post("/chat", json={"message": "Hi"})
        assert response.status_code == 500
        assert "Chat Error" in response.json()["detail"]
