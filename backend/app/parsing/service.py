from pathlib import Path

from ..db import replace_parsed_sections, update_document_status
from .models import ParsedDocumentSection
from .parsers import parse_file


def parse_document_row(document_row) -> list:
    document_id = document_row["id"]

    update_document_status(document_id, "parsing")
    try:
        parsed_document = parse_file(
            Path(document_row["storage_path"]),
            document_row["file_extension"],
        )
        stored_sections = replace_parsed_sections(
            document_id,
            [
                section_to_record(document_id, index, section)
                for index, section in enumerate(parsed_document.sections)
            ],
        )
        update_document_status(document_id, "ready")
        return stored_sections
    except Exception as error:
        update_document_status(document_id, "failed", str(error))
        raise


def section_to_record(
    document_id: str,
    section_index: int,
    section: ParsedDocumentSection,
) -> dict[str, object]:
    return {
        "document_id": document_id,
        "section_index": section_index,
        "kind": section.kind,
        "label": section.label,
        "text": section.text,
        "metadata": section.metadata,
    }
