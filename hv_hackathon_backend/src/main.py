from fastapi import FastAPI, HTTPException, File, UploadFile, Form
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import FileResponse
import os
from contextlib import asynccontextmanager
from typing import Optional
from src.rag_engine import RAGEngine, JUDGEMENTS_PDF_DIR, ACTS_PDF_DIR
from src.models import (
    AnalysisResponse, CaseAnalysisRequest, RetrievedCase, RetrievedAct, 
    ChatRequest, ChatResponse, Citation, AdvocateProfile
)
from src.llm_client import LLMClient

rag_engine = RAGEngine()
llm_client = LLMClient()

@asynccontextmanager
async def lifespan(app: FastAPI):
    # Load data and embeddings on startup
    rag_engine.load_data()
    rag_engine.initialize_embeddings()
    yield
    # Clean up if needed

app = FastAPI(lifespan=lifespan)

# Enable CORS for frontend
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],  # In production, specify exact origins like ["http://localhost:5173"]
    allow_credentials=True,
    allow_methods=["*"],  # Allows all methods including OPTIONS
    allow_headers=["*"],  # Allows all headers
)

@app.post("/analyze", response_model=AnalysisResponse)
async def analyze_case(request: CaseAnalysisRequest):
    try:
        # 1. Classify and extract details using Gemini
        categories = rag_engine.get_categories()
        classification_result = llm_client.classify_case(request.description, categories)
        
        category = classification_result['category']
        case_detail = classification_result['case_detail']
        opponent_advocate = classification_result['opponent_advocate']
        
        # Get opponent advocate profile if matched
        opponent_advocate_profile = None
        if opponent_advocate:
            profile_data = llm_client.get_advocate_profile(opponent_advocate)
            if profile_data:
                opponent_advocate_profile = AdvocateProfile(
                    advocate_name=profile_data['advocate_name'],
                    total_cases=profile_data['total_cases'],
                    wins=profile_data['wins'],
                    losses=profile_data['losses'],
                    unclear=profile_data.get('unclear', 0),
                    win_rate=profile_data['win_rate'],
                    primary_tactic_tag=profile_data['primary_tactic_tag'],
                    strategic_insight=profile_data['strategic_insight'],
                    all_original_names=profile_data.get('all_original_names', [])
                )
        
        # 2. Search using the extracted case detail
        results = rag_engine.search(case_detail, category=category)
        
        # 3. Get Full Text for Report
        documents = rag_engine.get_full_text_for_results(results)
        
        # 4. Generate Report
        report_data = llm_client.generate_report(case_detail, documents)
        
        # 5. Format response
        retrieved_cases = []
        for res in results['cases']:
            j = res['judgement']
            retrieved_cases.append(RetrievedCase(
                case_summary=j.get('case_summary', ''),
                category=j.get('case_details', {}).get('category', ''),
                winning_arguments=j.get('legal_arguments', {}).get('winning_arguments'),
                outcome=j.get('outcome'),
                similarity_score=res['score'],
                file_name=res.get('file_name'),
                exact_citations_with_line_breaks=j.get('exact_citations_with_line_breaks'),
                dates=j.get('dates'),
                judicial_bench=j.get('judicial_bench'),
                legal_citations_standardized=j.get('legal_citations_standardized')
            ))
            
        retrieved_acts = []
        for res in results['acts']:
            a = res['act']
            retrieved_acts.append(RetrievedAct(
                act_title=a.get('act_identification', {}).get('act_title', ''),
                section_title="See Act details",
                description=a.get('act_overview', {}).get('purpose', ''),
                similarity_score=res['score'],
                file_name=res.get('file_name'),
                amendments_and_related_acts=a.get('amendments_and_related_acts'),
                offences_and_penalties=a.get('key_provisions', {}).get('offences_and_penalties'),
                key_sections=a.get('key_provisions', {}).get('key_sections')
            ))
            
        citations = [Citation(**c) for c in report_data.get("citations", [])]
            
        return AnalysisResponse(
            category=category,
            case_detail=case_detail,
            opponent_advocate=opponent_advocate,
            opponent_advocate_profile=opponent_advocate_profile,
            relevant_cases=retrieved_cases,
            relevant_acts=retrieved_acts,
            report=report_data.get("report_markdown", ""),
            citations=citations
        )
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

@app.post("/chat", response_model=ChatResponse)
async def chat(request: ChatRequest):
    try:
        # Construct context string
        context_str = ""
        if request.context:
            context_str += f"Identified Category: {request.context.category}\n\n"
            context_str += "Relevant Previous Cases:\n"
            for case in request.context.relevant_cases:
                context_str += f"- Summary: {case.case_summary}\n  Outcome: {case.outcome}\n\n"
            
            context_str += "Relevant Acts:\n"
            for act in request.context.relevant_acts:
                context_str += f"- Act: {act.act_title}\n  Purpose: {act.description}\n\n"
            
            if request.context.report:
                context_str += f"Generated Report:\n{request.context.report}\n\n"
            
            if request.context.citations:
                context_str += "Citations:\n"
                for cit in request.context.citations:
                    context_str += f"- [{cit.citation_id}] {cit.file_name}: {cit.quoted_text}\n"
                
        response = llm_client.chat(request.message, request.history, context_str)
        return ChatResponse(response=response)
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

@app.get("/documents/{filename}")
async def get_document(filename: str):
    # Check judgements
    judgement_path = os.path.join(JUDGEMENTS_PDF_DIR, filename)
    if os.path.exists(judgement_path):
        return FileResponse(judgement_path)
    
    # Check acts
    act_path = os.path.join(ACTS_PDF_DIR, filename)
    if os.path.exists(act_path):
        return FileResponse(act_path)
        
    raise HTTPException(status_code=404, detail="Document not found")

if __name__ == "__main__":
    import uvicorn
    uvicorn.run(app, host="0.0.0.0", port=8000)
