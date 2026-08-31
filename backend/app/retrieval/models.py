from dataclasses import dataclass, field


@dataclass(frozen=True)
class RetrievalSettings:
    embedding_model: str = "text-embedding-3-small"
    expected_dimension: int = 1536
    default_limit: int = 5
    max_limit: int = 20

    def __post_init__(self) -> None:
        if not self.embedding_model.strip():
            raise ValueError("embedding_model is required")
        if self.expected_dimension <= 0:
            raise ValueError("expected_dimension must be greater than 0")
        if self.default_limit <= 0:
            raise ValueError("default_limit must be greater than 0")
        if self.max_limit < self.default_limit:
            raise ValueError("max_limit must be greater than or equal to default_limit")


@dataclass(frozen=True)
class IndexedChunk:
    chunk_id: str
    document_id: str
    document_filename: str
    chunk_index: int
    text: str
    metadata: dict[str, object]
    embedding: list[float]
    embedding_model: str
    embedding_dimension: int


@dataclass(frozen=True)
class RetrievalResult:
    chunk_id: str
    document_id: str
    document_filename: str
    chunk_index: int
    text: str
    metadata: dict[str, object] = field(default_factory=dict)
    score: float = 0.0
