# Legal RAG Backend

A high-performance, FastAPI-based backend for a Legal Research & Analysis system. It utilizes Retrieval-Augmented Generation (RAG) with Google Vertex AI (Gemini) to analyze legal queries, retrieve relevant Indian Supreme Court judgements and Acts, and generate comprehensive legal reports with citations.

## Features

*   **Intelligent Classification**: Automatically categorizes legal queries.
*   **Vector Search**: Semantic search over legal documents using Gemini embeddings.
*   **Full-Text Analysis**: Extracts and analyzes text from original PDF documents.
*   **Automated Reporting**: Generates detailed Markdown reports with "Executive Summary", "Legal Principles", and "Recommendations".
*   **Citation System**: Provides exact quotes and links to source PDFs for verification.
*   **Contextual Chat**: Allows users to ask follow-up questions based on the analysis.

## Prerequisites

*   **Python 3.10+**
*   **uv** (Python package manager)
*   **Google Cloud Credentials**: Service account with Vertex AI access.

## Setup

1.  **Clone the repository**
2.  **Install dependencies**:
    ```bash
    uv sync
    ```
3.  **Environment Configuration**:
    Create a `.env` file in the root directory. You can copy `.env.example` if it exists.
    
    **Required Variables:**
    *   `GOOGLE_VERTEXAI_CREDS`: The JSON content of your Google Service Account Key.
    *   `GEMINI_API_KEY`: (Optional) API Key if using AI Studio instead of Vertex AI directly (code defaults to Vertex AI).

    Example `.env`:
    ```dotenv
    GOOGLE_VERTEXAI_CREDS='{ "type": "service_account", ... }'
    ```

## Running the Application

Start the server using the provided script or `uv`:

```bash
# Using the helper script
./run.sh

# OR manually
uv run uvicorn src.main:app --reload --host 0.0.0.0 --port 8000
```

*Note: The first run will take some time to generate and cache embeddings for the dataset.*

## API Documentation

### 1. Analyze Case
**Endpoint**: `POST /analyze`

Analyzes a legal description and returns a report with relevant documents.

**Request Body**:
```json
{
  "description": "I am concerned about deforestation in Tamil Nadu and the displacement of tea estate workers..."
}
```

**Response**:
```json
{
  "category": "Environment",
  "relevant_cases": [
    {
      "case_summary": "...",
      "category": "Environment",
      "winning_arguments": "...",
      "outcome": "...",
      "similarity_score": 0.85,
      "file_name": "A_John_Kennedy_vs_The_State_Of_Tamil_Nadu.PDF"
    }
  ],
  "relevant_acts": [
    {
      "act_title": "The National Green Tribunal Act, 2010",
      "section_title": "...",
      "description": "...",
      "similarity_score": 0.75,
      "file_name": "THE_NATIONAL_GREEN_TRIBUNAL_ACT_2010.pdf"
    }
  ],
  "report": "# Legal Report...\n## Executive Summary...",
  "citations": [
    {
      "citation_id": "[1]",
      "file_name": "A_John_Kennedy_vs_The_State_Of_Tamil_Nadu.PDF",
      "quoted_text": "Needle to say, that the forests form the lungs of the ecosystem..."
    }
  ]
}
```

### 2. Chat with Assistant
**Endpoint**: `POST /chat`

Ask follow-up questions based on the analysis.

**Request Body**:
```json
{
  "message": "What specific directions were given?",
  "history": [
    {"role": "user", "content": "..."},
    {"role": "model", "content": "..."}
  ],
  "context": { ...Object returned from /analyze... }
}
```

**Response**:
```json
{
  "response": "The court directed the Central Empowered Committee to..."
}
```

### 3. Get Document (PDF)
**Endpoint**: `GET /documents/{filename}`

Retrieves the PDF file for a citation or relevant case.

**Example**: `GET /documents/A_John_Kennedy_vs_The_State_Of_Tamil_Nadu.PDF`

## Frontend Integration Guide

1.  **Step 1: Analysis**
    *   Send the user's input to `/analyze`.
    *   Display the `report` (Markdown) to the user.
    *   Render the `citations` as interactive links. When a user clicks a citation (e.g., `[1]`), use the `file_name` to fetch the PDF from `/documents/{file_name}`.
    *   Display `relevant_cases` and `relevant_acts` in a sidebar or separate tab.

2.  **Step 2: Chat**
    *   Allow the user to ask questions about the report.
    *   Send the *entire* response object from Step 1 as the `context` field in the `/chat` request. This ensures the LLM knows about the specific cases and report details.

3.  **Step 3: PDF Viewer**
    *   Use the `/documents/{filename}` endpoint to load PDFs into a browser PDF viewer (e.g., `iframe` or `react-pdf`).
    *   You can implement "search in document" on the frontend using the `quoted_text` from the citation to highlight the exact source passage.

## Pipeline Details

For a visual representation of the system architecture and data flow, please refer to [PIPELINE.md](PIPELINE.md).
