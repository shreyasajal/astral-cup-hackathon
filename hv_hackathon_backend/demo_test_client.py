
import os
import sys
import json
from fastapi.testclient import TestClient
from src.main import app

# Add project root to path
sys.path.append(os.path.dirname(os.path.abspath(__file__)))

client = TestClient(app)

def run_demo(description: str, name: str):
    print(f"\n{'='*50}")
    print(f"Running Demo: {name}")
    print(f"Description: {description}")
    print(f"{'='*50}\n")
    
    try:
        response = client.post("/analyze", json={"description": description})
        
        if response.status_code == 200:
            data = response.json()
            print(f"Category: {data['category']}")
            print(f"\n--- Report ---\n")
            print(data['report'][:500] + "...\n(truncated)")
            
            print(f"\n--- Citations ({len(data['citations'])}) ---\n")
            for i, cit in enumerate(data['citations']):
                print(f"[{i+1}] {cit['citation_id']} - {cit['file_name']}")
                print(f"    Quote: {cit['quoted_text'][:100]}...")
                
            print(f"\n--- Relevant Cases ({len(data['relevant_cases'])}) ---\n")
            for case in data['relevant_cases']:
                print(f"- {case['case_summary'][:100]}...")
                
        else:
            print(f"Error: {response.status_code}")
            print(response.text)
            
    except Exception as e:
        print(f"Exception: {e}")

if __name__ == "__main__":
    # Example 1: Environment
    # Based on A. John Kennedy vs The State of Tamil Nadu
    desc1 = "I am concerned about the preservation of Reserve Forests and Tiger Reserves in Tamil Nadu, specifically regarding the Agasthyamalai landscape and the rehabilitation of displaced tea estate workers. What are the recent court directions on this?"
    run_demo(desc1, "Environment / Forest Conservation")

    # Example 2: Criminal / NDPS
    # Based on Narcotic Control Bureau vs Lakhwinder Singh
    desc2 = "A case involving the Narcotic Control Bureau where the accused Lakhwinder Singh is seeking bail or relief. What are the grounds and the court's decision regarding NDPS act provisions?"
    run_demo(desc2, "Criminal / NDPS Act")
