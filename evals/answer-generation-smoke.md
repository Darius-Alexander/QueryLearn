# Answer Generation Smoke Checks

Use these manual checks after uploading, parsing, chunking, indexing, and confirming retrieval works for a course.

## Goal

Confirm that QueryLearn can generate useful chat answers from retrieved course sources, with honest citation behavior across both answer modes.

## Setup

- Backend running at `http://127.0.0.1:8001`
- Frontend running at `http://127.0.0.1:5173`
- At least one course has indexed chunks
- `OPENAI_API_KEY` is set in `backend/.env`
- Optional: `OPENAI_ANSWER_MODEL` is set in `backend/.env` if testing a non-default answer model

## Checks

### Relevant Question, Notes + AI Explanation

Select `Notes + AI explanation` and ask a question that should be answered by the indexed material.

Example:

```text
What is a scalar variable?
```

Expected:

- chat shows the user question and assistant answer
- answer is cohesive, not split into separate notes/background excerpts unless naturally needed
- answer cites claims supported by course sources with markers such as `[1]`
- latest answer sources show filename, source label, chunk number, score, and evidence text
- any supplemental background is clearly signaled as general context when it is not in the notes

### Relevant Question, Notes Only

Select `Notes only` and ask the same relevant question.

Expected:

- answer uses only retrieved course source content
- answer cites supported claims
- answer does not add outside examples or facts unless they are present in the retrieved chunks

### Typo-Heavy Question

Ask a recognizable question with spelling mistakes in either mode.

Example:

```text
whta is a sclaar varable
```

Expected:

- retrieval still finds plausibly useful evidence
- assistant answers the intended question if the evidence supports it
- citations still point to course sources

### Irrelevant Question, Notes + AI Explanation

Select `Notes + AI explanation` and ask something unrelated to the indexed course material.

Example:

```text
What are the best pizza toppings?
```

Expected:

- answer does not pretend the course notes answer the question
- answer may provide general background only if useful
- any general background is clearly signaled as not coming from the notes
- citations are used only for claims supported by retrieved course chunks

### Irrelevant Question, Notes Only

Select `Notes only` and ask the same unrelated question.

Expected:

- answer says the notes do not contain enough evidence
- answer does not answer from outside knowledge
- any citations shown should not be treated as proof that the notes answer the question

## Notes

Answer generation currently uses:

```text
chat question -> course-scoped retrieval -> prompt with retrieved chunks -> OpenAI answer call -> persisted user/assistant messages
```

Current citation metadata is returned with the live answer response and shown for the latest answer only. Assistant message text persists in SQLite, but citation history does not persist yet.
