from .models import ChunkingSettings


DEFAULT_CHUNKING_SETTINGS = ChunkingSettings()
NATURAL_BREAKS = ("\n\n", "\n", ". ", "? ", "! ", "; ", ", ", " ")


def split_text_into_chunks(
    text: str,
    settings: ChunkingSettings = DEFAULT_CHUNKING_SETTINGS,
) -> list[str]:
    normalized_text = normalize_chunk_text(text)
    if not normalized_text:
        return []

    chunks: list[str] = []
    start = 0

    while start < len(normalized_text):
        remaining_char_count = len(normalized_text) - start
        if remaining_char_count <= settings.target_char_count:
            chunk_text = normalized_text[start:].strip()
            if chunk_text:
                chunks.append(chunk_text)
            break

        target_end = start + settings.target_char_count
        end = choose_chunk_end(normalized_text, start, target_end, settings)
        chunk_text = normalized_text[start:end].strip()
        if chunk_text:
            chunks.append(chunk_text)

        next_start = max(end - settings.overlap_char_count, start + 1)
        if next_start <= start:
            next_start = end
        start = next_start

    return chunks


def choose_chunk_end(
    text: str,
    start: int,
    target_end: int,
    settings: ChunkingSettings,
) -> int:
    earliest_end = start + settings.min_chunk_char_count
    window = text[start:target_end]

    for natural_break in NATURAL_BREAKS:
        break_index = window.rfind(natural_break)
        if break_index == -1:
            continue

        candidate_end = start + break_index + len(natural_break)
        if candidate_end >= earliest_end:
            return candidate_end

    return target_end


def normalize_chunk_text(text: str) -> str:
    normalized_lines = [
        line.rstrip()
        for line in text.replace("\r\n", "\n").replace("\r", "\n").split("\n")
    ]
    return "\n".join(normalized_lines).strip()
