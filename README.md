# Abyss Order — Astral Cup Hackathon

A legal research assistant for Indian law. You describe a situation in plain language; the
system classifies it, retrieves the most relevant Supreme Court judgements and Acts by
semantic search, and generates a cited report you can trace back to the source PDFs.

Built for the Astral Cup Hackathon (Dec 2025).

## Repository layout

| Directory | What it is | Stack |
| --- | --- | --- |
| [`hv_hackathon_backend/`](hv_hackathon_backend/) | The RAG service — classification, vector search, PDF text extraction, report + citation generation, follow-up chat | FastAPI, Google Vertex AI (Gemini), scikit-learn, pypdf |
| [`hackathon-frontend/`](hackathon-frontend/) | The web UI — search, judgement/act cards, strategic brief, and a PDF viewer that highlights the exact quoted passage behind each citation | React, TypeScript, Vite, Tailwind, shadcn/ui |
| [`hackathon-repo/`](hackathon-repo/) | The legal corpus and a lookup API over it, including the act-name standardizer that reconciles citation spellings across datasets | Flask, Python |

## Architecture

```
User description
      │
      ▼
  POST /analyze ──► LLM classifier ──► category
      │                                   │
      │                                   ▼
      └──────────────► RAG engine (cosine similarity over Gemini embeddings)
                              │
                              ├─► top Supreme Court judgements
                              └─► top Acts / sections
                                      │
                                      ▼
                            PDF full-text extraction
                                      │
                                      ▼
                       LLM report generator ──► Markdown report + citations
                                      │
                                      ▼
                    Frontend: report, source cards, PDF viewer with
                    highlighted quotes, and contextual follow-up chat
```

See [`hv_hackathon_backend/PIPELINE.md`](hv_hackathon_backend/PIPELINE.md) for the full
data flow, and [`hv_hackathon_backend/README.md`](hv_hackathon_backend/README.md) for the
complete API reference.

## Running it

Three services. The frontend expects the RAG backend on port **2222** and the legal
repository API on port **5034**.

### 1. RAG backend (port 2222)

Requires Python 3.13+, [uv](https://docs.astral.sh/uv/), and a Google Cloud service
account with Vertex AI access.

```bash
cd hv_hackathon_backend
uv sync
cp .env.example .env     # then set GOOGLE_VERTEXAI_CREDS to your service-account JSON
./run.sh
```

The first run generates and caches embeddings for the whole dataset, so expect it to take
a while before the service is ready.

### 2. Legal repository API (port 5034)

```bash
cd hackathon-repo
pip install flask flask-cors
python api.py
```

Serves `indian_legal_acts_structured.json` and `supreme_court_judgements_2025.json` for
act autocomplete and judgement lookup.

### 3. Frontend

```bash
cd hackathon-frontend
npm install
npm run dev
```

## Configuration

The backend reads `GOOGLE_VERTEXAI_CREDS` — the JSON content of a Google service account
key — from `hv_hackathon_backend/.env`. That file is gitignored; only `.env.example` is
tracked. Do not commit real credentials.

## Endpoints

| Method | Endpoint | Purpose |
| --- | --- | --- |
| `POST` | `/analyze` | Classify a description, retrieve sources, return a cited Markdown report |
| `POST` | `/chat` | Ask follow-up questions against a previous analysis |
| `GET` | `/documents/{filename}` | Stream the source PDF behind a citation |
| `GET` | `/api/acts` | All act titles, for autocomplete (repository API) |
