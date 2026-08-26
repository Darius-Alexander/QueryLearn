import json
import sqlite3

from ..db import list_parsed_sections_for_document, replace_chunks
from .chunkers import DEFAULT_CHUNKING_SETTINGS, split_text_into_chunks
from .models import ChunkingSettings, GeneratedChunk


class NoParsedSectionsError(ValueError):
    pass


class EmptyChunkedDocumentError(ValueError):
    pass


def chunk_document_sections(
    document_id: str,
    settings: ChunkingSettings = DEFAULT_CHUNKING_SETTINGS,
) -> list[sqlite3.Row]:
    parsed_sections = list_parsed_sections_for_document(document_id)
    if not parsed_sections:
        raise NoParsedSectionsError("Document has no parsed sections to chunk")

    generated_chunks = generate_chunks_from_sections(parsed_sections, settings)
    if not generated_chunks:
        raise EmptyChunkedDocumentError("Document did not produce any non-empty chunks")

    return replace_chunks(
        document_id,
        [
            {
                "parsed_section_id": chunk.parsed_section_id,
                "chunk_index": chunk.chunk_index,
                "text": chunk.text,
                "metadata": chunk.metadata,
            }
            for chunk in generated_chunks
        ],
    )


def generate_chunks_from_sections(
    parsed_sections: list[sqlite3.Row],
    settings: ChunkingSettings = DEFAULT_CHUNKING_SETTINGS,
) -> list[GeneratedChunk]:
    chunks: list[GeneratedChunk] = []

    for section in parsed_sections:
        section_metadata = metadata_from_json(section["metadata_json"])
        section_chunks = split_text_into_chunks(section["text"], settings)

        for chunk_text in section_chunks:
            chunks.append(
                GeneratedChunk(
                    parsed_section_id=section["id"],
                    chunk_index=len(chunks),
                    text=chunk_text,
                    metadata={
                        **section_metadata,
                        "chunker": "character",
                        "target_char_count": settings.target_char_count,
                        "overlap_char_count": settings.overlap_char_count,
                        "parsed_section_index": section["section_index"],
                        "parsed_section_kind": section["kind"],
                        "parsed_section_label": section["label"],
                    },
                )
            )

    return chunks


def metadata_from_json(metadata_json: str | None) -> dict[str, object]:
    if not metadata_json:
        return {}

    metadata = json.loads(metadata_json)
    if not isinstance(metadata, dict):
        return {}

    return metadata
