from fastapi import APIRouter, HTTPException

from ..db import get_course
from ..indexing.embeddings import EmbeddingConfigurationError, EmbeddingGenerationError
from ..models import RetrievedChunk, RetrievalRequest, RetrievalResponse
from ..retrieval.models import RetrievalResult
from ..retrieval.service import (
    EmbeddingDimensionMismatchError,
    EmptyRetrievalQueryError,
    NoIndexedChunksError,
    RetrievalEmbeddingError,
    retrieve_chunks_for_course,
)


router = APIRouter()


@router.post("/courses/{course_id}/retrieve")
def retrieve_course_chunks(course_id: str, payload: RetrievalRequest) -> RetrievalResponse:
    if get_course(course_id) is None:
        raise HTTPException(status_code=404, detail="Course not found")

    try:
        results = retrieve_chunks_for_course(
            course_id,
            payload.question,
            payload.limit,
        )
    except EmptyRetrievalQueryError as error:
        raise HTTPException(status_code=400, detail=str(error)) from error
    except NoIndexedChunksError as error:
        raise HTTPException(status_code=400, detail=str(error)) from error
    except EmbeddingConfigurationError as error:
        raise HTTPException(status_code=500, detail=str(error)) from error
    except EmbeddingGenerationError as error:
        raise HTTPException(status_code=502, detail=str(error)) from error
    except RetrievalEmbeddingError as error:
        raise HTTPException(status_code=500, detail=str(error)) from error
    except EmbeddingDimensionMismatchError as error:
        raise HTTPException(status_code=500, detail=str(error)) from error

    return RetrievalResponse(
        course_id=course_id,
        question=payload.question.strip(),
        results=[retrieved_chunk_from_result(result) for result in results],
    )


def retrieved_chunk_from_result(result: RetrievalResult) -> RetrievedChunk:
    return RetrievedChunk(
        chunk_id=result.chunk_id,
        document_id=result.document_id,
        document_filename=result.document_filename,
        chunk_index=result.chunk_index,
        score=result.score,
        text=result.text,
        metadata=result.metadata,
    )
