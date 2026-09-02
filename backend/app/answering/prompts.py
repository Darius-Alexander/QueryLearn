from .models import AnswerEvidence, AnswerMode, AnswerPromptMessage


BASE_SYSTEM_PROMPT = """You are QueryLearn, a study assistant for students.
Help students understand their course material clearly and accurately.
Cite course-supported claims with source markers like [1], [2], and [3].
Only cite a claim when the provided source chunk supports it.
Do not cite supplemental background knowledge to the course sources."""

SUPPLEMENTED_MODE_PROMPT = """Answer mode: Notes + AI explanation.
Write one cohesive answer.
Use the course sources as the primary authority.
You may add general background knowledge when it helps the student understand.
Briefly signal when a point is supplemental and not found in the course sources.
Do not pretend supplemental background came from the sources."""

NOTES_ONLY_MODE_PROMPT = """Answer mode: Notes only.
Write one cohesive answer.
Use only the provided course sources.
If the sources do not contain enough evidence, say so clearly.
Do not add outside knowledge."""


def build_answer_messages(
    question: str,
    evidence: list[AnswerEvidence],
    mode: AnswerMode,
) -> list[AnswerPromptMessage]:
    return [
        AnswerPromptMessage(
            role="system",
            content="\n\n".join(
                [
                    BASE_SYSTEM_PROMPT,
                    mode_prompt(mode),
                ]
            ),
        ),
        AnswerPromptMessage(
            role="user",
            content="\n\n".join(
                [
                    f"Student question:\n{question}",
                    f"Course sources:\n{format_evidence_block(evidence)}",
                    "Answer the student using the selected answer mode.",
                ]
            ),
        ),
    ]


def mode_prompt(mode: AnswerMode) -> str:
    if mode == "supplemented":
        return SUPPLEMENTED_MODE_PROMPT
    if mode == "notes_only":
        return NOTES_ONLY_MODE_PROMPT

    raise ValueError(f"Unsupported answer mode: {mode}")


def format_evidence_block(evidence: list[AnswerEvidence]) -> str:
    if not evidence:
        return "No course sources were retrieved."

    return "\n\n".join(format_evidence_item(item) for item in evidence)


def format_evidence_item(evidence: AnswerEvidence) -> str:
    return "\n".join(
        [
            (
                f"[{evidence.citation_number}] {evidence.document_filename}, "
                f"{evidence.source_label}, Chunk {evidence.chunk_index + 1}, "
                f"Score {evidence.score:.3f}"
            ),
            evidence.text,
        ]
    )
