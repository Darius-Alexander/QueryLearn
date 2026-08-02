# QueryLearn

QueryLearn is a local-first RAG learning platform for chatting with course materials. Students will upload notes, textbooks, slides, and documents, then ask questions answered with source-grounded citations.

## Current Status

The project has a minimal full-stack setup:

- FastAPI backend with a health endpoint
- SQLite-backed course API
- SQLite-backed chats for each course
- SQLite-backed messages for each chat
- Vite + React frontend
- Frontend-to-backend health check

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

Course API:

```text
http://127.0.0.1:8001/api/courses
```

Chats for a course:

```text
http://127.0.0.1:8001/api/courses/biology-101/chats
```

Create a chat for a course:

```text
POST http://127.0.0.1:8001/api/courses/biology-101/chats
```

Messages for a chat:

```text
http://127.0.0.1:8001/api/chats/biology-101-general/messages
```

Create a message in a chat:

```text
POST http://127.0.0.1:8001/api/chats/biology-101-general/messages
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
    __init__.py
    db.py
    main.py
  data/           local SQLite data, ignored by Git
  requirements.txt

frontend/
  src/
    App.tsx
    main.tsx
  package.json
  vite.config.ts
```
