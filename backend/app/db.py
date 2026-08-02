import re
import sqlite3
import uuid
from contextlib import contextmanager
from pathlib import Path
from typing import Iterator


DATABASE_PATH = Path(__file__).resolve().parents[1] / "data" / "querylearn.sqlite3"


@contextmanager
def get_connection() -> Iterator[sqlite3.Connection]:
    DATABASE_PATH.parent.mkdir(parents=True, exist_ok=True)
    connection = sqlite3.connect(DATABASE_PATH)
    connection.row_factory = sqlite3.Row
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
        seed_courses(connection)


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


def list_courses() -> list[sqlite3.Row]:
    with get_connection() as connection:
        return connection.execute("SELECT id, name FROM courses ORDER BY name").fetchall()


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
