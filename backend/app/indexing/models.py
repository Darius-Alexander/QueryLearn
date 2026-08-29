from dataclasses import dataclass


@dataclass(frozen=True)
class EmbeddingSettings:
    model: str = "text-embedding-3-small"
    expected_dimension: int = 1536

    def __post_init__(self) -> None:
        if not self.model.strip():
            raise ValueError("model is required")
        if self.expected_dimension <= 0:
            raise ValueError("expected_dimension must be greater than 0")


@dataclass(frozen=True)
class GeneratedEmbedding:
    text: str
    embedding: list[float]
    embedding_model: str
    embedding_dimension: int
