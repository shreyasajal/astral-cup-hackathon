import os
import re
from google import genai
from google.genai import types
from dotenv import load_dotenv
import json
from fuzzywuzzy import fuzz
from typing import Dict, Optional, Tuple

load_dotenv()

google_creds_json = os.getenv("GOOGLE_VERTEXAI_CREDS")
if google_creds_json:
    with open("/tmp/google_creds.json", "w") as f:
        f.write(google_creds_json)
    os.environ["GOOGLE_APPLICATION_CREDENTIALS"] = "/tmp/google_creds.json"


# Load advocate profiles for fuzzy matching
ADVOCATE_PROFILES_PATH = os.path.join(os.path.dirname(__file__), "..", "data", "advocate_profiles_analysis.json")

class LLMClient:
    def __init__(self):        
        self.client = genai.Client(
            vertexai=True, project="hyperturinglex", location="us-central1"
        )
        self.model_name = "gemini-2.5-flash"
        self.embedding_model = "gemini-embedding-001"
        
        # Load advocate profiles
        self.advocate_names = []
        self.advocate_profiles = {}
        try:
            with open(ADVOCATE_PROFILES_PATH, 'r', encoding='utf-8') as f:
                advocate_data = json.load(f)
                profiles_list = advocate_data.get('advocate_profiles', [])
                
                for profile in profiles_list:
                    advocate_name = profile['advocate_name']
                    self.advocate_names.append(advocate_name)
                    self.advocate_profiles[advocate_name] = profile
                    
        except Exception as e:
            print(f"Warning: Could not load advocate profiles: {e}")
            self.advocate_names = []
            self.advocate_profiles = {}
    
    def get_advocate_profile(self, advocate_name: str) -> Optional[Dict]:
        """Get full advocate profile by name"""
        return self.advocate_profiles.get(advocate_name)
    
    def get_embedding(self, text: str) -> list[float]:
        try:
            result = self.client.models.embed_content(
                model=self.embedding_model,
                contents=text
            )
            return result.embeddings[0].values
        except Exception as e:
            print(f"Error getting embedding: {e}")
            return []
    
    def fuzzy_match_advocate(self, advocate_name: str) -> Optional[str]:
        """Fuzzy match advocate name to standard form"""
        if not advocate_name or not self.advocate_names:
            return None
        
        # Normalize input
        advocate_name_normalized = advocate_name.lower().strip()
        advocate_name_normalized = advocate_name_normalized.replace('mr.', '').replace('ms.', '').replace('mrs.', '')
        advocate_name_normalized = advocate_name_normalized.replace('adv.', '').replace('advocate', '').replace('sr.', '')
        advocate_name_normalized = ' '.join(advocate_name_normalized.split())
        
        # Find best match
        best_match = None
        best_score = 0
        
        for standard_name in self.advocate_names:
            score = fuzz.ratio(advocate_name_normalized, standard_name.lower())
            if score > best_score and score >= 75:  # 75% similarity threshold
                best_score = score
                best_match = standard_name
        
        return best_match

    def classify_case(
        self, 
        description: Optional[str], 
        categories: list[str]
    ) -> Dict[str, str]:
        """
        Extract case details, classify category, and identify opponent advocate.
        
        Returns:
            {
                'case_detail': str,
                'category': str,
                'opponent_advocate': str (or None)
            }
        """
        # Build prompt for Gemini
        prompt = f"""You are a legal expert analyzing a case document. Extract the following information:

1. CASE DETAIL: A concise summary of the key facts and legal issues (2-3 paragraphs)
2. CATEGORY: Classify into exactly ONE of these categories: {json.dumps(categories)}
3. OPPONENT ADVOCATE: The name of the opposing counsel/advocate mentioned in the document

OUTPUT FORMAT (JSON only):
{{
  "case_detail": "Concise case summary...",
  "category": "Exact category from the list",
  "opponent_advocate": "Advocate name or null if not found"
}}

Return ONLY the JSON object, no other text.
"""
        
        # Build contents array - include text description and/or PDF
        contents = []
        
        if description:
            contents.append(f"CASE DESCRIPTION:\n{description}\n\n{prompt}")
        else:
            contents.append(prompt)
        
        if not description:
            return {
                'case_detail': '',
                'category': 'Unknown',
                'opponent_advocate': None
            }
        
        try:
            response = self.client.models.generate_content(
                model=self.model_name,
                contents=contents,
                config=types.GenerateContentConfig(
                    thinking_config=types.ThinkingConfig(
                            include_thoughts=False,
                            thinking_budget=0,
                        ),
                ),
            )
            
            response_text = response.text.strip()
            
            # Extract JSON
            if response_text.startswith("```json"):
                response_text = response_text[7:]
            if response_text.startswith("```"):
                response_text = response_text[3:]
            if response_text.endswith("```"):
                response_text = response_text[:-3]
            response_text = response_text.strip()
            
            # Parse JSON
            result = json.loads(response_text)
            
            # Validate category
            extracted_category = result.get('category', 'Unknown')
            validated_category = 'Unknown'
            for cat in categories:
                if cat.lower() in extracted_category.lower():
                    validated_category = cat
                    break
            
            # Fuzzy match opponent advocate
            opponent_advocate_raw = result.get('opponent_advocate')
            opponent_advocate_matched = None
            if opponent_advocate_raw:
                opponent_advocate_matched = self.fuzzy_match_advocate(opponent_advocate_raw)
            
            return {
                'case_detail': result.get('case_detail', ''),
                'category': validated_category,
                'opponent_advocate': opponent_advocate_matched
            }
            
        except Exception as e:
            print(f"Error in classify_case: {e}")
            return {
                'case_detail': description or "Error processing document",
                'category': 'Unknown',
                'opponent_advocate': None
            }

    def chat(self, message: str, history: list[dict], context_str: str) -> str:
        system_instruction = """You are a legal assistant. Use the provided context (relevant cases and acts) to answer the user's question. 
        If the answer is not in the context, use your general legal knowledge but mention that it's general knowledge.
        Be professional and concise."""
        
        # Convert history to gemini format if needed, or just append to prompt
        # For simplicity in this hackathon, I'll construct a single prompt with history
        
        full_prompt = f"Context:\n{context_str}\n\n"
        
        for msg in history:
            role = msg.get("role", "user")
            content = msg.get("content", "")
            full_prompt += f"{role.upper()}: {content}\n"
            
        full_prompt += f"USER: {message}\nMODEL:"
        
        try:
            response = self.client.models.generate_content(
                model=self.model_name,
                config=types.GenerateContentConfig(
                    system_instruction=system_instruction,
                    thinking_config=types.ThinkingConfig(
                        include_thoughts=False,
                        thinking_budget=0,
                    ),
                ),
                contents=full_prompt
            )
            return response.text
        except Exception as e:
            print(f"Error in chat: {e}")
            return "I encountered an error processing your request."

    def generate_report(self, case_description: str, documents: list[dict]) -> dict:
        """
        Generates a report based on the case description and provided documents.
        documents: list of dicts with 'title', 'text', 'file_name'
        """
        
        docs_text = ""
        for i, doc in enumerate(documents):
            docs_text += f"--- DOCUMENT {i+1} ---\n"
            docs_text += f"Title: {doc['title']}\n"
            docs_text += f"File Name: {doc['file_name']}\n"
            docs_text += f"Content:\n{doc['text']}\n\n"

        prompt = f"""
        You are a highly skilled legal expert. Your task is to generate a comprehensive legal report based on the provided case description and the relevant legal documents (judgements and acts).

        Case Description:
        {case_description}

        Relevant Documents:
        {docs_text}

        Instructions:
        1. Analyze the case description and the provided documents.
        2. Create a detailed report in Markdown format. The report should include:
           - Executive Summary
           - Relevant Legal Principles (derived from the documents)
           - Application to the Current Case
           - Recommendations/Conclusion
        3. Keep the report concise. The total length should be between 400 and 600 words. Focus on the most critical legal points.
        4. You MUST cite your sources. When you use information from a document, insert a citation marker like [1], [2], etc.
        5. You MUST extract the exact quoted text for each citation to verify the source.
        6. The output MUST be a valid JSON object with the following structure:
        {{
            "report_markdown": "The markdown content of the report...",
            "citations": [
                {{
                    "citation_id": "1",
                    "file_name": "filename_of_the_source_document.pdf",
                    "quoted_text": "The exact text quoted from the document..."
                }},
                ...
            ]
        }}
        7. Ensure the "quoted_text" is EXACTLY as it appears in the document text, so it can be found by a string search. Keep the quoted text short (maximum 300 characters) and select a distinct substring that is unique enough to identify the location in the document.
        8. Do not include any markdown formatting (like ```json) around the JSON output. Just return the raw JSON string.
        """

        try:
            response = self.client.models.generate_content(
                model=self.model_name,
                config=types.GenerateContentConfig(
                    response_mime_type="application/json",
                    response_schema={
                        "type": "OBJECT",
                        "properties": {
                            "report_markdown": {"type": "STRING"},
                            "citations": {
                                "type": "ARRAY",
                                "items": {
                                    "type": "OBJECT",
                                    "properties": {
                                        "citation_id": {"type": "STRING"},
                                        "file_name": {"type": "STRING"},
                                        "quoted_text": {"type": "STRING"}
                                    },
                                    "required": ["citation_id", "file_name", "quoted_text"]
                                }
                            }
                        },
                        "required": ["report_markdown", "citations"]
                    },
                    thinking_config=types.ThinkingConfig(
                        include_thoughts=False,
                        thinking_budget=0,
                    ),
                ),
                contents=prompt
            )
            text = response.text.strip()
            # Clean up markdown code blocks if present (though schema usually prevents this)
            if text.startswith("```json"):
                text = text[7:]
            elif text.startswith("```"):
                text = text[3:]
            if text.endswith("```"):
                text = text[:-3]
            
            result = json.loads(text.strip())
            
            # --- Reorder and Clean Citations ---
            report_text = result.get('report_markdown', '')
            citations_list = result.get('citations', [])
            
            # Create a lookup for citations by ID (ensure ID is string)
            citations_map = {str(c['citation_id']): c for c in citations_list}
            
            old_to_new_id = {}
            next_new_id = 1
            valid_citation_ids = set(citations_map.keys())
            
            def replace_match(match):
                nonlocal next_new_id
                old_id = match.group(1)
                if old_id in valid_citation_ids:
                    if old_id not in old_to_new_id:
                        old_to_new_id[old_id] = str(next_new_id)
                        next_new_id += 1
                    return f"[{old_to_new_id[old_id]}]"
                else:
                    return "" # Remove invalid citation
            
            new_report_text = re.sub(r'\[(\d+)\]', replace_match, report_text)
            
            # Rebuild citations list in order
            new_citations_list = []
            sorted_map = sorted([(int(new), old) for old, new in old_to_new_id.items()], key=lambda x: x[0])
            
            for _, old_id in sorted_map:
                citation = citations_map[old_id]
                citation['citation_id'] = old_to_new_id[old_id]
                new_citations_list.append(citation)
            
            result['report_markdown'] = new_report_text
            result['citations'] = new_citations_list
            
            # Validate citations against documents
            for citation in result.get('citations', []):
                citation['is_verified'] = False
                # Find doc
                doc = next((d for d in documents if d['file_name'] == citation['file_name']), None)
                if doc:
                    # Normalize strings for comparison (remove extra whitespace)
                    doc_text_norm = " ".join(doc['text'].split())
                    quote_norm = " ".join(citation['quoted_text'].split())
                    if quote_norm in doc_text_norm:
                        citation['is_verified'] = True
                    else:
                        # Try exact match first just in case
                        if citation['quoted_text'] in doc['text']:
                            citation['is_verified'] = True
            
            return result
        except Exception as e:
            print(f"Error generating report: {e}")
            return {
                "report_markdown": f"Error generating report: {str(e)}",
                "citations": []
            }

