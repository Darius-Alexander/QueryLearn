import re
import json
import sqlite3
import uuid
from contextlib import contextmanager
from datetime import datetime, timezone
from pathlib import Path
from typing import Iterator


DATABASE_PATH = Path(__file__).resolve().parents[1] / "data" / "querylearn.sqlite3"


@contextmanager
def get_connection() -> Iterator[sqlite3.Connection]:
    DATABASE_PATH.parent.mkdir(parents=True, exist_ok=True)
    connection = sqlite3.connect(DATABASE_PATH)
    connection.row_factory = sqlite3.Row
    connection.execute("PRAGMA foreign_keys = ON")
    try:
        yield connection
        connection.commit()
    finally:
        connection.close()


def init_db() -> None:
    with get_connection() as connection:
        connection.execute(
            """
            CREATE TABLE IF NOT EXISTS courses (
                id TEXT PRIMARY KEY,
                name TEXT NOT NULL
            )
            """
        )
        connection.execute(
            """
            CREATE TABLE IF NOT EXISTS chats (
                id TEXT PRIMARY KEY,
                course_id TEXT NOT NULL,
                title TEXT NOT NULL,
                FOREIGN KEY (course_id) REFERENCES courses(id) ON DELETE CASCADE
            )
            """
        )
        connection.execute(
            """
            CREATE TABLE IF NOT EXISTS messages (
                id TEXT PRIMARY KEY,
                chat_id TEXT NOT NULL,
                role TEXT NOT NULL,
                content TEXT NOT NULL,
                created_at TEXT NOT NULL,
                FOREIGN KEY (chat_id) REFERENCES chats(id) ON DELETE CASCADE
            )
            """
        )
        reset_empty_legacy_documents_table(connection)
        connection.execute(
            """
            CREATE TABLE IF NOT EXISTS documents (
                id TEXT PRIMARY KEY,
                course_id TEXT NOT NULL,
                original_filename TEXT NOT NULL,
                stored_filename TEXT NOT NULL,
                content_type TEXT,
                file_extension TEXT NOT NULL,
                file_size INTEGER NOT NULL,
                storage_path TEXT NOT NULL,
                status TEXT NOT NULL,
                error TEXT,
                created_at TEXT NOT NULL,
                updated_at TEXT NOT NULL,
                FOREIGN KEY (course_id) REFERENCES courses(id) ON DELETE CASCADE
            )
            """
        )
        connection.execute(
            """
            CREATE TABLE IF NOT EXISTS parsed_sections (
                id TEXT PRIMARY KEY,
                document_id TEXT NOT NULL,
                section_index INTEGER NOT NULL,
                kind TEXT NOT NULL,
                label TEXT NOT NULL,
                text TEXT NOT NULL,
                metadata_json TEXT,
                created_at TEXT NOT NULL,
                FOREIGN KEY (document_id) REFERENCES documents(id) ON DELETE CASCADE
            )
            """
        )
        connection.execute(
            """
            CREATE TABLE IF NOT EXISTS chunks (
                id TEXT PRIMARY KEY,
                document_id TEXT NOT NULL,
                parsed_section_id TEXT NOT NULL,
                chunk_index INTEGER NOT NULL,
                text TEXT NOT NULL,
                metadata_json TEXT,
                created_at TEXT NOT NULL,
                FOREIGN KEY (document_id) REFERENCES documents(id) ON DELETE CASCADE,
                FOREIGN KEY (parsed_section_id) REFERENCES parsed_sections(id) ON DELETE CASCADE
            )
            """
        )
        connection.execute(
            """
            CREATE UNIQUE INDEX IF NOT EXISTS idx_chunks_document_id_chunk_index
            ON chunks (document_id, chunk_index)
            """
        )
        connection.execute(
            """
            CREATE INDEX IF NOT EXISTS idx_chunks_parsed_section_id
            ON chunks (parsed_section_id)
            """
        )
        connection.execute(
            """
            CREATE TABLE IF NOT EXISTS chunk_embeddings (
                id TEXT PRIMARY KEY,
                chunk_id TEXT NOT NULL,
                embedding_model TEXT NOT NULL,
                embedding_dimension INTEGER NOT NULL,
                embedding_json TEXT NOT NULL,
                created_at TEXT NOT NULL,
                FOREIGN KEY (chunk_id) REFERENCES chunks(id) ON DELETE CASCADE
            )
            """
        )
        connection.execute(
            """
            CREATE UNIQUE INDEX IF NOT EXISTS idx_chunk_embeddings_chunk_id_model
            ON chunk_embeddings (chunk_id, embedding_model)
            """
        )
        connection.execute(
            """
            CREATE INDEX IF NOT EXISTS idx_chunk_embeddings_chunk_id
            ON chunk_embeddings (chunk_id)
            """
        )
        seed_courses(connection)
        seed_chats(connection)


def seed_courses(connection: sqlite3.Connection) -> None:
    course_count = connection.execute("SELECT COUNT(*) FROM courses").fetchone()[0]
    if course_count > 0:
        return

    connection.executemany(
        "INSERT INTO courses (id, name) VALUES (?, ?)",
        [
            ("biology-101", "Biology 101"),
            ("cs-201", "Computer Science 201"),
        ],
    )


def seed_chats(connection: sqlite3.Connection) -> None:
    chat_count = connection.execute("SELECT COUNT(*) FROM chats").fetchone()[0]
    if chat_count > 0:
        return

    connection.executemany(
        "INSERT INTO chats (id, course_id, title) VALUES (?, ?, ?)",
        [
            ("biology-101-general", "biology-101", "General questions"),
            ("cs-201-general", "cs-201", "General questions"),
        ],
    )


def reset_empty_legacy_documents_table(connection: sqlite3.Connection) -> None:
    table_exists = connection.execute(
        "SELECT 1 FROM sqlite_master WHERE type = ? AND name = ?",
        ("table", "documents"),
    ).fetchone()
    if table_exists is None:
        return

    columns = {
        row["name"]
        for row in connection.execute("PRAGMA table_info(documents)").fetchall()
    }
    required_columns = {
        "id",
        "course_id",
        "original_filename",
        "stored_filename",
        "content_type",
        "file_extension",
        "file_size",
        "storage_path",
        "status",
        "error",
        "created_at",
        "updated_at",
    }
    if required_columns.issubset(columns):
        return

    document_count = connection.execute("SELECT COUNT(*) FROM documents").fetchone()[0]
    if document_count > 0:
        raise RuntimeError("Documents table schema is out of date and contains data")

    connection.execute("DROP TABLE documents")


DOCUMENT_SELECT_COLUMNS = """
                documents.id,
                documents.course_id,
                documents.original_filename,
                documents.stored_filename,
                documents.content_type,
                documents.file_extension,
                documents.file_size,
                documents.storage_path,
                documents.status,
                documents.error,
                documents.created_at,
                documents.updated_at,
                (
                    SELECT COUNT(*)
                    FROM parsed_sections
                    WHERE parsed_sections.document_id = documents.id
                ) AS parsed_section_count,
                (
                    SELECT COUNT(*)
                    FROM chunks
                    WHERE chunks.document_id = documents.id
                ) AS chunk_count,
                (
                    SELECT COUNT(DISTINCT chunk_embeddings.chunk_id)
                    FROM chunk_embeddings
                    JOIN chunks ON chunks.id = chunk_embeddings.chunk_id
                    WHERE chunks.document_id = documents.id
                ) AS indexed_chunk_count
"""


def list_courses() -> list[sqlite3.Row]:
    with get_connection() as connection:
        return connection.execute("SELECT id, name FROM courses ORDER BY name").fetchall()


def get_course(course_id: str) -> sqlite3.Row | None:
    with get_connection() as connection:
        return connection.execute(
            "SELECT id, name FROM courses WHERE id = ?",
            (course_id,),
        ).fetchone()


def list_chats_for_course(course_id: str) -> list[sqlite3.Row]:
    with get_connection() as connection:
        return connection.execute(
            "SELECT id, course_id, title FROM chats WHERE course_id = ? ORDER BY title",
            (course_id,),
        ).fetchall()


def get_chat(chat_id: str) -> sqlite3.Row | None:
    with get_connection() as connection:
        return connection.execute(
            "SELECT id, course_id, title FROM chats WHERE id = ?",
            (chat_id,),
        ).fetchone()


def list_messages_for_chat(chat_id: str) -> list[sqlite3.Row]:
    with get_connection() as connection:
        return connection.execute(
            """
            SELECT id, chat_id, role, content, created_at
            FROM messages
            WHERE chat_id = ?
            ORDER BY created_at, id
            """,
            (chat_id,),
        ).fetchall()


def create_message(chat_id: str, role: str, content: str) -> sqlite3.Row:
    message_id = str(uuid.uuid4())
    created_at = now_iso()

    with get_connection() as connection:
        connection.execute(
            """
            INSERT INTO messages (id, chat_id, role, content, created_at)
            VALUES (?, ?, ?, ?, ?)
            """,
            (message_id, chat_id, role, content.strip(), created_at),
        )
        return connection.execute(
            """
            SELECT id, chat_id, role, content, created_at
            FROM messages
            WHERE id = ?
            """,
            (message_id,),
        ).fetchone()


def create_chat(course_id: str, title: str) -> sqlite3.Row:
    clean_title = title.strip()
    chat_id = build_chat_id(course_id, clean_title)

    with get_connection() as connection:
        connection.execute(
            "INSERT INTO chats (id, course_id, title) VALUES (?, ?, ?)",
            (chat_id, course_id, clean_title),
        )
        return connection.execute(
            "SELECT id, course_id, title FROM chats WHERE id = ?",
            (chat_id,),
        ).fetchone()


def create_course(name: str) -> sqlite3.Row:
    clean_name = name.strip()
    course_id = build_course_id(clean_name)

    with get_connection() as connection:
        connection.execute(
            "INSERT INTO courses (id, name) VALUES (?, ?)",
            (course_id, clean_name),
        )
        return connection.execute(
            "SELECT id, name FROM courses WHERE id = ?",
            (course_id,),
        ).fetchone()


def list_documents_for_course(course_id: str) -> list[sqlite3.Row]:
    with get_connection() as connection:
        return connection.execute(
            f"""
            SELECT
{DOCUMENT_SELECT_COLUMNS}
            FROM documents
            WHERE course_id = ?
            ORDER BY created_at DESC, original_filename
            """,
            (course_id,),
        ).fetchall()


def get_document(document_id: str) -> sqlite3.Row | None:
    with get_connection() as connection:
        return connection.execute(
            f"""
            SELECT
{DOCUMENT_SELECT_COLUMNS}
            FROM documents
            WHERE id = ?
            """,
            (document_id,),
        ).fetchone()


def create_document(
    document_id: str,
    course_id: str,
    original_filename: str,
    stored_filename: str,
    content_type: str | None,
    file_extension: str,
    file_size: int,
    storage_path: str,
) -> sqlite3.Row:
    created_at = now_iso()

    with get_connection() as connection:
        connection.execute(
            """
            INSERT INTO documents (
                id,
                course_id,
                original_filename,
                stored_filename,
                content_type,
                file_extension,
                file_size,
                storage_path,
                status,
                created_at,
                updated_at
            )
            VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
            """,
            (
                document_id,
                course_id,
                original_filename,
                stored_filename,
                content_type,
                file_extension,
                file_size,
                storage_path,
                "uploaded",
                created_at,
                created_at,
            ),
        )
        return connection.execute(
            f"""
            SELECT
{DOCUMENT_SELECT_COLUMNS}
            FROM documents
            WHERE id = ?
            """,
            (document_id,),
        ).fetchone()


def update_document_status(document_id: str, status: str, error: str | None = None) -> sqlite3.Row:
    updated_at = now_iso()

    with get_connection() as connection:
        connection.execute(
            """
            UPDATE documents
            SET status = ?, error = ?, updated_at = ?
            WHERE id = ?
            """,
            (status, error, updated_at, document_id),
        )
        return connection.execute(
            f"""
            SELECT
{DOCUMENT_SELECT_COLUMNS}
            FROM documents
            WHERE id = ?
            """,
            (document_id,),
        ).fetchone()


def replace_parsed_sections(
    document_id: str,
    sections: list[dict[str, object]],
) -> list[sqlite3.Row]:
    created_at = now_iso()

    with get_connection() as connection:
        connection.execute(
            "DELETE FROM parsed_sections WHERE document_id = ?",
            (document_id,),
        )
        connection.executemany(
            """
            INSERT INTO parsed_sections (
                id,
                document_id,
                section_index,
                kind,
                label,
                text,
                metadata_json,
                created_at
            )
            VALUES (?, ?, ?, ?, ?, ?, ?, ?)
            """,
            [
                (
                    str(uuid.uuid4()),
                    document_id,
                    section["section_index"],
                    section["kind"],
                    section["label"],
                    section["text"],
                    json.dumps(section.get("metadata", {}), sort_keys=True),
                    created_at,
                )
                for section in sections
            ],
        )
        return list_parsed_sections_for_document_with_connection(connection, document_id)


def list_parsed_sections_for_document(document_id: str) -> list[sqlite3.Row]:
    with get_connection() as connection:
        return list_parsed_sections_for_document_with_connection(connection, document_id)


def list_parsed_sections_for_document_with_connection(
    connection: sqlite3.Connection,
    document_id: str,
) -> list[sqlite3.Row]:
    return connection.execute(
        """
        SELECT
            id,
            document_id,
            section_index,
            kind,
            label,
            text,
            metadata_json,
            created_at
        FROM parsed_sections
        WHERE document_id = ?
        ORDER BY section_index
        """,
        (document_id,),
    ).fetchall()


def replace_chunks(
    document_id: str,
    chunks: list[dict[str, object]],
) -> list[sqlite3.Row]:
    created_at = now_iso()

    with get_connection() as connection:
        connection.execute(
            "DELETE FROM chunks WHERE document_id = ?",
            (document_id,),
        )
        connection.executemany(
            """
            INSERT INTO chunks (
                id,
                document_id,
                parsed_section_id,
                chunk_index,
                text,
                metadata_json,
                created_at
            )
            VALUES (?, ?, ?, ?, ?, ?, ?)
            """,
            [
                (
                    str(uuid.uuid4()),
                    document_id,
                    chunk["parsed_section_id"],
                    chunk["chunk_index"],
                    chunk["text"],
                    json.dumps(chunk.get("metadata", {}), sort_keys=True),
                    created_at,
                )
                for chunk in chunks
            ],
        )
        return list_chunks_for_document_with_connection(connection, document_id)


def list_chunks_for_document(document_id: str) -> list[sqlite3.Row]:
    with get_connection() as connection:
        return list_chunks_for_document_with_connection(connection, document_id)


def list_chunks_for_document_with_connection(
    connection: sqlite3.Connection,
    document_id: str,
) -> list[sqlite3.Row]:
    return connection.execute(
        """
        SELECT
            id,
            document_id,
            parsed_section_id,
            chunk_index,
            text,
            metadata_json,
            created_at
        FROM chunks
        WHERE document_id = ?
        ORDER BY chunk_index, id
        """,
        (document_id,),
    ).fetchall()


def replace_chunk_embeddings(
    document_id: str,
    embeddings: list[dict[str, object]],
) -> list[sqlite3.Row]:
    created_at = now_iso()

    with get_connection() as connection:
        connection.execute(
            """
            DELETE FROM chunk_embeddings
            WHERE chunk_id IN (
                SELECT id
                FROM chunks
                WHERE document_id = ?
            )
            """,
            (document_id,),
        )
        connection.executemany(
            """
            INSERT INTO chunk_embeddings (
                id,
                chunk_id,
                embedding_model,
                embedding_dimension,
                embedding_json,
                created_at
            )
            VALUES (?, ?, ?, ?, ?, ?)
            """,
            [
                (
                    str(uuid.uuid4()),
                    embedding["chunk_id"],
                    embedding["embedding_model"],
                    embedding["embedding_dimension"],
                    json.dumps(embedding["embedding"], separators=(",", ":")),
                    created_at,
                )
                for embedding in embeddings
            ],
        )
        return list_chunk_embeddings_for_document_with_connection(connection, document_id)


def list_chunk_embeddings_for_document(document_id: str) -> list[sqlite3.Row]:
    with get_connection() as connection:
        return list_chunk_embeddings_for_document_with_connection(connection, document_id)


def list_chunk_embeddings_for_document_with_connection(
    connection: sqlite3.Connection,
    document_id: str,
) -> list[sqlite3.Row]:
    return connection.execute(
        """
        SELECT
            chunk_embeddings.id,
            chunk_embeddings.chunk_id,
            chunk_embeddings.embedding_model,
            chunk_embeddings.embedding_dimension,
            chunk_embeddings.embedding_json,
            chunk_embeddings.created_at
        FROM chunk_embeddings
        JOIN chunks ON chunks.id = chunk_embeddings.chunk_id
        WHERE chunks.document_id = ?
        ORDER BY chunks.chunk_index, chunk_embeddings.embedding_model
        """,
        (document_id,),
    ).fetchall()


def build_course_id(name: str) -> str:
    slug = re.sub(r"[^a-z0-9]+", "-", name.lower()).strip("-")
    if not slug:
        slug = "course"

    with get_connection() as connection:
        existing = connection.execute(
            "SELECT id FROM courses WHERE id = ?",
            (slug,),
        ).fetchone()

    if existing is None:
        return slug

    return f"{slug}-{uuid.uuid4().hex[:8]}"


def build_chat_id(course_id: str, title: str) -> str:
    title_slug = re.sub(r"[^a-z0-9]+", "-", title.lower()).strip("-")
    if not title_slug:
        title_slug = "chat"

    chat_id = f"{course_id}-{title_slug}"
    with get_connection() as connection:
        existing = connection.execute(
            "SELECT id FROM chats WHERE id = ?",
            (chat_id,),
        ).fetchone()

    if existing is None:
        return chat_id

    return f"{chat_id}-{uuid.uuid4().hex[:8]}"


def now_iso() -> str:
    return datetime.now(timezone.utc).isoformat()
