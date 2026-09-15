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
  parsed_section_count: number;
  chunk_count: number;
  indexed_chunk_count: number;
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

type Chunk = {
  id: string;
  document_id: string;
  parsed_section_id: string;
  chunk_index: number;
  text: string;
  metadata: Record<string, unknown>;
  created_at: string;
};

type RetrievedChunk = {
  chunk_id: string;
  document_id: string;
  document_filename: string;
  chunk_index: number;
  score: number;
  text: string;
  metadata: Record<string, unknown>;
};

type RetrievalResponse = {
  course_id: string;
  question: string;
  results: RetrievedChunk[];
};

type AnswerMode = "supplemented" | "notes_only";
type AnswerModelChoice = "economy" | "fast" | "balanced" | "deep";
type AnswerModelChoiceResponse = "backend_default" | AnswerModelChoice;

type AnswerCitation = {
  citation_number: number;
  chunk_id: string;
  document_id: string;
  document_filename: string;
  chunk_index: number;
  source_label: string;
  score: number;
};

type AnswerEvidence = AnswerCitation & {
  text: string;
  metadata: Record<string, unknown>;
};

type AnswerResponse = {
  chat_id: string;
  course_id: string;
  mode: AnswerMode;
  question: string;
  answer_text: string;
  model_choice: AnswerModelChoiceResponse;
  model: string;
  user_message: Message;
  assistant_message: Message;
  citations: AnswerCitation[];
  evidence: AnswerEvidence[];
};

type ErrorResponse = {
  detail?: string;
};

function App() {
  const [backendStatus, setBackendStatus] = useState("checking");
  const [courses, setCourses] = useState<Course[]>([]);
  const [selectedCourseId, setSelectedCourseId] = useState("");
  const [documents, setDocuments] = useState<SourceDocument[]>([]);
  const [selectedDocumentId, setSelectedDocumentId] = useState("");
  const [parsedSections, setParsedSections] = useState<ParsedSection[]>([]);
  const [sectionError, setSectionError] = useState("");
  const [chunks, setChunks] = useState<Chunk[]>([]);
  const [chunkError, setChunkError] = useState("");
  const [prepareError, setPrepareError] = useState("");
  const [preparingDocumentId, setPreparingDocumentId] = useState("");
  const [selectedDocumentFile, setSelectedDocumentFile] = useState<File | null>(null);
  const [documentError, setDocumentError] = useState("");
  const [isUploadingDocument, setIsUploadingDocument] = useState(false);
  const [retrievalQuestion, setRetrievalQuestion] = useState("");
  const [retrievalResults, setRetrievalResults] = useState<RetrievedChunk[]>([]);
  const [retrievalError, setRetrievalError] = useState("");
  const [isRetrieving, setIsRetrieving] = useState(false);
  const [chats, setChats] = useState<Chat[]>([]);
  const [selectedChatId, setSelectedChatId] = useState("");
  const [messages, setMessages] = useState<Message[]>([]);
  const [messageContent, setMessageContent] = useState("");
  const [answerMode, setAnswerMode] = useState<AnswerMode>("supplemented");
  const [answerModelChoice, setAnswerModelChoice] =
    useState<AnswerModelChoice>("balanced");
  const [latestAnswerResponse, setLatestAnswerResponse] = useState<AnswerResponse | null>(null);
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
    if (!selectedDocumentId) {
      return;
    }

    fetch(`${API_BASE_URL}/api/documents/${selectedDocumentId}/chunks`)
      .then((response) => {
        if (!response.ok) {
          throw new Error("Could not load chunks");
        }
        return response.json();
      })
      .then((data: Chunk[]) => {
        setChunkError("");
        setChunks(data);
      })
      .catch(() => {
        setChunks([]);
        setChunkError("Could not load chunks for this document.");
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
    setChunks([]);
    setSelectedDocumentFile(null);
    setRetrievalQuestion("");
    setRetrievalResults([]);
    setChats([]);
    setMessages([]);
    setLatestAnswerResponse(null);
    setDocumentError("");
    setSectionError("");
    setChunkError("");
    setPrepareError("");
    setRetrievalError("");
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
        setChunks([]);
        setPrepareError("");
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
    setChunks([]);
    setSectionError("");
    setChunkError("");
    setPrepareError("");
  }

  async function refreshDocument(documentId: string) {
    const response = await fetch(`${API_BASE_URL}/api/documents/${documentId}`);
    if (!response.ok) {
      throw new Error("Could not refresh document");
    }

    const updatedDocument = (await response.json()) as SourceDocument;
    setDocuments((currentDocuments) =>
      currentDocuments.map((document) =>
        document.id === updatedDocument.id ? updatedDocument : document,
      ),
    );

    return updatedDocument;
  }

  async function handlePrepareDocument(documentId: string) {
    setDocumentError("");
    setSectionError("");
    setChunkError("");
    setPrepareError("");
    setRetrievalError("");
    setRetrievalResults([]);
    setLatestAnswerResponse(null);
    setPreparingDocumentId(documentId);

    try {
      const response = await fetch(`${API_BASE_URL}/api/documents/${documentId}/prepare`, {
        method: "POST",
      });

      if (!response.ok) {
        const message = await readErrorDetail(
          response,
          "Could not prepare document. Check that the file can be parsed and OPENAI_API_KEY is set.",
        );
        await refreshDocument(documentId).catch(() => undefined);
        throw new Error(message);
      }

      const preparedDocument = (await response.json()) as SourceDocument;
      setDocuments((currentDocuments) =>
        currentDocuments.map((document) =>
          document.id === preparedDocument.id ? preparedDocument : document,
        ),
      );
      setSelectedDocumentId(documentId);

      const [loadedSections, loadedChunks] = await Promise.all([
        fetchParsedSections(documentId),
        fetchChunks(documentId),
      ]);
      setParsedSections(loadedSections);
      setChunks(loadedChunks);
    } catch (error) {
      setPrepareError(error instanceof Error ? error.message : "Could not prepare document.");
    } finally {
      setPreparingDocumentId("");
    }
  }

  async function handleRetrieveSources(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();

    if (!selectedCourseId) {
      setRetrievalError("Select a course before retrieving sources.");
      return;
    }

    const question = retrievalQuestion.trim();
    if (!question) {
      setRetrievalError("Question is required.");
      return;
    }

    setRetrievalError("");
    setIsRetrieving(true);

    try {
      const response = await fetch(`${API_BASE_URL}/api/courses/${selectedCourseId}/retrieve`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ question, limit: 5 }),
      });

      if (!response.ok) {
        const message = await readErrorDetail(
          response,
          "Could not retrieve sources. Check that the course has indexed chunks.",
        );
        throw new Error(message);
      }

      const retrievalResponse = (await response.json()) as RetrievalResponse;
      setRetrievalResults(retrievalResponse.results);
      setRetrievalQuestion(retrievalResponse.question);
    } catch (error) {
      setRetrievalResults([]);
      setRetrievalError(error instanceof Error ? error.message : "Could not retrieve sources.");
    } finally {
      setIsRetrieving(false);
    }
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
        setLatestAnswerResponse(null);
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
    setLatestAnswerResponse(null);
    setMessageError("");
  }

  async function handleCreateMessage(event: FormEvent<HTMLFormElement>) {
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

    try {
      const response = await fetch(`${API_BASE_URL}/api/chats/${selectedChatId}/answers`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          question: content,
          mode: answerMode,
          model_choice: answerModelChoice,
          limit: 5,
        }),
      });

      if (!response.ok) {
        const message = await readErrorDetail(
          response,
          "Could not generate answer. Check that the course has indexed chunks and the backend is running.",
        );
        throw new Error(message);
      }

      const answerResponse = (await response.json()) as AnswerResponse;
      setMessages((currentMessages) => [
        ...currentMessages,
        answerResponse.user_message,
        answerResponse.assistant_message,
      ]);
      setLatestAnswerResponse(answerResponse);
      setMessageContent("");
    } catch (error) {
      setLatestAnswerResponse(null);
      setMessageError(error instanceof Error ? error.message : "Could not generate answer.");
    } finally {
      setIsCreatingMessage(false);
    }
  }

  const selectedCourse = courses.find((course) => course.id === selectedCourseId);
  const selectedChat = chats.find((chat) => chat.id === selectedChatId);
  const readyDocumentCount = documents.filter((document) => document.indexed_chunk_count > 0).length;

  return (
    <main className="app-shell">
      <aside className="sidebar" aria-label="Course and chat navigation">
        <div className="brand-block">
          <h1>QueryLearn</h1>
          <p>Study with your course notes.</p>
        </div>

        <section className="panel sidebar-panel">
          <div className="section-heading">
            <h2>Courses</h2>
            <span className={`status-pill status-${backendStatus}`}>
              API {backendStatus}
            </span>
          </div>
          <form className="compact-form" onSubmit={handleCreateCourse}>
            <label htmlFor="course-name">Course name</label>
            <div className="inline-control">
              <input
                id="course-name"
                type="text"
                value={courseName}
                onChange={(event) => setCourseName(event.target.value)}
                placeholder="Chemistry 101"
              />
              <button type="submit" disabled={isCreatingCourse}>
                {isCreatingCourse ? "Adding..." : "Add"}
              </button>
            </div>
          </form>
          {courseError && <p className="error-text">{courseError}</p>}
          <ul className="course-tree">
            {courses.map((course) => (
              <li className="course-node" key={course.id}>
                <button
                  className={course.id === selectedCourseId ? "course-item selected" : "course-item"}
                  type="button"
                  onClick={() => handleSelectCourse(course.id)}
                  aria-current={course.id === selectedCourseId ? "page" : undefined}
                  aria-expanded={course.id === selectedCourseId}
                >
                  <span>{course.name}</span>
                </button>
                {course.id === selectedCourseId && (
                  <div className="chat-branch">
                    <form className="nested-form" onSubmit={handleCreateChat}>
                      <label htmlFor="chat-title">New chat</label>
                      <div className="inline-control">
                        <input
                          id="chat-title"
                          type="text"
                          value={chatTitle}
                          onChange={(event) => setChatTitle(event.target.value)}
                          placeholder="Midterm review"
                          disabled={!selectedCourseId}
                        />
                        <button type="submit" disabled={!selectedCourseId || isCreatingChat}>
                          {isCreatingChat ? "Adding..." : "Add"}
                        </button>
                      </div>
                    </form>
                    {chatError && <p className="error-text">{chatError}</p>}
                    {chats.length === 0 && !chatError && (
                      <p className="muted-text">No chats yet.</p>
                    )}
                    <ul className="chat-list" aria-label={`Chats in ${course.name}`}>
                      {chats.map((chat) => (
                        <li key={chat.id}>
                          <button
                            className={chat.id === selectedChatId ? "chat-item selected" : "chat-item"}
                            type="button"
                            onClick={() => handleSelectChat(chat.id)}
                            aria-current={chat.id === selectedChatId ? "page" : undefined}
                          >
                            <span>{chat.title}</span>
                          </button>
                        </li>
                      ))}
                    </ul>
                  </div>
                )}
              </li>
            ))}
          </ul>
          {!selectedCourseId && <p className="muted-text">Choose a course to see its chats.</p>}
        </section>
      </aside>

      <section className="chat-workspace" aria-label="Study chat">
        <header className="chat-header">
          <div>
            <p className="eyebrow">{selectedCourse?.name ?? "No course selected"}</p>
            <h2>{selectedChat?.title ?? "Start a study chat"}</h2>
          </div>
          <div className="readiness-summary" aria-label="Course note readiness">
            <span>{documents.length} notes</span>
            <span>{readyDocumentCount} ready</span>
          </div>
        </header>

        <div className="message-list">
          {!selectedChatId && (
            <div className="empty-state">
              <h3>Choose a chat to start studying.</h3>
              <p>Select or create a course chat, then ask questions grounded in prepared notes.</p>
            </div>
          )}
          {selectedChatId && messages.length === 0 && !messageError && (
            <div className="empty-state">
              <h3>Ask your first question.</h3>
              <p>Prepared notes will be used as sources for the answer.</p>
            </div>
          )}
          {messages.map((message) => (
            <article className={`message-bubble ${message.role}`} key={message.id}>
              <header className="message-heading">
                <span className="message-role">{message.role === "assistant" ? "QueryLearn" : "You"}</span>
              </header>
              <div className="message-content">{message.content}</div>
            </article>
          ))}
          {latestAnswerResponse && (
            <div className="latest-answer-strip">
              <span>
                Latest answer used {latestAnswerResponse.evidence.length} sources with{" "}
                {formatAnswerModelChoice(latestAnswerResponse.model_choice)}.
              </span>
            </div>
          )}
        </div>

        <form className="composer" onSubmit={handleCreateMessage}>
          <div className="composer-settings">
            <div className="setting-field">
              <label htmlFor="answer-mode">Answer mode</label>
              <select
                id="answer-mode"
                value={answerMode}
                onChange={(event) => setAnswerMode(event.target.value as AnswerMode)}
                disabled={!selectedChatId || isCreatingMessage}
              >
                <option value="supplemented">Notes + AI explanation</option>
                <option value="notes_only">Notes only</option>
              </select>
            </div>
            <div className="setting-field">
              <label htmlFor="answer-model">Model</label>
              <select
                id="answer-model"
                value={answerModelChoice}
                onChange={(event) => setAnswerModelChoice(event.target.value as AnswerModelChoice)}
                disabled={!selectedChatId || isCreatingMessage}
              >
                <option value="economy">Economy</option>
                <option value="fast">Fast</option>
                <option value="balanced">Balanced</option>
                <option value="deep">Deep</option>
              </select>
            </div>
          </div>
          <label htmlFor="message-content">Message</label>
          <div className="composer-input-row">
            <textarea
              id="message-content"
              value={messageContent}
              onChange={(event) => setMessageContent(event.target.value)}
              placeholder="Ask about your notes..."
              disabled={!selectedChatId}
              rows={2}
            />
            <button type="submit" disabled={!selectedChatId || isCreatingMessage}>
              {isCreatingMessage ? "Answering..." : "Ask"}
            </button>
          </div>
          {messageError && <p className="error-text">{messageError}</p>}
        </form>
      </section>

      <aside className="context-panel" aria-label="Course notes and sources">
        <section className="panel">
          <div className="section-heading">
            <h2>Course Notes</h2>
            <span>{documents.length} files</span>
          </div>
          <form className="upload-form" onSubmit={handleUploadDocument}>
            <label htmlFor="document-file">Upload notes</label>
            <input
              id="document-file"
              ref={fileInputRef}
              type="file"
              accept=".csv,.docx,.md,.pdf,.pptx,.txt,.xlsx"
              onChange={handleDocumentFileChange}
              disabled={!selectedCourseId || isUploadingDocument}
            />
            <button
              type="submit"
              disabled={!selectedCourseId || !selectedDocumentFile || isUploadingDocument}
            >
              {isUploadingDocument ? "Uploading..." : "Upload"}
            </button>
          </form>
          {documentError && <p className="error-text">{documentError}</p>}
          {prepareError && <p className="error-text">{prepareError}</p>}
          {!selectedCourseId && <p className="muted-text">Choose a course to manage notes.</p>}
          {selectedCourseId && documents.length === 0 && !documentError && (
            <p className="muted-text">Upload notes, then prepare them for answering.</p>
          )}
          <ul className="document-list">
            {documents.map((document) => (
              <li className="document-row" key={document.id}>
                <button
                  className={
                    document.id === selectedDocumentId
                      ? "document-summary selected"
                      : "document-summary"
                  }
                  type="button"
                  onClick={() => handleSelectDocument(document.id)}
                >
                  <strong>{document.original_filename}</strong>
                  <span>
                    {document.status} - {formatParsedSectionCount(document.parsed_section_count)} -{" "}
                    {formatChunkCount(document.chunk_count)} -{" "}
                    {formatIndexedChunkCount(document.indexed_chunk_count)}
                  </span>
                  <span>
                    {document.file_extension} - {formatFileSize(document.file_size)}
                  </span>
                  {document.error && <span className="document-error">Error: {document.error}</span>}
                </button>
                <button
                  className="secondary-action"
                  type="button"
                  onClick={() => handlePrepareDocument(document.id)}
                  disabled={preparingDocumentId === document.id}
                >
                  {preparingDocumentId === document.id ? "Preparing..." : "Prepare"}
                </button>
              </li>
            ))}
          </ul>
        </section>

        <section className="panel">
          <div className="section-heading">
            <h2>Source Check</h2>
          </div>
          <form className="compact-form" onSubmit={handleRetrieveSources}>
            <label htmlFor="retrieval-question">Question</label>
            <div className="inline-control">
              <input
                id="retrieval-question"
                type="text"
                value={retrievalQuestion}
                onChange={(event) => setRetrievalQuestion(event.target.value)}
                placeholder="Preview matching notes"
                disabled={!selectedCourseId || isRetrieving}
              />
              <button type="submit" disabled={!selectedCourseId || isRetrieving}>
                {isRetrieving ? "Finding..." : "Find"}
              </button>
            </div>
          </form>
          {retrievalError && <p className="error-text">{retrievalError}</p>}
          {retrievalResults.length === 0 && !retrievalError && (
            <p className="muted-text">Source previews live here when you need to inspect retrieval.</p>
          )}
          {retrievalResults.length > 0 && (
            <ul className="preview-list">
              {retrievalResults.map((result) => (
                <li key={result.chunk_id}>
                  <strong>{result.document_filename}</strong>
                  <span>
                    {formatSourceLabel(result.metadata)} - Chunk {result.chunk_index + 1} - Score{" "}
                    {formatRetrievalScore(result.score)}
                  </span>
                  <pre>{result.text}</pre>
                </li>
              ))}
            </ul>
          )}
        </section>

        <section className="panel">
          <div className="section-heading">
            <h2>Latest Sources</h2>
          </div>
          {!latestAnswerResponse && (
            <p className="muted-text">Sources for the latest answer will appear here.</p>
          )}
          {latestAnswerResponse && (
            <div className="answer-preview">
              <p className="answer-metadata">
                Answered with {formatAnswerModelChoice(latestAnswerResponse.model_choice)} (
                {latestAnswerResponse.model})
              </p>
              <ul className="preview-list">
                {latestAnswerResponse.evidence.map((evidence) => (
                  <li key={`${evidence.chunk_id}-${evidence.citation_number}`}>
                    <strong>{formatCitationLabel(evidence)}</strong>
                    <pre>{evidence.text}</pre>
                  </li>
                ))}
              </ul>
            </div>
          )}
        </section>

        <section className="panel debug-panel">
          <div className="section-heading">
            <h2>Prepared Text</h2>
          </div>
          {sectionError && <p className="error-text">{sectionError}</p>}
          {chunkError && <p className="error-text">{chunkError}</p>}
          {selectedDocumentId && parsedSections.length === 0 && !sectionError && (
            <p className="muted-text">No parsed preview for this document yet.</p>
          )}
          {parsedSections.length > 0 && (
            <details>
              <summary>Parsed sections ({parsedSections.length})</summary>
              <ul className="preview-list">
                {parsedSections.map((section) => (
                  <li key={section.id}>
                    <strong>
                      {section.label} ({section.kind})
                    </strong>
                    <pre>{section.text}</pre>
                  </li>
                ))}
              </ul>
            </details>
          )}
          {selectedDocumentId && chunks.length === 0 && !chunkError && (
            <p className="muted-text">No chunk preview for this document yet.</p>
          )}
          {chunks.length > 0 && (
            <details>
              <summary>Chunks ({chunks.length})</summary>
              <ul className="preview-list">
                {chunks.map((chunk) => (
                  <li key={chunk.id}>
                    <strong>Chunk {chunk.chunk_index + 1}</strong>
                    <pre>{chunk.text}</pre>
                  </li>
                ))}
              </ul>
            </details>
          )}
        </section>
      </aside>
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

function formatParsedSectionCount(count: number) {
  return count === 1 ? "1 section" : `${count} sections`;
}

function formatChunkCount(count: number) {
  return count === 1 ? "1 chunk" : `${count} chunks`;
}

function formatIndexedChunkCount(count: number) {
  return count === 1 ? "1 indexed chunk" : `${count} indexed chunks`;
}

function formatRetrievalScore(score: number) {
  return score.toFixed(3);
}

function formatAnswerModelChoice(choice: AnswerModelChoiceResponse) {
  const labels: Record<AnswerModelChoiceResponse, string> = {
    backend_default: "Backend default",
    economy: "Economy",
    fast: "Fast",
    balanced: "Balanced",
    deep: "Deep",
  };

  return labels[choice];
}

function formatCitationLabel(citation: AnswerCitation) {
  return `[${citation.citation_number}] ${citation.document_filename} - ${citation.source_label} - Chunk ${
    citation.chunk_index + 1
  } - Score ${formatRetrievalScore(citation.score)}`;
}

function formatSourceLabel(metadata: Record<string, unknown>) {
  const pageNumber = metadata.page_number;
  if (typeof pageNumber === "number") {
    return `Page ${pageNumber}`;
  }

  const slideNumber = metadata.slide_number;
  if (typeof slideNumber === "number") {
    return `Slide ${slideNumber}`;
  }

  const sheetName = metadata.sheet_name;
  if (typeof sheetName === "string" && sheetName.trim()) {
    return `Sheet: ${sheetName}`;
  }

  const parsedSectionLabel = metadata.parsed_section_label;
  if (typeof parsedSectionLabel === "string" && parsedSectionLabel.trim()) {
    return parsedSectionLabel;
  }

  return "Source section";
}

async function readErrorDetail(response: Response, fallbackMessage: string) {
  try {
    const data = (await response.json()) as ErrorResponse;
    if (typeof data.detail === "string" && data.detail.trim()) {
      return data.detail;
    }
  } catch {
    return fallbackMessage;
  }

  return fallbackMessage;
}

async function fetchParsedSections(documentId: string) {
  const response = await fetch(`${API_BASE_URL}/api/documents/${documentId}/sections`);
  if (!response.ok) {
    throw new Error("Could not load parsed sections for this document.");
  }

  return (await response.json()) as ParsedSection[];
}

async function fetchChunks(documentId: string) {
  const response = await fetch(`${API_BASE_URL}/api/documents/${documentId}/chunks`);
  if (!response.ok) {
    throw new Error("Could not load chunks for this document.");
  }

  return (await response.json()) as Chunk[];
}

export default App;
