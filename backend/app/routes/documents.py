import json
import re
import shutil
import uuid
from pathlib import Path

from fastapi import APIRouter, File, HTTPException, UploadFile

from ..chunking.service import (
    EmptyChunkedDocumentError,
    NoParsedSectionsError,
    chunk_document_sections,
)
from ..db import create_document as create_document_in_db
from ..db import get_course, get_document
from ..db import list_chunks_for_document
from ..db import list_parsed_sections_for_document
from ..db import list_documents_for_course as list_documents_for_course_from_db
from ..models import Chunk, Document, ParsedSection
from ..parsing.parsers import (
    EmptyParsedDocumentError,
    UnreadableDocumentError,
    UnsupportedDocumentTypeError,
)
from ..parsing.service import parse_document_row


router = APIRouter()

UPLOAD_ROOT = Path(__file__).resolve().parents[2] / "data" / "uploads"
ALLOWED_EXTENSIONS = {".csv", ".docx", ".md", ".pdf", ".pptx", ".txt", ".xlsx"}


@router.get("/courses/{course_id}/documents")
def list_course_documents(course_id: str) -> list[Document]:
    if get_course(course_id) is None:
        raise HTTPException(status_code=404, detail="Course not found")

    rows = list_documents_for_course_from_db(course_id)
    return [document_from_row(row) for row in rows]


@router.post("/courses/{course_id}/documents", status_code=201)
def upload_course_document(course_id: str, file: UploadFile = File(...)) -> Document:
    if get_course(course_id) is None:
        raise HTTPException(status_code=404, detail="Course not found")

    original_filename = Path(file.filename or "").name.strip()
    if not original_filename:
        raise HTTPException(status_code=400, detail="Filename is required")

    file_extension = Path(original_filename).suffix.lower()
    if file_extension not in ALLOWED_EXTENSIONS:
        raise HTTPException(status_code=400, detail="Unsupported document type")

    document_id = str(uuid.uuid4())
    stored_filename = f"{document_id}{file_extension}"
    course_upload_dir = UPLOAD_ROOT / safe_path_part(course_id)
    storage_path = course_upload_dir / stored_filename

    course_upload_dir.mkdir(parents=True, exist_ok=True)
    with storage_path.open("wb") as destination:
        shutil.copyfileobj(file.file, destination)

    file_size = storage_path.stat().st_size
    if file_size == 0:
        storage_path.unlink(missing_ok=True)
        raise HTTPException(status_code=400, detail="Uploaded file is empty")

    row = create_document_in_db(
        document_id=document_id,
        course_id=course_id,
        original_filename=original_filename,
        stored_filename=stored_filename,
        content_type=file.content_type,
        file_extension=file_extension,
        file_size=file_size,
        storage_path=str(storage_path),
    )
    return document_from_row(row)


@router.get("/documents/{document_id}")
def get_document_metadata(document_id: str) -> Document:
    row = get_document(document_id)
    if row is None:
        raise HTTPException(status_code=404, detail="Document not found")

    return document_from_row(row)


@router.post("/documents/{document_id}/parse")
def parse_document(document_id: str) -> list[ParsedSection]:
    row = get_document(document_id)
    if row is None:
        raise HTTPException(status_code=404, detail="Document not found")

    try:
        sections = parse_document_row(row)
    except UnreadableDocumentError as error:
        raise HTTPException(status_code=400, detail=str(error)) from error
    except EmptyParsedDocumentError as error:
        raise HTTPException(status_code=400, detail=str(error)) from error
    except UnsupportedDocumentTypeError as error:
        raise HTTPException(status_code=400, detail=str(error)) from error
    except UnicodeDecodeError as error:
        raise HTTPException(status_code=400, detail="Document is not valid UTF-8 text") from error
    except OSError as error:
        raise HTTPException(status_code=500, detail="Stored document could not be read") from error

    return [parsed_section_from_row(section) for section in sections]


@router.get("/documents/{document_id}/sections")
def list_document_sections(document_id: str) -> list[ParsedSection]:
    if get_document(document_id) is None:
        raise HTTPException(status_code=404, detail="Document not found")

    rows = list_parsed_sections_for_document(document_id)
    return [parsed_section_from_row(row) for row in rows]


@router.post("/documents/{document_id}/chunks", status_code=201)
def chunk_document(document_id: str) -> list[Chunk]:
    if get_document(document_id) is None:
        raise HTTPException(status_code=404, detail="Document not found")

    try:
        rows = chunk_document_sections(document_id)
    except NoParsedSectionsError as error:
        raise HTTPException(status_code=400, detail=str(error)) from error
    except EmptyChunkedDocumentError as error:
        raise HTTPException(status_code=400, detail=str(error)) from error

    return [chunk_from_row(row) for row in rows]


@router.get("/documents/{document_id}/chunks")
def list_document_chunks(document_id: str) -> list[Chunk]:
    if get_document(document_id) is None:
        raise HTTPException(status_code=404, detail="Document not found")

    rows = list_chunks_for_document(document_id)
    return [chunk_from_row(row) for row in rows]


def document_from_row(row) -> Document:
    return Document(
        id=row["id"],
        course_id=row["course_id"],
        original_filename=row["original_filename"],
        stored_filename=row["stored_filename"],
        content_type=row["content_type"],
        file_extension=row["file_extension"],
        file_size=row["file_size"],
        status=row["status"],
        error=row["error"],
        created_at=row["created_at"],
        updated_at=row["updated_at"],
        parsed_section_count=row["parsed_section_count"],
        chunk_count=row["chunk_count"],
    )


def parsed_section_from_row(row) -> ParsedSection:
    return ParsedSection(
        id=row["id"],
        document_id=row["document_id"],
        section_index=row["section_index"],
        kind=row["kind"],
        label=row["label"],
        text=row["text"],
        metadata=json.loads(row["metadata_json"] or "{}"),
        created_at=row["created_at"],
    )


def chunk_from_row(row) -> Chunk:
    return Chunk(
        id=row["id"],
        document_id=row["document_id"],
        parsed_section_id=row["parsed_section_id"],
        chunk_index=row["chunk_index"],
        text=row["text"],
        metadata=json.loads(row["metadata_json"] or "{}"),
        created_at=row["created_at"],
    )


def safe_path_part(value: str) -> str:
    clean_value = re.sub(r"[^a-zA-Z0-9_-]+", "-", value).strip("-")
    return clean_value or "course"
