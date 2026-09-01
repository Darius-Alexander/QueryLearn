import json
import math
import sqlite3
from collections.abc import Callable

from ..db import list_indexed_chunks_for_course
from ..indexing.embeddings import generate_embeddings
from ..indexing.models import EmbeddingSettings, GeneratedEmbedding
from .models import (
    DEFAULT_RETRIEVAL_SETTINGS,
    IndexedChunk,
    RetrievalResult,
    RetrievalSettings,
)


EmbeddingGenerator = Callable[[list[str], EmbeddingSettings], list[GeneratedEmbedding]]


class EmptyRetrievalQueryError(ValueError):
    pass


class NoIndexedChunksError(ValueError):
    pass


class RetrievalEmbeddingError(ValueError):
    pass


class EmbeddingDimensionMismatchError(ValueError):
    pass


def retrieve_chunks_for_course(
    course_id: str,
    question: str,
    limit: int | None = None,
    settings: RetrievalSettings = DEFAULT_RETRIEVAL_SETTINGS,
    embedding_generator: EmbeddingGenerator = generate_embeddings,
) -> list[RetrievalResult]:
    clean_question = question.strip()
    if not clean_question:
        raise EmptyRetrievalQueryError("Question is required for retrieval")

    result_limit = normalize_limit(limit, settings)
    indexed_chunks = [
        indexed_chunk_from_row(row)
        for row in list_indexed_chunks_for_course(course_id, settings.embedding_model)
    ]
    if not indexed_chunks:
        raise NoIndexedChunksError("Course has no indexed chunks to retrieve from")

    query_embedding = generate_query_embedding(clean_question, settings, embedding_generator)
    results = [
        retrieval_result_from_indexed_chunk(
            chunk,
            cosine_similarity(query_embedding, chunk.embedding),
        )
        for chunk in indexed_chunks
    ]
    return sorted(results, key=lambda result: result.score, reverse=True)[:result_limit]


def normalize_limit(limit: int | None, settings: RetrievalSettings) -> int:
    if limit is None:
        return settings.default_limit

    return min(max(limit, 1), settings.max_limit)


def generate_query_embedding(
    question: str,
    settings: RetrievalSettings,
    embedding_generator: EmbeddingGenerator,
) -> list[float]:
    generated_embeddings = embedding_generator(
        [question],
        EmbeddingSettings(
            model=settings.embedding_model,
            expected_dimension=settings.expected_dimension,
        ),
    )
    if len(generated_embeddings) != 1:
        raise RetrievalEmbeddingError("Expected exactly one query embedding")

    query_embedding = generated_embeddings[0]
    if query_embedding.embedding_dimension != settings.expected_dimension:
        raise EmbeddingDimensionMismatchError(
            f"Expected query embedding dimension {settings.expected_dimension}, "
            f"got {query_embedding.embedding_dimension}"
        )

    return query_embedding.embedding


def indexed_chunk_from_row(row: sqlite3.Row) -> IndexedChunk:
    metadata = metadata_from_json(row["metadata_json"])
    metadata.setdefault("parsed_section_id", row["parsed_section_id"])
    metadata.setdefault("parsed_section_index", row["parsed_section_index"])
    metadata.setdefault("parsed_section_kind", row["parsed_section_kind"])
    metadata.setdefault("parsed_section_label", row["parsed_section_label"])

    embedding = embedding_from_json(row["embedding_json"])
    embedding_dimension = row["embedding_dimension"]
    if len(embedding) != embedding_dimension:
        raise EmbeddingDimensionMismatchError(
            f"Expected stored embedding dimension {embedding_dimension}, got {len(embedding)}"
        )

    return IndexedChunk(
        chunk_id=row["chunk_id"],
        document_id=row["document_id"],
        document_filename=row["document_filename"],
        chunk_index=row["chunk_index"],
        text=row["text"],
        metadata=metadata,
        embedding=embedding,
        embedding_model=row["embedding_model"],
        embedding_dimension=embedding_dimension,
    )


def retrieval_result_from_indexed_chunk(chunk: IndexedChunk, score: float) -> RetrievalResult:
    return RetrievalResult(
        chunk_id=chunk.chunk_id,
        document_id=chunk.document_id,
        document_filename=chunk.document_filename,
        chunk_index=chunk.chunk_index,
        text=chunk.text,
        metadata=chunk.metadata,
        score=score,
    )


def cosine_similarity(left: list[float], right: list[float]) -> float:
    if len(left) != len(right):
        raise EmbeddingDimensionMismatchError(
            f"Cannot compare vectors with dimensions {len(left)} and {len(right)}"
        )

    left_norm = vector_norm(left)
    right_norm = vector_norm(right)
    if left_norm == 0 or right_norm == 0:
        raise EmbeddingDimensionMismatchError("Cannot compare zero-length embedding vectors")

    dot_product = sum(left_value * right_value for left_value, right_value in zip(left, right))
    return dot_product / (left_norm * right_norm)


def vector_norm(vector: list[float]) -> float:
    return math.sqrt(sum(value * value for value in vector))


def metadata_from_json(metadata_json: str | None) -> dict[str, object]:
    if not metadata_json:
        return {}

    metadata = json.loads(metadata_json)
    if not isinstance(metadata, dict):
        return {}

    return metadata


def embedding_from_json(embedding_json: str) -> list[float]:
    embedding = json.loads(embedding_json)
    if not isinstance(embedding, list):
        raise RetrievalEmbeddingError("Stored embedding is not a list")

    return [float(value) for value in embedding]
