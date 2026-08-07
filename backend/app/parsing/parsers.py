from pathlib import Path

from .models import ParsedDocument, ParsedDocumentSection


TEXT_EXTENSIONS = {".md", ".txt"}


class UnsupportedDocumentTypeError(ValueError):
    pass


def parse_file(file_path: Path, file_extension: str) -> ParsedDocument:
    normalized_extension = file_extension.lower()
    if normalized_extension in TEXT_EXTENSIONS:
        return parse_text_file(file_path)

    raise UnsupportedDocumentTypeError(f"Parsing is not supported for {file_extension} files yet")


def parse_text_file(file_path: Path) -> ParsedDocument:
    text = file_path.read_text(encoding="utf-8-sig")
    normalized_text = normalize_text(text)

    return ParsedDocument(
        sections=[
            ParsedDocumentSection(
                kind="text",
                label="Document text",
                text=normalized_text,
                metadata={"parser": "text"},
            )
        ]
    )


def normalize_text(text: str) -> str:
    return text.replace("\r\n", "\n").replace("\r", "\n").strip()
