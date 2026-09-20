
import os
import re
from typing import List, Optional, Dict
from pypdf import PdfReader

class PDFProcessor:
    def __init__(self, judgements_dir: str, acts_dir: str):
        self.judgements_dir = judgements_dir
        self.acts_dir = acts_dir
        self.judgement_files = os.listdir(judgements_dir) if os.path.exists(judgements_dir) else []
        self.act_files = os.listdir(acts_dir) if os.path.exists(acts_dir) else []

    def _normalize(self, text: str) -> str:
        return re.sub(r'[^a-z0-9]', '', text.lower())

    def sanitize_filename(self, filename: str) -> str:
        """Remove invalid characters from filename"""
        if not filename: return ""
        # Remove invalid characters for filename
        filename = re.sub(r'[<>:"/\\|?*]', '_', filename)
        # Remove extra spaces
        filename = ' '.join(filename.split())
        # Limit length
        if len(filename) > 200:
            filename = filename[:200]
        return filename

    def find_judgement_pdf_by_metadata(self, judgement: Dict) -> Optional[str]:
        filename = judgement.get('metadata', {}).get('filename')
        if filename:
            full_path = os.path.join(self.judgements_dir, filename)
            if os.path.exists(full_path):
                return full_path
        return None

    def find_act_pdf_by_details(self, act: Dict) -> Optional[str]:
        act_identification = act.get("act_identification", {})
        act_title = act_identification.get("act_title") or act_identification.get("act_short_title", "")
        
        if not act_title:
             return None

        safe_title = self.sanitize_filename(act_title)
        filename = f"{safe_title}.pdf"
        
        full_path = os.path.join(self.acts_dir, filename)
        if os.path.exists(full_path):
            return full_path
            
        # Try case insensitive match if direct match fails
        for f in self.act_files:
            if f.lower() == filename.lower():
                return os.path.join(self.acts_dir, f)
                
        return None

    def find_judgement_pdf(self, petitioner: str, respondent: str) -> Optional[str]:
        # Simple heuristic: check if normalized petitioner and respondent are in normalized filename
        # This is a basic implementation and might need improvement
        norm_p = self._normalize(petitioner.split(' ')[0]) # First word of petitioner
        norm_r = self._normalize(respondent.split(' ')[0]) # First word of respondent
        
        # Try to find a file that contains both
        for fname in self.judgement_files:
            norm_f = self._normalize(fname)
            if norm_p in norm_f and norm_r in norm_f:
                return os.path.join(self.judgements_dir, fname)
        
        return None

    def find_act_pdf(self, act_title: str) -> Optional[str]:
        # Similar heuristic for acts
        norm_title = self._normalize(act_title)[:20] # First 20 chars
        for fname in self.act_files:
            norm_f = self._normalize(fname)
            if norm_title in norm_f:
                return os.path.join(self.acts_dir, fname)
        return None

    def extract_text_from_pdf(self, file_path: str) -> str:
        try:
            reader = PdfReader(file_path)
            text = ""
            for page in reader.pages:
                text += page.extract_text() + "\n"
            return text
        except Exception as e:
            print(f"Error reading PDF {file_path}: {e}")
            return ""
