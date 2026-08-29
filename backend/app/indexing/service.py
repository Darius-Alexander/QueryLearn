import sqlite3
from collections.abc import Callable

from ..db import list_chunks_for_document, replace_chunk_embeddings
from .embeddings import generate_embeddings
from .models import GeneratedEmbedding


EmbeddingGenerator = Callable[[list[str]], list[GeneratedEmbedding]]


class NoChunksToIndexError(ValueError):
    pass


class EmptyIndexedDocumentError(ValueError):
    pass


class EmbeddingCountMismatchError(ValueError):
    pass


def index_document_chunks(
    document_id: str,
    embedding_generator: EmbeddingGenerator = generate_embeddings,
) -> list[sqlite3.Row]:
    chunks = list_chunks_for_document(document_id)
    if not chunks:
        raise NoChunksToIndexError("Document has no chunks to index")

    generated_embeddings = embedding_generator([chunk["text"] for chunk in chunks])
    if not generated_embeddings:
        raise EmptyIndexedDocumentError("Document did not produce any embeddings")
    if len(generated_embeddings) != len(chunks):
        raise EmbeddingCountMismatchError("Embedding count did not match chunk count")

    return replace_chunk_embeddings(
        document_id,
        [
            {
                "chunk_id": chunk["id"],
                "embedding_model": generated_embedding.embedding_model,
                "embedding_dimension": generated_embedding.embedding_dimension,
                "embedding": generated_embedding.embedding,
            }
            for chunk, generated_embedding in zip(chunks, generated_embeddings)
        ],
    )
