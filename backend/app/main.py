from fastapi import FastAPI, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel

from .db import create_chat as create_chat_in_db
from .db import create_course as create_course_in_db
from .db import create_message as create_message_in_db
from .db import get_chat
from .db import get_course
from .db import init_db, list_chats_for_course, list_courses as list_courses_from_db
from .db import list_messages_for_chat

app = FastAPI(title="QueryLearn API")

app.add_middleware(
    CORSMiddleware,
    allow_origins=[
        "http://localhost:5173",
        "http://127.0.0.1:5173",
    ],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)


class Course(BaseModel):
    id: str
    name: str


class CourseCreate(BaseModel):
    name: str


class Chat(BaseModel):
    id: str
    course_id: str
    title: str


class ChatCreate(BaseModel):
    title: str


class Message(BaseModel):
    id: str
    chat_id: str
    role: str
    content: str
    created_at: str


class MessageCreate(BaseModel):
    role: str
    content: str


@app.on_event("startup")
def startup() -> None:
    init_db()


@app.get("/api/health")
def health() -> dict[str, str]:
    return {"status": "ok"}


@app.get("/api/courses")
def list_courses() -> list[Course]:
    rows = list_courses_from_db()
    return [Course(id=row["id"], name=row["name"]) for row in rows]


@app.post("/api/courses", status_code=201)
def create_course(payload: CourseCreate) -> Course:
    if not payload.name.strip():
        raise HTTPException(status_code=400, detail="Course name is required")

    row = create_course_in_db(payload.name)
    return Course(id=row["id"], name=row["name"])


@app.get("/api/courses/{course_id}/chats")
def list_course_chats(course_id: str) -> list[Chat]:
    if get_course(course_id) is None:
        raise HTTPException(status_code=404, detail="Course not found")

    rows = list_chats_for_course(course_id)
    return [
        Chat(id=row["id"], course_id=row["course_id"], title=row["title"])
        for row in rows
    ]


@app.post("/api/chats/{chat_id}/messages", status_code=201)
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


@app.post("/api/courses/{course_id}/chats", status_code=201)
def create_course_chat(course_id: str, payload: ChatCreate) -> Chat:
    if get_course(course_id) is None:
        raise HTTPException(status_code=404, detail="Course not found")

    if not payload.title.strip():
        raise HTTPException(status_code=400, detail="Chat title is required")

    row = create_chat_in_db(course_id, payload.title)
    return Chat(id=row["id"], course_id=row["course_id"], title=row["title"])


@app.get("/api/chats/{chat_id}/messages")
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
