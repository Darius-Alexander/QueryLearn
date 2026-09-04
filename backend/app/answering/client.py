import os
from pathlib import Path

from .models import AnswerGenerationSettings, AnswerPromptMessage


BACKEND_ENV_PATH = Path(__file__).resolve().parents[2] / ".env"
DEFAULT_ANSWER_GENERATION_SETTINGS = AnswerGenerationSettings()


class AnswerConfigurationError(RuntimeError):
    pass


class AnswerGenerationError(RuntimeError):
    pass


def generate_answer_text(
    prompt_messages: list[AnswerPromptMessage],
    settings: AnswerGenerationSettings = DEFAULT_ANSWER_GENERATION_SETTINGS,
) -> str:
    if not prompt_messages:
        return ""

    load_backend_env()
    api_key = os.environ.get("OPENAI_API_KEY", "").strip()
    if not api_key:
        raise AnswerConfigurationError("OPENAI_API_KEY is required to generate answers")

    try:
        from openai import OpenAI
    except ImportError as error:
        raise AnswerConfigurationError("The openai Python package is required") from error

    model = resolve_answer_generation_model(settings)
    client = OpenAI(api_key=api_key)
    try:
        response = client.responses.create(
            model=model,
            instructions=system_instructions_from_messages(prompt_messages),
            input=user_input_from_messages(prompt_messages),
            temperature=settings.temperature,
            max_output_tokens=settings.max_output_tokens,
        )
    except Exception as error:
        raise AnswerGenerationError("Could not generate answer") from error

    return extract_response_text(response)


def resolve_answer_generation_model(
    settings: AnswerGenerationSettings = DEFAULT_ANSWER_GENERATION_SETTINGS,
) -> str:
    load_backend_env()
    if not settings.use_backend_default_model:
        return settings.model

    return os.environ.get("OPENAI_ANSWER_MODEL", settings.model).strip() or settings.model


def system_instructions_from_messages(prompt_messages: list[AnswerPromptMessage]) -> str:
    return "\n\n".join(
        message.content.strip()
        for message in prompt_messages
        if message.role == "system" and message.content.strip()
    )


def user_input_from_messages(prompt_messages: list[AnswerPromptMessage]) -> str:
    return "\n\n".join(
        message.content.strip()
        for message in prompt_messages
        if message.role != "system" and message.content.strip()
    )


def extract_response_text(response) -> str:
    output_text = getattr(response, "output_text", None)
    if isinstance(output_text, str):
        return output_text.strip()

    text_parts: list[str] = []
    for output_item in getattr(response, "output", []) or []:
        for content_item in getattr(output_item, "content", []) or []:
            text = getattr(content_item, "text", None)
            if isinstance(text, str) and text.strip():
                text_parts.append(text.strip())

    return "\n".join(text_parts).strip()


def load_backend_env() -> None:
    try:
        from dotenv import load_dotenv
    except ImportError:
        return

    load_dotenv(BACKEND_ENV_PATH)
