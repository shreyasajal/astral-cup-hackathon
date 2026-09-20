from pydantic import BaseModel
from typing import List, Optional, Dict, Any

class CaseAnalysisRequest(BaseModel):
    description: Optional[str] = None
    pdf_file: Optional[bytes] = None  # PDF file content
    file_name: Optional[str] = None

class AdvocateProfile(BaseModel):
    advocate_name: str
    total_cases: int
    wins: int
    losses: int
    unclear: int = 0
    win_rate: str
    primary_tactic_tag: str
    strategic_insight: str
    all_original_names: List[str] = []

class RetrievedCase(BaseModel):
    case_summary: str
    category: str
    winning_arguments: Optional[str] = None
    outcome: Optional[Dict[str, Any]] = None
    similarity_score: float
    file_name: Optional[str] = None
    exact_citations_with_line_breaks: Optional[Dict[str, Any]] = None
    dates: Optional[Dict[str, Any]] = None
    judicial_bench: Optional[Dict[str, Any]] = None
    legal_citations_standardized: Optional[Dict[str, Any]] = None

class RetrievedAct(BaseModel):
    act_title: str
    section_title: str
    description: str
    similarity_score: float
    file_name: Optional[str] = None
    amendments_and_related_acts: Optional[Dict[str, Any]] = None
    offences_and_penalties: Optional[str] = None
    key_sections: Optional[List[Dict[str, Any]]] = None

class Citation(BaseModel):
    citation_id: str
    file_name: str
    quoted_text: str
    is_verified: bool = False

class AnalysisResponse(BaseModel):
    category: str
    case_detail: str
    opponent_advocate: Optional[str] = None
    opponent_advocate_profile: Optional[AdvocateProfile] = None
    relevant_cases: List[RetrievedCase]
    relevant_acts: List[RetrievedAct]
    report: str
    citations: List[Citation]

class ChatRequest(BaseModel):
    message: str
    history: List[Dict[str, str]] = [] # List of {"role": "user"|"model", "content": "..."}
    context: Optional[AnalysisResponse] = None

class ChatResponse(BaseModel):
    response: str
