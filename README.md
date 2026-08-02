# QueryLearn

QueryLearn is a local-first RAG learning platform for chatting with course materials. Students will organize work by course, upload learning materials, and ask questions answered with source-grounded citations.

## Status

The project currently has a minimal local chat foundation:

- FastAPI backend
- SQLite persistence for courses, chats, and messages
- Vite + React frontend
- Local frontend-to-backend API connection

RAG ingestion, document parsing, retrieval, citations, and AI responses are planned next.

## Tech Stack

- Backend: FastAPI
- Database: SQLite
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

## Project Structure

```text
backend/
  app/
    routes/
    db.py
    main.py
    models.py
  requirements.txt

frontend/
  src/
  package.json
  vite.config.ts
```
