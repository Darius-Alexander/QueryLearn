from pydantic import BaseModel


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
