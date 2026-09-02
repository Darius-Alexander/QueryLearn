import sqlite3

from ..chunking.service import chunk_document_sections
from ..db import get_document
from ..indexing.service import index_document_chunks
from ..parsing.service import parse_document_row


class DocumentPreparationNotFoundError(ValueError):
    pass


def prepare_document(document_id: str) -> sqlite3.Row:
    document = get_document(document_id)
    if document is None:
        raise DocumentPreparationNotFoundError("Document not found")

    parse_document_row(document)
    chunk_document_sections(document_id)
    index_document_chunks(document_id)

    prepared_document = get_document(document_id)
    if prepared_document is None:
        raise DocumentPreparationNotFoundError("Document not found after preparation")

    return prepared_document
