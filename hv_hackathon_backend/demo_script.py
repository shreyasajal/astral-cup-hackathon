
import httpx
import time
import json
import sys
import io
from pypdf import PdfReader

BASE_URL = "http://localhost:2222"

def run_demo():
    print("Waiting for server to start...")
    # Simple wait loop
    for _ in range(30):
        try:
            httpx.get(f"{BASE_URL}/docs")
            print("Server is ready!")
            break
        except:
            time.sleep(1)
    else:
        print("Server failed to start.")
        sys.exit(1)
    
    # Store all results
    all_results = []

    examples = [
        # {
        #     "name": "Environment Case (Forest Conservation)",
        #     "description": "I am concerned about the deforestation in the Agasthyamalai landscape in Tamil Nadu. There are tea estate workers who are being displaced. What is the court's stance on preserving these forests vs rehabilitating the workers?",
        #     "chat_question": "What specific directions did the court give to the Central Empowered Committee?"
        # },
        # {
        #     "name": "Corporate Law (Insolvency Delay)",
        #     "description": "My appeal to the NCLAT was dismissed because I filed it 10 days late. I didn't apply for a certified copy of the order. Can I get the delay condoned?",
        #     "chat_question": "Does the Limitation Act's provision for excluding time to get a certified copy apply here?"
        # },
        {
            "name": "Criminal Law",
            "description": "We are challenging a government tender process for a large infrastructure project. Our client, a construction company, was disqualified on a minor technicality, while the winning bidder seems to have been given undue preference. We believe the process was arbitrary and violated principles of natural justice. We need to file a writ petition in the High Court to challenge the tender award and seek a fair re-evaluation of bids. The contract value is over INR 500 crores, and time is of the essence as construction needs to start soon. Opponent Counsel: Mr. Tushar Mehta, Solicitor General of India",
            "chat_question": "What is our best line of attack, and how should we prepare for arguments from Mr. Tushar Mehta?"
        },
        # {
        #     "name": "legal notice example",
        #     "description": "My client, 'ABC Exports,' had a contract with 'XYZ Logistics' to ship 500 units of textiles from Mumbai to London. The contract stipulated delivery by November 30, 2025. XYZ Logistics failed to deliver the goods and is now unresponsive. The contract was signed in Mumbai and is governed by Indian law. We need to initiate legal proceedings for breach of contract and recovery of damages.",
        #     "chat_question": "Generate a legal notice for breach of contract."
        # }
    ]

    for i, ex in enumerate(examples):
        print(f"\n{'='*80}")
        print(f"EXAMPLE {i+1}: {ex['name']}")
        print(f"{'='*80}")
        
        print(f"\n[Input Description]:\n{ex['description']}")
        
        # 1. Analyze
        print("\n>>> Calling /analyze...")
        try:
            t0 = time.time()
            # Send as form data instead of JSON
            resp = httpx.post(
                f"{BASE_URL}/analyze", 
                json={"description": ex['description']},
                timeout=120.0
            )
            resp.raise_for_status()
            analysis = resp.json()
            dt = time.time() - t0
            print(f"Analysis completed in {dt:.2f}s")
            
            print(f"\n[Identified Category]: {analysis['category']}")
            
            print("\n[Top Relevant Case]:")
            if analysis['relevant_cases']:
                top_case = analysis['relevant_cases'][0]
                print(f"  Summary: {top_case['case_summary'][:300]}...")
                print(f"  Score: {top_case['similarity_score']:.4f}")
                # print(f"  Outcome: {top_case['outcome'][:200]}...")
                print(f"  File Name: {top_case.get('file_name', 'N/A')}")
                print(analysis['relevant_cases'][0])
            else:
                print("  No cases found.")
                
            print("\n[Top Relevant Act]:")
            if analysis['relevant_acts']:
                top_act = analysis['relevant_acts'][0]
                print(f"  Act: {top_act['act_title']}")
                print(f"  Purpose: {top_act['description'][:200]}...")
                print(f"  Score: {top_act['similarity_score']:.4f}")
                print(f"  File Name: {top_act.get('file_name', 'N/A')}")
            else:
                print("  No acts found.")

            print("\n[Generated Report]:")
            if analysis.get('report'):
                print(analysis['report'])
            else:
                print("  No report generated.")

            print("\n[Citations]:")
            if analysis.get('citations'):
                for cit in analysis['citations']:
                    print(f"  [{cit['citation_id']}] {cit['file_name']}: \"{cit['quoted_text'][:100]}...\"")
                    
                    # Validate file availability
                    try:
                        file_url = f"{BASE_URL}/documents/{cit['file_name']}"
                        file_resp = httpx.get(file_url, timeout=30.0)
                        if file_resp.status_code == 200:
                            print("    [Validation] \u2705 File available")
                            
                            # Validate quoted text
                            try:
                                pdf_file = io.BytesIO(file_resp.content)
                                reader = PdfReader(pdf_file)
                                full_text = ""
                                for page in reader.pages:
                                    full_text += page.extract_text() or ""
                                
                                # Normalize whitespace
                                def normalize(text):
                                    return " ".join(text.split())
                                
                                if normalize(cit['quoted_text']) in normalize(full_text):
                                     print("    [Validation] \u2705 Quote found in document")
                                else:
                                     print("    [Validation] \u274c WARNING: Quote NOT found in document text")
                            except Exception as e:
                                print(f"    [Validation] Error checking quote: {e}")

                        else:
                            print(f"    [Validation] \u274c WARNING: File not found (Status: {file_resp.status_code})")
                    except Exception as e:
                        print(f"    [Validation] Error checking file: {e}")
            else:
                print("  No citations found.")
                
            # 2. Chat
            print(f"\n>>> Calling /chat with question: '{ex['chat_question']}'")
            
            # Construct context for chat (simulating frontend passing it back)
            context = analysis
            
            t0 = time.time()
            chat_resp = httpx.post(f"{BASE_URL}/chat", json={
                "message": ex['chat_question'],
                "history": [],
                "context": context
            }, timeout=120.0)
            chat_resp.raise_for_status()
            chat_data = chat_resp.json()
            dt = time.time() - t0
            
            print(f"\n[Chat Response] ({dt:.2f}s):\n{chat_data['response']}")
            
            # Store result
            all_results.append({
                "example_name": ex['name'],
                "input_description": ex['description'],
                "chat_question": ex['chat_question'],
                "analysis": analysis,
                "chat_response": chat_data['response']
            })
            
        except Exception as e:
            print(f"Error: {e}")
            if hasattr(e, 'response') and e.response:
                print(e.response.text)
    
    # Save all results to JSON file
    output_file = "demo_results.json"
    with open(output_file, 'w', encoding='utf-8') as f:
        json.dump(all_results, f, indent=2, ensure_ascii=False)
    
    print(f"\n{'='*80}")
    print(f"All results saved to: {output_file}")
    print(f"{'='*80}")

if __name__ == "__main__":
    run_demo()
