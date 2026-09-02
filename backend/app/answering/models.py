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


@dataclass(frozen=True)
class AnswerGenerationSettings:
    model: str = "gpt-4.1-mini"
    temperature: float = 0.2
    max_output_tokens: int = 800

    def __post_init__(self) -> None:
        if not self.model.strip():
            raise ValueError("model is required")
        if self.temperature < 0:
            raise ValueError("temperature must be 0 or greater")
        if self.max_output_tokens <= 0:
            raise ValueError("max_output_tokens must be greater than 0")
