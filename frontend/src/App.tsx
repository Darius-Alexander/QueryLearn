import { type ChangeEvent, type FormEvent, useEffect, useRef, useState } from "react";
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

type Message = {
  id: string;
  chat_id: string;
  role: string;
  content: string;
  created_at: string;
};

type SourceDocument = {
  id: string;
  course_id: string;
  original_filename: string;
  stored_filename: string;
  content_type: string | null;
  file_extension: string;
  file_size: number;
  status: string;
  created_at: string;
  updated_at: string;
  error: string | null;
};

type ParsedSection = {
  id: string;
  document_id: string;
  section_index: number;
  kind: string;
  label: string;
  text: string;
  metadata: Record<string, unknown>;
  created_at: string;
};

function App() {
  const [backendStatus, setBackendStatus] = useState("checking");
  const [courses, setCourses] = useState<Course[]>([]);
  const [selectedCourseId, setSelectedCourseId] = useState("");
  const [documents, setDocuments] = useState<SourceDocument[]>([]);
  const [selectedDocumentId, setSelectedDocumentId] = useState("");
  const [parsedSections, setParsedSections] = useState<ParsedSection[]>([]);
  const [sectionError, setSectionError] = useState("");
  const [selectedDocumentFile, setSelectedDocumentFile] = useState<File | null>(null);
  const [documentError, setDocumentError] = useState("");
  const [isUploadingDocument, setIsUploadingDocument] = useState(false);
  const [parsingDocumentId, setParsingDocumentId] = useState("");
  const [chats, setChats] = useState<Chat[]>([]);
  const [selectedChatId, setSelectedChatId] = useState("");
  const [messages, setMessages] = useState<Message[]>([]);
  const [messageContent, setMessageContent] = useState("");
  const [messageError, setMessageError] = useState("");
  const [isCreatingMessage, setIsCreatingMessage] = useState(false);
  const [chatTitle, setChatTitle] = useState("");
  const [chatError, setChatError] = useState("");
  const [isCreatingChat, setIsCreatingChat] = useState(false);
  const [courseName, setCourseName] = useState("");
  const [courseError, setCourseError] = useState("");
  const [isCreatingCourse, setIsCreatingCourse] = useState(false);
  const fileInputRef = useRef<HTMLInputElement | null>(null);

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
        setSelectedChatId((currentChatId) =>
          data.some((chat) => chat.id === currentChatId) ? currentChatId : data[0]?.id || "",
        );
      })
      .catch(() => {
        setChats([]);
        setSelectedChatId("");
        setChatError("Could not load chats for this course.");
      });
  }, [selectedCourseId]);

  useEffect(() => {
    if (!selectedCourseId) {
      return;
    }

    fetch(`${API_BASE_URL}/api/courses/${selectedCourseId}/documents`)
      .then((response) => {
        if (!response.ok) {
          throw new Error("Could not load documents");
        }
        return response.json();
      })
      .then((data: SourceDocument[]) => {
        setDocumentError("");
        setDocuments(data);
        setSelectedDocumentId((currentDocumentId) =>
          data.some((document) => document.id === currentDocumentId) ? currentDocumentId : "",
        );
      })
      .catch(() => {
        setDocuments([]);
        setSelectedDocumentId("");
        setDocumentError("Could not load documents for this course.");
      });
  }, [selectedCourseId]);

  useEffect(() => {
    if (!selectedDocumentId) {
      return;
    }

    fetch(`${API_BASE_URL}/api/documents/${selectedDocumentId}/sections`)
      .then((response) => {
        if (!response.ok) {
          throw new Error("Could not load parsed sections");
        }
        return response.json();
      })
      .then((data: ParsedSection[]) => {
        setSectionError("");
        setParsedSections(data);
      })
      .catch(() => {
        setParsedSections([]);
        setSectionError("Could not load parsed sections for this document.");
      });
  }, [selectedDocumentId]);

  useEffect(() => {
    if (!selectedChatId) {
      return;
    }

    fetch(`${API_BASE_URL}/api/chats/${selectedChatId}/messages`)
      .then((response) => {
        if (!response.ok) {
          throw new Error("Could not load messages");
        }
        return response.json();
      })
      .then((data: Message[]) => {
        setMessageError("");
        setMessages(data);
      })
      .catch(() => {
        setMessages([]);
        setMessageError("Could not load messages for this chat.");
      });
  }, [selectedChatId]);

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

  function handleSelectCourse(courseId: string) {
    setSelectedCourseId(courseId);
    setSelectedChatId("");
    setDocuments([]);
    setSelectedDocumentId("");
    setParsedSections([]);
    setSelectedDocumentFile(null);
    setChats([]);
    setMessages([]);
    setDocumentError("");
    setSectionError("");
    setMessageError("");
    if (fileInputRef.current) {
      fileInputRef.current.value = "";
    }
  }

  function handleDocumentFileChange(event: ChangeEvent<HTMLInputElement>) {
    setSelectedDocumentFile(event.target.files?.[0] ?? null);
    setDocumentError("");
  }

  function handleUploadDocument(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();

    if (!selectedCourseId) {
      setDocumentError("Select a course before uploading a document.");
      return;
    }

    if (!selectedDocumentFile) {
      setDocumentError("Choose a document before uploading.");
      return;
    }

    const formData = new FormData();
    formData.append("file", selectedDocumentFile);

    setDocumentError("");
    setIsUploadingDocument(true);

    fetch(`${API_BASE_URL}/api/courses/${selectedCourseId}/documents`, {
      method: "POST",
      body: formData,
    })
      .then((response) => {
        if (!response.ok) {
          throw new Error("Could not upload document");
        }
        return response.json();
      })
      .then((createdDocument: SourceDocument) => {
        setDocuments((currentDocuments) => [createdDocument, ...currentDocuments]);
        setSelectedDocumentId(createdDocument.id);
        setParsedSections([]);
        setSelectedDocumentFile(null);
        if (fileInputRef.current) {
          fileInputRef.current.value = "";
        }
      })
      .catch(() => {
        setDocumentError("Could not upload document. Check the file type and backend connection.");
      })
      .finally(() => {
        setIsUploadingDocument(false);
      });
  }

  function handleSelectDocument(documentId: string) {
    setSelectedDocumentId(documentId);
    setParsedSections([]);
    setSectionError("");
  }

  function handleParseDocument(documentId: string) {
    setDocumentError("");
    setSectionError("");
    setParsingDocumentId(documentId);

    fetch(`${API_BASE_URL}/api/documents/${documentId}/parse`, {
      method: "POST",
    })
      .then((response) => {
        if (!response.ok) {
          throw new Error("Could not parse document");
        }
        return response.json();
      })
      .then((sections: ParsedSection[]) => {
        setParsedSections(sections);
        setSelectedDocumentId(documentId);
        return fetch(`${API_BASE_URL}/api/documents/${documentId}`);
      })
      .then((response) => {
        if (!response.ok) {
          throw new Error("Could not refresh document");
        }
        return response.json();
      })
      .then((updatedDocument: SourceDocument) => {
        setDocuments((currentDocuments) =>
          currentDocuments.map((document) =>
            document.id === updatedDocument.id ? updatedDocument : document,
          ),
        );
      })
      .catch(() => {
        setDocumentError("Could not parse document. Only .txt, .md, and .csv files are supported right now.");
      })
      .finally(() => {
        setParsingDocumentId("");
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
        setSelectedChatId(createdChat.id);
        setChatTitle("");
      })
      .catch(() => {
        setChatError("Could not create chat. Check that the backend is running.");
      })
      .finally(() => {
        setIsCreatingChat(false);
      });
  }

  function handleSelectChat(chatId: string) {
    setSelectedChatId(chatId);
    setMessages([]);
    setMessageError("");
  }

  function handleCreateMessage(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();

    if (!selectedChatId) {
      setMessageError("Select a chat before sending a message.");
      return;
    }

    const content = messageContent.trim();
    if (!content) {
      setMessageError("Message content is required");
      return;
    }

    setMessageError("");
    setIsCreatingMessage(true);

    fetch(`${API_BASE_URL}/api/chats/${selectedChatId}/messages`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({ role: "user", content }),
    })
      .then((response) => {
        if (!response.ok) {
          throw new Error("Could not send message");
        }
        return response.json();
      })
      .then((createdMessage: Message) => {
        setMessages((currentMessages) => [...currentMessages, createdMessage]);
        setMessageContent("");
      })
      .catch(() => {
        setMessageError("Could not send message. Check that the backend is running.");
      })
      .finally(() => {
        setIsCreatingMessage(false);
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
              <button type="button" onClick={() => handleSelectCourse(course.id)}>
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
            <li key={chat.id}>
              <button type="button" onClick={() => handleSelectChat(chat.id)}>
                {chat.title}
                {chat.id === selectedChatId ? " (selected)" : ""}
              </button>
            </li>
          ))}
        </ul>
      </section>

      <section>
        <h2>Documents</h2>
        <form onSubmit={handleUploadDocument}>
          <label htmlFor="document-file">Document</label>
          <input
            id="document-file"
            ref={fileInputRef}
            type="file"
            accept=".csv,.docx,.md,.pdf,.pptx,.txt,.xlsx"
            onChange={handleDocumentFileChange}
            disabled={!selectedCourseId || isUploadingDocument}
          />
          <button type="submit" disabled={!selectedCourseId || !selectedDocumentFile || isUploadingDocument}>
            {isUploadingDocument ? "Uploading..." : "Upload document"}
          </button>
        </form>
        {documentError && <p>{documentError}</p>}
        {!selectedCourseId && <p>Select a course to view documents.</p>}
        {selectedCourseId && documents.length === 0 && !documentError && <p>No documents for this course yet.</p>}
        <ul>
          {documents.map((document) => (
            <li className="document-row" key={document.id}>
              <button
                className="document-summary"
                type="button"
                onClick={() => handleSelectDocument(document.id)}
              >
                <strong>{document.original_filename}</strong>{" "}
                <span>
                  {document.status} - {document.file_extension} - {formatFileSize(document.file_size)}
                  {document.id === selectedDocumentId ? " - selected" : ""}
                </span>
              </button>
              <button
                type="button"
                onClick={() => handleParseDocument(document.id)}
                disabled={parsingDocumentId === document.id}
              >
                {parsingDocumentId === document.id ? "Parsing..." : "Parse"}
              </button>
            </li>
          ))}
        </ul>
        {sectionError && <p>{sectionError}</p>}
        {selectedDocumentId && parsedSections.length === 0 && !sectionError && (
          <p>No parsed sections for this document yet.</p>
        )}
        {parsedSections.length > 0 && (
          <div className="section-preview">
            <h3>Parsed sections</h3>
            <ul>
              {parsedSections.map((section) => (
                <li key={section.id}>
                  <strong>
                    {section.label} ({section.kind})
                  </strong>
                  <pre>{section.text}</pre>
                </li>
              ))}
            </ul>
          </div>
        )}
      </section>

      <section>
        <h2>Messages</h2>
        <form onSubmit={handleCreateMessage}>
          <label htmlFor="message-content">Message</label>
          <input
            id="message-content"
            type="text"
            value={messageContent}
            onChange={(event) => setMessageContent(event.target.value)}
            placeholder="Ask a question"
            disabled={!selectedChatId}
          />
          <button type="submit" disabled={!selectedChatId || isCreatingMessage}>
            {isCreatingMessage ? "Sending..." : "Send"}
          </button>
        </form>
        {messageError && <p>{messageError}</p>}
        {!selectedChatId && <p>Select a chat to view messages.</p>}
        {selectedChatId && messages.length === 0 && !messageError && <p>No messages in this chat yet.</p>}
        <ul>
          {messages.map((message) => (
            <li key={message.id}>
              <strong>{message.role}:</strong> {message.content}
            </li>
          ))}
        </ul>
      </section>
    </main>
  );
}

function formatFileSize(bytes: number) {
  if (bytes < 1024) {
    return `${bytes} B`;
  }

  if (bytes < 1024 * 1024) {
    return `${(bytes / 1024).toFixed(1)} KB`;
  }

  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}

export default App;
