import sqlite3
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
