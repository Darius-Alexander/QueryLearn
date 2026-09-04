from collections.abc import Callable, Sequence
from typing import cast

from ..retrieval.models import RetrievalResult
from .client import generate_answer_text
from .models import (
    DEFAULT_ANSWER_MODE,
    DEFAULT_ANSWER_MODEL_CHOICE,
    SUPPORTED_ANSWER_MODES,
    AnswerCitation,
    AnswerEvidence,
    AnswerGenerationSettings,
    AnswerPromptMessage,
    AnswerMode,
    GeneratedAnswer,
    PreparedAnswerContext,
    normalize_answer_model_choice,
)
from .prompts import build_answer_messages


AnswerGenerator = Callable[[list[AnswerPromptMessage], AnswerGenerationSettings], str]


class EmptyAnswerQuestionError(ValueError):
    pass


class UnsupportedAnswerModeError(ValueError):
    pass


class EmptyGeneratedAnswerError(ValueError):
    pass


def generate_grounded_answer(
    question: str,
    retrieval_results: Sequence[RetrievalResult],
    mode: str | None = DEFAULT_ANSWER_MODE,
    model_choice: str | None = DEFAULT_ANSWER_MODEL_CHOICE,
    generation_settings: AnswerGenerationSettings = AnswerGenerationSettings(),
    answer_generator: AnswerGenerator = generate_answer_text,
) -> GeneratedAnswer:
    context = prepare_answer_context(question, retrieval_results, mode)
    normalized_model_choice = normalize_answer_model_choice(model_choice)
    answer_text = answer_generator(context.prompt_messages, generation_settings).strip()
    if not answer_text:
        raise EmptyGeneratedAnswerError("Answer generation produced an empty answer")

    return GeneratedAnswer(
        mode=context.mode,
        question=context.question,
        answer_text=answer_text,
        model_choice=normalized_model_choice,
        model=generation_settings.model,
        citations=context.citations,
        evidence=context.evidence,
    )


def prepare_answer_context(
    question: str,
    retrieval_results: Sequence[RetrievalResult],
    mode: str | None = DEFAULT_ANSWER_MODE,
) -> PreparedAnswerContext:
    clean_question = question.strip()
    if not clean_question:
        raise EmptyAnswerQuestionError("Question is required for answer generation")

    answer_mode = normalize_answer_mode(mode)
    evidence = build_answer_evidence(retrieval_results)
    citations = build_citations(evidence)
    prompt_messages = build_answer_messages(clean_question, evidence, answer_mode)

    return PreparedAnswerContext(
        mode=answer_mode,
        question=clean_question,
        citations=citations,
        evidence=evidence,
        prompt_messages=prompt_messages,
    )


def normalize_answer_mode(mode: str | None) -> AnswerMode:
    if mode is None:
        return DEFAULT_ANSWER_MODE

    clean_mode = mode.strip()
    if clean_mode in SUPPORTED_ANSWER_MODES:
        return cast(AnswerMode, clean_mode)

    raise UnsupportedAnswerModeError(
        f"Unsupported answer mode: {mode}. Supported modes are: "
        f"{', '.join(sorted(SUPPORTED_ANSWER_MODES))}"
    )


def build_answer_evidence(
    retrieval_results: Sequence[RetrievalResult],
) -> list[AnswerEvidence]:
    return [
        AnswerEvidence(
            citation_number=index,
            chunk_id=result.chunk_id,
            document_id=result.document_id,
            document_filename=result.document_filename,
            chunk_index=result.chunk_index,
            source_label=source_label_from_metadata(result.metadata),
            score=result.score,
            text=result.text,
            metadata=dict(result.metadata),
        )
        for index, result in enumerate(retrieval_results, start=1)
    ]


def build_citations(evidence: Sequence[AnswerEvidence]) -> list[AnswerCitation]:
    return [
        AnswerCitation(
            citation_number=item.citation_number,
            chunk_id=item.chunk_id,
            document_id=item.document_id,
            document_filename=item.document_filename,
            chunk_index=item.chunk_index,
            source_label=item.source_label,
            score=item.score,
        )
        for item in evidence
    ]


def source_label_from_metadata(metadata: dict[str, object]) -> str:
    page_number = metadata.get("page_number")
    if isinstance(page_number, int) and not isinstance(page_number, bool):
        return f"Page {page_number}"

    slide_number = metadata.get("slide_number")
    if isinstance(slide_number, int) and not isinstance(slide_number, bool):
        return f"Slide {slide_number}"

    sheet_name = metadata.get("sheet_name")
    if isinstance(sheet_name, str) and sheet_name.strip():
        return f"Sheet: {sheet_name.strip()}"

    parsed_section_label = metadata.get("parsed_section_label")
    if isinstance(parsed_section_label, str) and parsed_section_label.strip():
        return parsed_section_label.strip()

    return "Source section"
