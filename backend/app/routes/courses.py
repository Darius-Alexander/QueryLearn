from fastapi import APIRouter, HTTPException

from ..db import create_chat as create_chat_in_db
from ..db import create_course as create_course_in_db
from ..db import get_course
from ..db import list_chats_for_course, list_courses as list_courses_from_db
from ..models import Chat, ChatCreate, Course, CourseCreate


router = APIRouter()


@router.get("/courses")
def list_courses() -> list[Course]:
    rows = list_courses_from_db()
    return [Course(id=row["id"], name=row["name"]) for row in rows]


@router.post("/courses", status_code=201)
def create_course(payload: CourseCreate) -> Course:
    if not payload.name.strip():
        raise HTTPException(status_code=400, detail="Course name is required")

    row = create_course_in_db(payload.name)
    return Course(id=row["id"], name=row["name"])


@router.get("/courses/{course_id}/chats")
def list_course_chats(course_id: str) -> list[Chat]:
    if get_course(course_id) is None:
        raise HTTPException(status_code=404, detail="Course not found")

    rows = list_chats_for_course(course_id)
    return [
        Chat(id=row["id"], course_id=row["course_id"], title=row["title"])
        for row in rows
    ]


@router.post("/courses/{course_id}/chats", status_code=201)
def create_course_chat(course_id: str, payload: ChatCreate) -> Chat:
    if get_course(course_id) is None:
        raise HTTPException(status_code=404, detail="Course not found")

    if not payload.title.strip():
        raise HTTPException(status_code=400, detail="Chat title is required")

    row = create_chat_in_db(course_id, payload.title)
    return Chat(id=row["id"], course_id=row["course_id"], title=row["title"])
