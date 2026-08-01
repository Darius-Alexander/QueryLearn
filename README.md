# QueryLearn

QueryLearn is a local-first RAG learning platform for chatting with course materials. Students will upload notes, textbooks, slides, and documents, then ask questions answered with source-grounded citations.

## Current Status

Step 1 is a minimal FastAPI backend with one health endpoint:

```text
GET /api/health
```

## Backend Setup

From the repo root:

```powershell
cd backend
python -m venv .venv
.\.venv\Scripts\Activate.ps1
pip install -r requirements.txt
uvicorn app.main:app --reload --host 127.0.0.1 --port 8001
```

Then open:

```text
http://127.0.0.1:8001/api/health
```

Expected response:

```json
{"status":"ok"}
```

FastAPI docs are available at:

```text
http://127.0.0.1:8001/docs
```

## Project Structure

```text
backend/
  app/
    __init__.py
    main.py
  requirements.txt
```
