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


class Document(BaseModel):
    id: str
    course_id: str
    original_filename: str
    stored_filename: str
    content_type: str | None
    file_extension: str
    file_size: int
    status: str
    created_at: str
    updated_at: str
    parsed_section_count: int
    chunk_count: int
    indexed_chunk_count: int
    error: str | None = None


class ParsedSection(BaseModel):
    id: str
    document_id: str
    section_index: int
    kind: str
    label: str
    text: str
    metadata: dict[str, object]
    created_at: str


class Chunk(BaseModel):
    id: str
    document_id: str
    parsed_section_id: str
    chunk_index: int
    text: str
    metadata: dict[str, object]
    created_at: str


class ChunkEmbedding(BaseModel):
    id: str
    chunk_id: str
    embedding_model: str
    embedding_dimension: int
    created_at: str
