from dataclasses import dataclass, field
from typing import Literal, cast


AnswerMode = Literal["supplemented", "notes_only"]
DEFAULT_ANSWER_MODE: AnswerMode = "supplemented"
SUPPORTED_ANSWER_MODES = {"supplemented", "notes_only"}

AnswerModelChoice = Literal["backend_default", "economy", "fast", "balanced", "deep"]
DEFAULT_ANSWER_MODEL_CHOICE: AnswerModelChoice = "backend_default"
DEFAULT_ANSWER_GENERATION_MODEL = "gpt-4.1-mini"
ANSWER_MODEL_REGISTRY: dict[AnswerModelChoice, str] = {
    "economy": "gpt-5-nano",
    "fast": "gpt-5.6-luna",
    "balanced": "gpt-5.6-terra",
    "deep": "gpt-5.6-sol",
}
SUPPORTED_ANSWER_MODEL_CHOICES = {
    DEFAULT_ANSWER_MODEL_CHOICE,
    *ANSWER_MODEL_REGISTRY.keys(),
}


def normalize_answer_model_choice(choice: str | None) -> AnswerModelChoice:
    if choice is None:
        return DEFAULT_ANSWER_MODEL_CHOICE

    clean_choice = choice.strip()
    if clean_choice in SUPPORTED_ANSWER_MODEL_CHOICES:
        return cast(AnswerModelChoice, clean_choice)

    raise ValueError(
        f"Unsupported answer model choice: {choice}. Supported choices are: "
        f"{', '.join(sorted(SUPPORTED_ANSWER_MODEL_CHOICES))}"
    )


def resolve_answer_model_choice(choice: str | None, backend_default_model: str) -> str:
    normalized_choice = normalize_answer_model_choice(choice)
    if normalized_choice == "backend_default":
        resolved_model = backend_default_model.strip()
    else:
        resolved_model = ANSWER_MODEL_REGISTRY[normalized_choice]

    if not resolved_model:
        raise ValueError("resolved answer model is required")

    return resolved_model


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
    model: str = DEFAULT_ANSWER_GENERATION_MODEL
    temperature: float = 0.2
    max_output_tokens: int = 800

    def __post_init__(self) -> None:
        if not self.model.strip():
            raise ValueError("model is required")
        if self.temperature < 0:
            raise ValueError("temperature must be 0 or greater")
        if self.max_output_tokens <= 0:
            raise ValueError("max_output_tokens must be greater than 0")
