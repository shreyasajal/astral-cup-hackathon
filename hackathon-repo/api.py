"""
Legal Repository API
Provides endpoints for searching Indian Legal Acts and their associated Supreme Court judgements.
"""

from flask import Flask, jsonify, request
from flask_cors import CORS
import json
from urllib.parse import unquote
from act_standardizer import ActStandardizer
import os

app = Flask(__name__)
CORS(app)  

BASE_DIR = os.path.dirname(os.path.abspath(__file__))

LEGAL_ACTS_PATH = os.path.join(BASE_DIR, 'indian_legal_acts_structured.json')
JUDGEMENTS_PATH = os.path.join(BASE_DIR, 'supreme_court_judgements_2025.json')

# Initialize standardizer
print("Initializing Act Standardizer...")
standardizer = ActStandardizer(LEGAL_ACTS_PATH, JUDGEMENTS_PATH)

# Load judgements data for querying
print("Loading judgements data...")
with open(JUDGEMENTS_PATH, 'r') as f:
    judgements_data = json.load(f)
    all_judgements = judgements_data['judgements']

print(f"API ready with {len(standardizer.get_all_act_titles())} acts and {len(all_judgements)} judgements")


@app.route('/api/acts', methods=['GET'])
def get_all_acts():
    """
    GET /api/acts
    Returns all legal act titles for autocomplete.

    Response: ["ACT TITLE 1", "ACT TITLE 2", ...]
    """
    try:
        acts = standardizer.get_all_act_titles()
        # Sort alphabetically
        acts.sort()
        return jsonify(acts)
    except Exception as e:
        return jsonify({'error': str(e)}), 500


@app.route('/api/act_details/<path:act_title>', methods=['GET'])
def get_act_details(act_title):
    """
    GET /api/act_details/:actTitle
    Returns detailed information about a specific legal act.

    Response: {
        "title": string,
        "year": string,
        "purpose": string,
        "category": string,
        "keySections": [{
            "number": string,
            "title": string,
            "description": string
        }]
    }
    """
    try:
        # URL decode the title
        act_title = unquote(act_title)

        # Get act data
        act_data = standardizer.get_legal_act_data(act_title)

        if not act_data:
            return jsonify({'error': 'Act not found'}), 404

        # Extract relevant fields
        act_id = act_data.get('act_identification', {})
        act_overview = act_data.get('act_overview', {})
        key_provisions = act_data.get('key_provisions', {})

        response = {
            'title': act_id.get('act_title', ''),
            'year': act_id.get('year_of_enactment', ''),
            'purpose': act_overview.get('purpose', ''),
            'category': act_overview.get('act_category', ''),
            'keySections': [
                {
                    'number': section.get('section_number', ''),
                    'title': section.get('title', ''),
                    'description': section.get('description', '')
                }
                for section in key_provisions.get('key_sections', [])
            ]
        }

        return jsonify(response)
    except Exception as e:
        return jsonify({'error': str(e)}), 500


@app.route('/api/judgements_for_act/<path:act_title>', methods=['GET'])
def get_judgements_for_act(act_title):
    """
    GET /api/judgements_for_act/:actTitle
    Returns all judgements that cite a specific act.

    Response: {
        "judgements": [{
            "caseNumber": string,
            "caseTitle": string,
            "judges": [string],
            "dateOfJudgement": string,
            "outcome": string,
            "category": string,
            "summarySnippet": string,
            "fullSummary": string,
            "winningArguments": string,
            "ratioDecidendi": string,
            "reliefGranted": string,
            "citedActs": [string],
            "citedPrecedents": [string]
        }]
    }
    """
    try:
        # URL decode the title
        act_title = unquote(act_title)

        # Normalize the requested act title
        normalized_act = standardizer._normalize_act_name(act_title)

        # Find all judgements that cite this act
        matching_judgements = []

        for judgement in all_judgements:
            # Get acts cited in this judgement
            cited_acts = judgement.get('legal_citations', {}).get('acts_cited', [])

            # Check if any citation matches our act (after normalization)
            for cited_act in cited_acts:
                normalized_citation = standardizer.get_normalized_name(cited_act)
                if normalized_citation == normalized_act:
                    # Extract relevant fields
                    case_id = judgement.get('case_identification', {})
                    bench = judgement.get('judicial_bench', {})
                    dates = judgement.get('dates', {})
                    outcome = judgement.get('outcome', {})
                    case_details = judgement.get('case_details', {})
                    reasoning = judgement.get('judicial_reasoning', {})
                    arguments = judgement.get('legal_arguments', {})
                    citations = judgement.get('legal_citations', {})

                    # Create case title from petitioner and respondent
                    case_title = f"{case_id.get('petitioner_name', '')} vs {case_id.get('respondent_name', '')}"

                    # Create summary snippet (first 200 chars of case summary)
                    full_summary = judgement.get('case_summary', '')
                    summary_snippet = full_summary[:200] + '...' if len(full_summary) > 200 else full_summary

                    matching_judgements.append({
                        'caseNumber': case_id.get('case_number', ''),
                        'caseTitle': case_title,
                        'judges': bench.get('bench_judges', []),
                        'dateOfJudgement': dates.get('date_of_judgement', ''),
                        'outcome': outcome.get('judgement_outcome', ''),
                        'category': case_details.get('category', ''),
                        'summarySnippet': summary_snippet,
                        'fullSummary': full_summary,
                        'winningArguments': arguments.get('winning_arguments', ''),
                        'ratioDecidendi': reasoning.get('ratio_decidendi', ''),
                        'reliefGranted': outcome.get('relief_granted', ''),
                        'citedActs': citations.get('acts_cited', []),
                        'citedPrecedents': citations.get('precedents_cited', [])
                    })
                    break  # Don't add the same judgement multiple times

        # Sort by date (most recent first)
        matching_judgements.sort(
            key=lambda x: x['dateOfJudgement'],
            reverse=True
        )

        return jsonify({
            'judgements': matching_judgements,
            'total_count': len(matching_judgements)
        })
    except Exception as e:
        return jsonify({'error': str(e)}), 500


@app.route('/api/health', methods=['GET'])
def health_check():
    """Health check endpoint."""
    return jsonify({
        'status': 'healthy',
        'total_acts': len(standardizer.get_all_act_titles()),
        'total_judgements': len(all_judgements)
    })


if __name__ == '__main__':
    app.run(host='0.0.0.0', port=5034, debug=True)
