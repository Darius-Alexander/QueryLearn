import csv
from pathlib import Path

from .models import ParsedDocument, ParsedDocumentSection


TEXT_EXTENSIONS = {".md", ".txt"}
CSV_EXTENSIONS = {".csv"}


class UnsupportedDocumentTypeError(ValueError):
    pass


def parse_file(file_path: Path, file_extension: str) -> ParsedDocument:
    normalized_extension = file_extension.lower()
    if normalized_extension in TEXT_EXTENSIONS:
        return parse_text_file(file_path)
    if normalized_extension in CSV_EXTENSIONS:
        return parse_csv_file(file_path)

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


def parse_csv_file(file_path: Path) -> ParsedDocument:
    with file_path.open("r", encoding="utf-8-sig", newline="") as csv_file:
        rows = list(csv.reader(csv_file))

    text = format_csv_rows(rows)
    row_count = len(rows)
    column_count = max((len(row) for row in rows), default=0)

    return ParsedDocument(
        sections=[
            ParsedDocumentSection(
                kind="table",
                label="CSV table",
                text=text,
                metadata={
                    "parser": "csv",
                    "row_count": row_count,
                    "column_count": column_count,
                },
            )
        ]
    )


def format_csv_rows(rows: list[list[str]]) -> str:
    return "\n".join(
        f"Row {row_index}: {format_csv_row(row)}"
        for row_index, row in enumerate(rows, start=1)
    ).strip()


def format_csv_row(row: list[str]) -> str:
    return " | ".join(normalize_text(cell) for cell in row)


def normalize_text(text: str) -> str:
    return text.replace("\r\n", "\n").replace("\r", "\n").strip()
