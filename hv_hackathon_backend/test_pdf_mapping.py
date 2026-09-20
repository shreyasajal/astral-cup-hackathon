
import json
import os
import sys
from src.pdf_processor import PDFProcessor

# Paths
DATA_DIR = "/mnt/private/work/hv_hackathon_backend/data"
JUDGEMENTS_FILE = os.path.join(DATA_DIR, "supreme_court_judgements_2025.json")
ACTS_FILE = os.path.join(DATA_DIR, "indian_legal_acts_structured.json")
JUDGEMENTS_PDF_DIR = os.path.join(DATA_DIR, "judgements_pdfs")
ACTS_PDF_DIR = os.path.join(DATA_DIR, "acts_pdfs")

def test_mapping():
    print(f"Checking directories:")
    print(f"Judgements PDF Dir: {JUDGEMENTS_PDF_DIR} (Exists: {os.path.exists(JUDGEMENTS_PDF_DIR)})")
    print(f"Acts PDF Dir: {ACTS_PDF_DIR} (Exists: {os.path.exists(ACTS_PDF_DIR)})")

    processor = PDFProcessor(JUDGEMENTS_PDF_DIR, ACTS_PDF_DIR)
    
    print("\n--- Testing Judgements Mapping ---")
    try:
        with open(JUDGEMENTS_FILE, 'r') as f:
            judgements = json.load(f)['judgements']
            
        print(f"Total Judgements in JSON: {len(judgements)}")
        found_j = 0
        sample_size = min(20, len(judgements))
        print(f"Testing first {sample_size} judgements...")
        
        for i, j in enumerate(judgements[:sample_size]):
            path = processor.find_judgement_pdf_by_metadata(j)
            status = "FOUND" if path else "MISSING"
            if path: found_j += 1
            print(f"[{i+1}] {j.get('metadata', {}).get('filename')} -> {status}")
            
        print(f"Found {found_j}/{sample_size} in sample.")
        
        # Check total count
        total_found_j = 0
        for j in judgements:
            if processor.find_judgement_pdf_by_metadata(j):
                total_found_j += 1
        print(f"Total Found Judgements: {total_found_j}/{len(judgements)}")
        
    except Exception as e:
        print(f"Error testing judgements: {e}")

    print("\n--- Testing Acts Mapping ---")
    try:
        with open(ACTS_FILE, 'r') as f:
            acts = json.load(f)['legal_acts']
            
        print(f"Total Acts in JSON: {len(acts)}")
        found_a = 0
        sample_size = min(20, len(acts))
        print(f"Testing first {sample_size} acts...")
        
        for i, a in enumerate(acts[:sample_size]):
            path = processor.find_act_pdf_by_details(a)
            status = "FOUND" if path else "MISSING"
            if path: found_a += 1
            
            act_ident = a.get("act_identification", {})
            title = act_ident.get("act_title") or act_ident.get("act_short_title", "")
            print(f"[{i+1}] {title} -> {status}")
            if not path:
                safe_title = processor.sanitize_filename(title)
                print(f"    Expected: {safe_title}.pdf")
            
        print(f"Found {found_a}/{sample_size} in sample.")
        
        # Check total count
        total_found_a = 0
        for a in acts:
            if processor.find_act_pdf_by_details(a):
                total_found_a += 1
        print(f"Total Found Acts: {total_found_a}/{len(acts)}")
        
    except Exception as e:
        print(f"Error testing acts: {e}")

if __name__ == "__main__":
    test_mapping()
