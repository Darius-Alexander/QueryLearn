from fastapi import APIRouter, HTTPException

from ..answering.client import AnswerConfigurationError, AnswerGenerationError
from ..answering.models import AnswerCitation, AnswerEvidence, GeneratedAnswer
from ..answering.service import (
    EmptyAnswerQuestionError,
    EmptyGeneratedAnswerError,
    UnsupportedAnswerModeError,
    generate_grounded_answer,
    normalize_answer_mode,
)
from ..db import create_message as create_message_in_db
from ..db import get_chat, list_messages_for_chat
from ..indexing.embeddings import EmbeddingConfigurationError, EmbeddingGenerationError
from ..models import (
    AnswerCitationResponse,
    AnswerEvidenceResponse,
    AnswerRequest,
    AnswerResponse,
    Message,
    MessageCreate,
)
from ..retrieval.service import (
    EmbeddingDimensionMismatchError,
    EmptyRetrievalQueryError,
    NoIndexedChunksError,
    RetrievalEmbeddingError,
    retrieve_chunks_for_course,
)


router = APIRouter()


@router.get("/chats/{chat_id}/messages")
def list_chat_messages(chat_id: str) -> list[Message]:
    if get_chat(chat_id) is None:
        raise HTTPException(status_code=404, detail="Chat not found")

    rows = list_messages_for_chat(chat_id)
    return [message_from_row(row) for row in rows]


@router.post("/chats/{chat_id}/messages", status_code=201)
def create_chat_message(chat_id: str, payload: MessageCreate) -> Message:
    if get_chat(chat_id) is None:
        raise HTTPException(status_code=404, detail="Chat not found")

    if payload.role != "user":
        raise HTTPException(status_code=400, detail="Only user messages can be created directly")

    if not payload.content.strip():
        raise HTTPException(status_code=400, detail="Message content is required")

    row = create_message_in_db(chat_id, payload.role, payload.content)
    return message_from_row(row)


@router.post("/chats/{chat_id}/answers", status_code=201)
def create_chat_answer(chat_id: str, payload: AnswerRequest) -> AnswerResponse:
    chat = get_chat(chat_id)
    if chat is None:
        raise HTTPException(status_code=404, detail="Chat not found")

    try:
        answer_mode = normalize_answer_mode(payload.mode)
        retrieval_results = retrieve_chunks_for_course(
            chat["course_id"],
            payload.question,
            payload.limit,
        )
        generated_answer = generate_grounded_answer(
            payload.question,
            retrieval_results,
            answer_mode,
        )
    except EmptyRetrievalQueryError as error:
        raise HTTPException(status_code=400, detail=str(error)) from error
    except NoIndexedChunksError as error:
        raise HTTPException(status_code=400, detail=str(error)) from error
    except UnsupportedAnswerModeError as error:
        raise HTTPException(status_code=400, detail=str(error)) from error
    except EmptyAnswerQuestionError as error:
        raise HTTPException(status_code=400, detail=str(error)) from error
    except EmbeddingConfigurationError as error:
        raise HTTPException(status_code=500, detail=str(error)) from error
    except AnswerConfigurationError as error:
        raise HTTPException(status_code=500, detail=str(error)) from error
    except EmbeddingGenerationError as error:
        raise HTTPException(status_code=502, detail=str(error)) from error
    except AnswerGenerationError as error:
        raise HTTPException(status_code=502, detail=str(error)) from error
    except EmptyGeneratedAnswerError as error:
        raise HTTPException(status_code=502, detail=str(error)) from error
    except RetrievalEmbeddingError as error:
        raise HTTPException(status_code=500, detail=str(error)) from error
    except EmbeddingDimensionMismatchError as error:
        raise HTTPException(status_code=500, detail=str(error)) from error

    user_message = message_from_row(create_message_in_db(chat_id, "user", generated_answer.question))
    assistant_message = message_from_row(
        create_message_in_db(chat_id, "assistant", generated_answer.answer_text)
    )

    return answer_response_from_generated_answer(
        chat_id=chat_id,
        course_id=chat["course_id"],
        generated_answer=generated_answer,
        user_message=user_message,
        assistant_message=assistant_message,
    )


def message_from_row(row) -> Message:
    return Message(
        id=row["id"],
        chat_id=row["chat_id"],
        role=row["role"],
        content=row["content"],
        created_at=row["created_at"],
    )


def answer_response_from_generated_answer(
    chat_id: str,
    course_id: str,
    generated_answer: GeneratedAnswer,
    user_message: Message,
    assistant_message: Message,
) -> AnswerResponse:
    return AnswerResponse(
        chat_id=chat_id,
        course_id=course_id,
        mode=generated_answer.mode,
        question=generated_answer.question,
        answer_text=generated_answer.answer_text,
        user_message=user_message,
        assistant_message=assistant_message,
        citations=[
            answer_citation_response_from_model(citation)
            for citation in generated_answer.citations
        ],
        evidence=[
            answer_evidence_response_from_model(evidence)
            for evidence in generated_answer.evidence
        ],
    )


def answer_citation_response_from_model(citation: AnswerCitation) -> AnswerCitationResponse:
    return AnswerCitationResponse(
        citation_number=citation.citation_number,
        chunk_id=citation.chunk_id,
        document_id=citation.document_id,
        document_filename=citation.document_filename,
        chunk_index=citation.chunk_index,
        source_label=citation.source_label,
        score=citation.score,
    )


def answer_evidence_response_from_model(evidence: AnswerEvidence) -> AnswerEvidenceResponse:
    return AnswerEvidenceResponse(
        citation_number=evidence.citation_number,
        chunk_id=evidence.chunk_id,
        document_id=evidence.document_id,
        document_filename=evidence.document_filename,
        chunk_index=evidence.chunk_index,
        source_label=evidence.source_label,
        score=evidence.score,
        text=evidence.text,
        metadata=evidence.metadata,
    )
