import json
import os
import numpy as np
from typing import List, Dict, Tuple
from sklearn.metrics.pairwise import cosine_similarity
from concurrent.futures import ThreadPoolExecutor, as_completed
from src.llm_client import LLMClient
from src.pdf_processor import PDFProcessor


DATA_DIR = os.path.join(os.path.dirname(os.path.dirname(__file__)), "data")
JUDGEMENTS_FILE = os.path.join(DATA_DIR, "supreme_court_judgements_2025.json")
ACTS_FILE = os.path.join(DATA_DIR, "indian_legal_acts_structured.json")
JUDGEMENTS_PDF_DIR = os.path.join(DATA_DIR, "judgements_pdfs")
ACTS_PDF_DIR = os.path.join(DATA_DIR, "acts_pdfs")

EMBEDDINGS_DIR = os.path.join(DATA_DIR, "embeddings")
JUDGEMENTS_EMB_FILE = os.path.join(EMBEDDINGS_DIR, "judgements_embeddings.npy")
ACTS_EMB_FILE = os.path.join(EMBEDDINGS_DIR, "acts_embeddings.npy")
METADATA_FILE = os.path.join(EMBEDDINGS_DIR, "metadata.json")

class RAGEngine:
    def __init__(self):
        self.llm_client = LLMClient()
        self.pdf_processor = PDFProcessor(JUDGEMENTS_PDF_DIR, ACTS_PDF_DIR)
        self.judgements = []
        self.acts = []
        self.judgement_embeddings = None
        self.act_embeddings = None
        self.categories = set()
        
        # Ensure embeddings dir exists
        os.makedirs(EMBEDDINGS_DIR, exist_ok=True)

    def load_data(self):
        print("Loading data...")
        with open(JUDGEMENTS_FILE, 'r') as f:
            self.judgements = json.load(f)['judgements']
            
        with open(ACTS_FILE, 'r') as f:
            self.acts = json.load(f)['legal_acts']
            
        self.categories = sorted(list(set(j['case_details']['category'] for j in self.judgements if j.get('case_details') and j['case_details'].get('category'))))
        print(f"Loaded {len(self.judgements)} judgements and {len(self.acts)} acts.")

    def _generate_judgement_text(self, judgement: Dict) -> str:
        details = judgement.get('case_details', {})
        summary = judgement.get('case_summary', '')
        args = judgement.get('legal_arguments', {}).get('winning_arguments', '')
        return f"Category: {details.get('category', '')}. Summary: {summary}. Arguments: {args}"

    def _generate_act_text(self, act: Dict) -> str:
        ident = act.get('act_identification', {})
        overview = act.get('act_overview', {})
        provisions = act.get('key_provisions', {}).get('key_sections', [])
        
        sections_text = " ".join([f"Section {s.get('section_number', '')}: {s.get('title', '')} - {s.get('description', '')}" for s in provisions])
        
        return f"Act: {ident.get('act_title', '')}. Purpose: {overview.get('purpose', '')}. Sections: {sections_text}"

    def _fetch_embedding(self, text: str) -> List[float]:
        # Truncate to ~8000 chars (approx 2048 tokens)
        vec = self.llm_client.get_embedding(text[:8000])
        if vec:
            return vec
        return [0.0] * 768

    def initialize_embeddings(self):
        # Check if cached
        if os.path.exists(JUDGEMENTS_EMB_FILE) and os.path.exists(ACTS_EMB_FILE):
            print("Loading cached embeddings...")
            self.judgement_embeddings = np.load(JUDGEMENTS_EMB_FILE)
            self.act_embeddings = np.load(ACTS_EMB_FILE)
            print("Embeddings loaded.")
            return

        print("Generating embeddings (this may take a while)...")
        
        # Judgements
        judgement_texts = [self._generate_judgement_text(j) for j in self.judgements]
        print(f"Starting parallel embedding generation for {len(judgement_texts)} judgements with 20 workers...")
        
        judgement_vecs = [None] * len(judgement_texts)
        with ThreadPoolExecutor(max_workers=20) as executor:
            future_to_idx = {executor.submit(self._fetch_embedding, text): i for i, text in enumerate(judgement_texts)}
            for i, future in enumerate(as_completed(future_to_idx)):
                idx = future_to_idx[future]
                judgement_vecs[idx] = future.result()
                if (i + 1) % 20 == 0:
                    print(f"Processed {i + 1}/{len(judgement_texts)} judgements")

        self.judgement_embeddings = np.array(judgement_vecs)
        np.save(JUDGEMENTS_EMB_FILE, self.judgement_embeddings)
        
        # Acts
        act_texts = [self._generate_act_text(a) for a in self.acts]
        print(f"Starting parallel embedding generation for {len(act_texts)} acts with 20 workers...")
        
        act_vecs = [None] * len(act_texts)
        with ThreadPoolExecutor(max_workers=20) as executor:
            future_to_idx = {executor.submit(self._fetch_embedding, text): i for i, text in enumerate(act_texts)}
            for i, future in enumerate(as_completed(future_to_idx)):
                idx = future_to_idx[future]
                act_vecs[idx] = future.result()
                if (i + 1) % 20 == 0:
                    print(f"Processed {i + 1}/{len(act_texts)} acts")
            
        self.act_embeddings = np.array(act_vecs)
        np.save(ACTS_EMB_FILE, self.act_embeddings)
        print("Embeddings generated and saved.")

    def search(self, query_text: str, category: str = None, top_k_cases: int = 3, top_k_acts: int = 3) -> Dict:
        query_vec = self.llm_client.get_embedding(query_text)
        if not query_vec:
            return {"cases": [], "acts": []}
        
        query_vec = np.array(query_vec).reshape(1, -1)
        
        # Search Judgements
        # Filter by category indices first
        if category:
            category_indices = [i for i, j in enumerate(self.judgements) if j.get('case_details', {}).get('category') == category]
            if not category_indices:
                # Fallback to all if category not found exactly
                category_indices = range(len(self.judgements))
        else:
            category_indices = range(len(self.judgements))
            
        relevant_judgement_embeddings = self.judgement_embeddings[category_indices]
        
        if len(relevant_judgement_embeddings) > 0:
            sims = cosine_similarity(query_vec, relevant_judgement_embeddings)[0]
            # Get top k indices relative to the filtered list
            top_k_indices_local = sims.argsort()[-top_k_cases:][::-1]
            
            results_cases = []
            for local_idx in top_k_indices_local:
                global_idx = category_indices[local_idx]
                score = float(sims[local_idx])
                j = self.judgements[global_idx]
                results_cases.append({
                    "judgement": j,
                    "score": score
                })
        else:
            results_cases = []

        # Search Acts
        sims_acts = cosine_similarity(query_vec, self.act_embeddings)[0]
        top_k_acts_indices = sims_acts.argsort()[-top_k_acts:][::-1]
        
        results_acts = []
        for idx in top_k_acts_indices:
            score = float(sims_acts[idx])
            a = self.acts[idx]
            results_acts.append({
                "act": a,
                "score": score
            })
            
        return {"cases": results_cases, "acts": results_acts}

    def get_full_text_for_results(self, results: Dict) -> List[Dict]:
        documents = []
        
        with ThreadPoolExecutor(max_workers=10) as executor:
            futures = []
            
            # Submit Case tasks
            for res in results['cases']:
                futures.append(executor.submit(self._process_case_result, res))
                
            # Submit Act tasks
            for res in results['acts']:
                futures.append(executor.submit(self._process_act_result, res))
                
            for future in as_completed(futures):
                try:
                    result = future.result()
                    if result:
                        documents.append(result)
                except Exception as e:
                    print(f"Error processing result: {e}")
                    
        return documents

    def _process_case_result(self, res):
        j = res['judgement']
        petitioner = j.get('case_identification', {}).get('petitioner_name', '')
        respondent = j.get('case_identification', {}).get('respondent_name', '')
        
        # Try to get filename from metadata using new robust method
        pdf_path = self.pdf_processor.find_judgement_pdf_by_metadata(j)
        
        # Fallback to fuzzy search if metadata fails or file missing
        if not pdf_path:
            pdf_path = self.pdf_processor.find_judgement_pdf(petitioner, respondent)
        
        if pdf_path:
            file_name = os.path.basename(pdf_path)
            res['file_name'] = file_name
            text = self.pdf_processor.extract_text_from_pdf(pdf_path)
            return {
                "title": f"{petitioner} vs {respondent}",
                "file_name": file_name,
                "text": text
            }
        else:
            # Fallback to summary if PDF not found
            return {
                "title": f"{petitioner} vs {respondent}",
                "file_name": "N/A",
                "text": j.get('case_summary', '')
            }

    def _process_act_result(self, res):
        a = res['act']
        title = a.get('act_identification', {}).get('act_title', '')
        
        # Try robust method first
        pdf_path = self.pdf_processor.find_act_pdf_by_details(a)
        
        if not pdf_path:
            pdf_path = self.pdf_processor.find_act_pdf(title)
            
        if pdf_path:
            file_name = os.path.basename(pdf_path)
            res['file_name'] = file_name
            text = self.pdf_processor.extract_text_from_pdf(pdf_path)
            return {
                "title": title,
                "file_name": file_name,
                "text": text
            }
        else:
            # Fallback to structured text
            return {
                "title": title,
                "file_name": "N/A",
                "text": self._generate_act_text(a)
            }

    def get_categories(self) -> List[str]:
        return list(self.categories)
