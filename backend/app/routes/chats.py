from fastapi import APIRouter, HTTPException

from ..db import create_message as create_message_in_db
from ..db import get_chat, list_messages_for_chat
from ..models import Message, MessageCreate


router = APIRouter()


@router.get("/chats/{chat_id}/messages")
def list_chat_messages(chat_id: str) -> list[Message]:
    if get_chat(chat_id) is None:
        raise HTTPException(status_code=404, detail="Chat not found")

    rows = list_messages_for_chat(chat_id)
    return [
        Message(
            id=row["id"],
            chat_id=row["chat_id"],
            role=row["role"],
            content=row["content"],
            created_at=row["created_at"],
        )
        for row in rows
    ]


@router.post("/chats/{chat_id}/messages", status_code=201)
def create_chat_message(chat_id: str, payload: MessageCreate) -> Message:
    if get_chat(chat_id) is None:
        raise HTTPException(status_code=404, detail="Chat not found")

    if payload.role != "user":
        raise HTTPException(status_code=400, detail="Only user messages can be created directly")

    if not payload.content.strip():
        raise HTTPException(status_code=400, detail="Message content is required")

    row = create_message_in_db(chat_id, payload.role, payload.content)
    return Message(
        id=row["id"],
        chat_id=row["chat_id"],
        role=row["role"],
        content=row["content"],
        created_at=row["created_at"],
    )
