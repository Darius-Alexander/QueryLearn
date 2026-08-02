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

function App() {
  const [backendStatus, setBackendStatus] = useState("checking");
  const [courses, setCourses] = useState<Course[]>([]);
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
      });
  }, []);

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
        setCourseName("");
      })
      .catch(() => {
        setCourseError("Could not create course. Check that the backend is running.");
      })
      .finally(() => {
        setIsCreatingCourse(false);
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
            <li key={course.id}>{course.name}</li>
          ))}
        </ul>
      </section>
    </main>
  );
}

export default App;
