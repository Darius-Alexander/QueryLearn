# QueryLearn

QueryLearn is a local-first RAG learning platform for students. It lets students organize materials by course, upload course documents, parse them into searchable source sections, prepare retrieval-ready chunks, and index those chunks for source-grounded AI answers with citations.

## Current Status

QueryLearn currently includes:

- FastAPI backend with SQLite persistence
- Vite + React + TypeScript frontend
- Course, chat, message, document, parsed-section, chunk, and chunk-embedding data models
- Course creation and local chat/message storage
- Document upload and metadata storage
- One-click document preparation that parses, chunks, and indexes uploaded files
- Parsed section and chunk previews for prepared documents
- Backend debug endpoints for manual parse, chunk, and index stages
- Course-scoped retrieval over indexed chunks
- Retrieved source chunk previews with scores and source metadata
- Chat answer generation from retrieved course sources
- Two answer modes: Notes + AI explanation and Notes only
- Answer model selection: Economy, Fast, Balanced, and Deep
- Latest generated answer source citations and evidence previews
- Supported parsing formats: `.txt`, `.md`, `.csv`, `.pdf`, `.docx`, `.xlsx`, `.pptx`

Persistent citation history, streaming AI responses, and broader evals are planned next.

## Tech Stack

- Backend: FastAPI, Pydantic, SQLite
- Parsing: pypdf, python-docx, openpyxl, python-pptx
- Indexing: OpenAI embeddings
- Retrieval: brute-force cosine similarity over local SQLite embeddings
- Answer generation: OpenAI Responses API
- Frontend: Vite, React, TypeScript

## Backend Setup

From the repo root:

```powershell
cd backend
python -m venv .venv
.\.venv\Scripts\Activate.ps1
pip install -r requirements.txt
uvicorn app.main:app --reload --host 127.0.0.1 --port 8001
```

Create `backend/.env` and set `OPENAI_API_KEY` before preparing or indexing documents, retrieving sources, or generating answers. Optionally set `OPENAI_ANSWER_MODEL` to override the default answer model.

Answer model selection applies only to answer generation. Retrieval embeddings still use the indexing/retrieval embedding model. The frontend defaults to `Balanced`; the backend default path still uses `OPENAI_ANSWER_MODEL` when it is set.

```text
Economy -> gpt-5-nano
Fast -> gpt-5.6-luna
Balanced -> gpt-5.6-terra
Deep -> gpt-5.6-sol
```

Backend health check:

```text
http://127.0.0.1:8001/api/health
```

FastAPI docs:

```text
http://127.0.0.1:8001/docs
```

## Frontend Setup

Open a second terminal from the repo root:

```powershell
cd frontend
npm.cmd install
Copy-Item .env.example .env.local
npm.cmd run dev -- --host 127.0.0.1
```

Frontend app:

```text
http://127.0.0.1:5173
```

## Local Data

QueryLearn stores local runtime data under `backend/data/`, including the SQLite database and uploaded files. This folder is ignored by Git.

## Project Structure

```text
backend/
  app/
    answering/
      client.py
      models.py
      prompts.py
      service.py
    chunking/
      chunkers.py
      models.py
      service.py
    indexing/
      embeddings.py
      models.py
      service.py
    parsing/
      models.py
      parsers.py
      service.py
    preparation/
      service.py
    retrieval/
      models.py
      service.py
    routes/
      chats.py
      courses.py
      documents.py
      retrieval.py
    db.py
    main.py
    models.py
  requirements.txt

frontend/
  public/
  src/
    App.tsx
    main.tsx
  package.json
  vite.config.ts
```
