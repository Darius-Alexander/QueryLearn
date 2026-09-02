from dataclasses import dataclass, field
from typing import Literal


AnswerMode = Literal["supplemented", "notes_only"]
DEFAULT_ANSWER_MODE: AnswerMode = "supplemented"
SUPPORTED_ANSWER_MODES = {"supplemented", "notes_only"}


@dataclass(frozen=True)
class AnswerCitation:
    citation_number: int
    chunk_id: str
    document_id: str
    document_filename: str
    chunk_index: int
    source_label: str
    score: float


@dataclass(frozen=True)
class AnswerEvidence:
    citation_number: int
    chunk_id: str
    document_id: str
    document_filename: str
    chunk_index: int
    source_label: str
    score: float
    text: str
    metadata: dict[str, object] = field(default_factory=dict)


@dataclass(frozen=True)
class AnswerPromptMessage:
    role: str
    content: str


@dataclass(frozen=True)
class PreparedAnswerContext:
    mode: AnswerMode
    question: str
    citations: list[AnswerCitation]
    evidence: list[AnswerEvidence]
    prompt_messages: list[AnswerPromptMessage]


@dataclass(frozen=True)
class GeneratedAnswer:
    mode: AnswerMode
    question: str
    answer_text: str
    citations: list[AnswerCitation]
    evidence: list[AnswerEvidence]
