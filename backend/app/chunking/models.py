from dataclasses import dataclass, field


@dataclass(frozen=True)
class ChunkingSettings:
    target_char_count: int = 1200
    overlap_char_count: int = 200
    min_chunk_char_count: int = 300

    def __post_init__(self) -> None:
        if self.target_char_count <= 0:
            raise ValueError("target_char_count must be greater than 0")
        if self.overlap_char_count < 0:
            raise ValueError("overlap_char_count must be 0 or greater")
        if self.overlap_char_count >= self.target_char_count:
            raise ValueError("overlap_char_count must be smaller than target_char_count")
        if self.min_chunk_char_count <= 0:
            raise ValueError("min_chunk_char_count must be greater than 0")
        if self.min_chunk_char_count > self.target_char_count:
            raise ValueError("min_chunk_char_count must be no larger than target_char_count")


@dataclass(frozen=True)
class GeneratedChunk:
    parsed_section_id: str
    chunk_index: int
    text: str
    metadata: dict[str, object] = field(default_factory=dict)
