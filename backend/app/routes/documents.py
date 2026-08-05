import re
import shutil
import uuid
from pathlib import Path

from fastapi import APIRouter, File, HTTPException, UploadFile

from ..db import create_document as create_document_in_db
from ..db import get_course, get_document
from ..db import list_documents_for_course as list_documents_for_course_from_db
from ..models import Document


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
    )


def safe_path_part(value: str) -> str:
    clean_value = re.sub(r"[^a-zA-Z0-9_-]+", "-", value).strip("-")
    return clean_value or "course"
