# Preparation Smoke Checks

Use these manual checks after starting the backend and frontend.

## Goal

Confirm that one-click document preparation runs parse, chunk, and index so an uploaded document becomes answer-ready without manually clicking each stage.

## Setup

- Backend running at `http://127.0.0.1:8001`
- Frontend running at `http://127.0.0.1:5173`
- `OPENAI_API_KEY` is set in `backend/.env`
- A small supported document is available for upload, preferably `.txt` or `.md`

## Checks

### Prepare Supported Document

Upload a supported document, then click `Prepare` on its document row.

Expected:

- button changes to `Preparing...` while the request runs
- document row updates to `ready`
- parsed section count is greater than 0
- chunk count is greater than 0
- indexed chunk count is greater than 0
- clicking the document row shows parsed sections
- chunk previews render below the parsed sections

### Retrieve After Prepare

Ask a retrieval question that should be answered by the prepared document.

Expected:

- `Retrieved Sources` returns source chunks from the prepared document
- each result shows filename, source label, chunk number, score, and text

### Answer After Prepare

Ask the same question in `Messages`.

Expected:

- chat shows a user message and assistant answer
- latest answer sources render below the message list
- citations point to chunks from the prepared document

### Manual Buttons Still Work

Use `Parse`, `Chunk`, or `Index` on a document after or instead of `Prepare`.

Expected:

- manual stage buttons still run their original endpoints
- while any pipeline action is running for a document, `Prepare`, `Parse`, `Chunk`, and `Index` are disabled for that document

### Missing API Key Failure

Temporarily remove or rename `OPENAI_API_KEY` in `backend/.env`, restart the backend, upload a small supported document, and click `Prepare`.

Expected:

- preparation fails with a clear API-key-related error
- UI leaves the document row usable
- `Preparing...` clears after failure
- manual buttons remain available for debugging

## Notes

Preparation v1 uses:

```text
uploaded document -> prepare endpoint -> parse -> chunk -> index -> refreshed document metadata
```

The preparation service is intentionally thin glue over existing stage services. It should not duplicate parser, chunker, or indexing internals.
