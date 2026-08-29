import os
from pathlib import Path

from .models import EmbeddingSettings, GeneratedEmbedding


BACKEND_ENV_PATH = Path(__file__).resolve().parents[2] / ".env"
DEFAULT_EMBEDDING_SETTINGS = EmbeddingSettings()


class EmbeddingConfigurationError(RuntimeError):
    pass


class EmbeddingGenerationError(RuntimeError):
    pass


def generate_embeddings(
    texts: list[str],
    settings: EmbeddingSettings = DEFAULT_EMBEDDING_SETTINGS,
) -> list[GeneratedEmbedding]:
    clean_texts = clean_embedding_texts(texts)
    if not clean_texts:
        return []

    load_backend_env()
    api_key = os.environ.get("OPENAI_API_KEY", "").strip()
    if not api_key:
        raise EmbeddingConfigurationError("OPENAI_API_KEY is required to generate embeddings")

    try:
        from openai import OpenAI
    except ImportError as error:
        raise EmbeddingConfigurationError("The openai Python package is required") from error

    client = OpenAI(api_key=api_key)
    try:
        response = client.embeddings.create(
            model=settings.model,
            input=clean_texts,
        )
    except Exception as error:
        raise EmbeddingGenerationError("Could not generate embeddings") from error

    response_data = sorted(response.data, key=lambda item: item.index)
    if len(response_data) != len(clean_texts):
        raise EmbeddingGenerationError("Embedding response count did not match input count")

    generated_embeddings: list[GeneratedEmbedding] = []
    for text, embedding_data in zip(clean_texts, response_data):
        embedding = list(embedding_data.embedding)
        if len(embedding) != settings.expected_dimension:
            raise EmbeddingGenerationError(
                f"Expected {settings.expected_dimension} dimensions, got {len(embedding)}"
            )

        generated_embeddings.append(
            GeneratedEmbedding(
                text=text,
                embedding=embedding,
                embedding_model=response.model or settings.model,
                embedding_dimension=len(embedding),
            )
        )

    return generated_embeddings


def clean_embedding_texts(texts: list[str]) -> list[str]:
    return [text.strip() for text in texts if text.strip()]


def load_backend_env() -> None:
    try:
        from dotenv import load_dotenv
    except ImportError:
        return

    load_dotenv(BACKEND_ENV_PATH)
