# Retrieval Smoke Checks

Use these manual checks after uploading, parsing, chunking, and indexing course documents.

## Goal

Confirm that retrieval returns useful source chunks, not final answers.

## Setup

- Backend running at `http://127.0.0.1:8001`
- Frontend running at `http://127.0.0.1:5173`
- At least one course has indexed chunks
- `OPENAI_API_KEY` is set in `backend/.env`

## Checks

### Relevant Question

Ask a question that should be answered by the indexed material.

Example:

```text
What is a scalar variable?
```

Expected:

- retrieved chunks come from the correct course
- top chunks mention concepts related to the question
- each result shows filename, source label, score, and chunk text

### Typo-Heavy Question

Ask a recognizable question with spelling mistakes.

Example:

```text
whta is a sclaar varable
```

Expected:

- retrieval still returns plausibly relevant chunks
- scores may differ from the clean question

### Irrelevant Question

Ask something unrelated to the course.

Example:

```text
What are the best pizza toppings?
```

Expected:

- v1 still returns the top ranked chunks because there is no relevance threshold yet
- results should be treated as "least bad matches," not proof that the sources answer the question

## Notes

Retrieval v1 uses:

```text
query embedding -> cosine similarity over indexed course chunks -> top-k source chunks
```

Future answer generation should consume these chunks as evidence, then decide whether the evidence is strong enough to answer.
