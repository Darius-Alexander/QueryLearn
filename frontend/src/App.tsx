import { type FormEvent, useEffect, useState } from "react";
import "./App.css";

const API_BASE_URL = import.meta.env.VITE_API_BASE_URL ?? "http://127.0.0.1:8001";

type HealthResponse = {
  status: string;
};

type Course = {
  id: string;
  name: string;
};

type Chat = {
  id: string;
  course_id: string;
  title: string;
};

function App() {
  const [backendStatus, setBackendStatus] = useState("checking");
  const [courses, setCourses] = useState<Course[]>([]);
  const [selectedCourseId, setSelectedCourseId] = useState("");
  const [chats, setChats] = useState<Chat[]>([]);
  const [chatTitle, setChatTitle] = useState("");
  const [chatError, setChatError] = useState("");
  const [isCreatingChat, setIsCreatingChat] = useState(false);
  const [courseName, setCourseName] = useState("");
  const [courseError, setCourseError] = useState("");
  const [isCreatingCourse, setIsCreatingCourse] = useState(false);

  useEffect(() => {
    fetch(`${API_BASE_URL}/api/health`)
      .then((response) => response.json())
      .then((data: HealthResponse) => {
        setBackendStatus(data.status);
      })
      .catch(() => {
        setBackendStatus("offline");
      });
  }, []);

  useEffect(() => {
    fetch(`${API_BASE_URL}/api/courses`)
      .then((response) => response.json())
      .then((data: Course[]) => {
        setCourses(data);
        setSelectedCourseId((currentCourseId) => currentCourseId || data[0]?.id || "");
      });
  }, []);

  useEffect(() => {
    if (!selectedCourseId) {
      return;
    }

    fetch(`${API_BASE_URL}/api/courses/${selectedCourseId}/chats`)
      .then((response) => {
        if (!response.ok) {
          throw new Error("Could not load chats");
        }
        return response.json();
      })
      .then((data: Chat[]) => {
        setChatError("");
        setChats(data);
      })
      .catch(() => {
        setChats([]);
        setChatError("Could not load chats for this course.");
      });
  }, [selectedCourseId]);

  function handleCreateCourse(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();

    const name = courseName.trim();
    if (!name) {
      setCourseError("Course name is required");
      return;
    }

    setCourseError("");
    setIsCreatingCourse(true);

    fetch(`${API_BASE_URL}/api/courses`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({ name }),
    })
      .then((response) => {
        if (!response.ok) {
          throw new Error("Could not create course");
        }
        return response.json();
      })
      .then((createdCourse: Course) => {
        setCourses((currentCourses) =>
          [...currentCourses, createdCourse].sort((a, b) => a.name.localeCompare(b.name)),
        );
        setSelectedCourseId(createdCourse.id);
        setCourseName("");
      })
      .catch(() => {
        setCourseError("Could not create course. Check that the backend is running.");
      })
      .finally(() => {
        setIsCreatingCourse(false);
      });
  }

  function handleCreateChat(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();

    if (!selectedCourseId) {
      setChatError("Select a course before creating a chat.");
      return;
    }

    const title = chatTitle.trim();
    if (!title) {
      setChatError("Chat title is required");
      return;
    }

    setChatError("");
    setIsCreatingChat(true);

    fetch(`${API_BASE_URL}/api/courses/${selectedCourseId}/chats`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({ title }),
    })
      .then((response) => {
        if (!response.ok) {
          throw new Error("Could not create chat");
        }
        return response.json();
      })
      .then((createdChat: Chat) => {
        setChats((currentChats) =>
          [...currentChats, createdChat].sort((a, b) => a.title.localeCompare(b.title)),
        );
        setChatTitle("");
      })
      .catch(() => {
        setChatError("Could not create chat. Check that the backend is running.");
      })
      .finally(() => {
        setIsCreatingChat(false);
      });
  }

  return (
    <main>
      <h1>QueryLearn</h1>
      <p>RAG-powered learning assistant</p>

      <section>
        <h2>Backend connection</h2>
        <p>Status: {backendStatus}</p>
      </section>

      <section>
        <h2>Courses</h2>
        <form onSubmit={handleCreateCourse}>
          <label htmlFor="course-name">Course name</label>
          <input
            id="course-name"
            type="text"
            value={courseName}
            onChange={(event) => setCourseName(event.target.value)}
            placeholder="Chemistry 101"
          />
          <button type="submit" disabled={isCreatingCourse}>
            {isCreatingCourse ? "Adding..." : "Add course"}
          </button>
        </form>
        {courseError && <p>{courseError}</p>}
        <ul>
          {courses.map((course) => (
            <li key={course.id}>
              <button type="button" onClick={() => setSelectedCourseId(course.id)}>
                {course.name}
                {course.id === selectedCourseId ? " (selected)" : ""}
              </button>
            </li>
          ))}
        </ul>
      </section>

      <section>
        <h2>Chats</h2>
        <form onSubmit={handleCreateChat}>
          <label htmlFor="chat-title">Chat title</label>
          <input
            id="chat-title"
            type="text"
            value={chatTitle}
            onChange={(event) => setChatTitle(event.target.value)}
            placeholder="Midterm review"
            disabled={!selectedCourseId}
          />
          <button type="submit" disabled={!selectedCourseId || isCreatingChat}>
            {isCreatingChat ? "Adding..." : "Add chat"}
          </button>
        </form>
        {chatError && <p>{chatError}</p>}
        {!selectedCourseId && <p>Select a course to view chats.</p>}
        {selectedCourseId && chats.length === 0 && !chatError && <p>No chats for this course yet.</p>}
        <ul>
          {chats.map((chat) => (
            <li key={chat.id}>{chat.title}</li>
          ))}
        </ul>
      </section>
    </main>
  );
}

export default App;
