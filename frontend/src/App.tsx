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

type DocumentReadiness = {
  label: string;
  detail: string;
  className: string;
};

type ChatGuidance = {
  kicker: string;
  title: string;
  description: string;
  placeholder: string;
  composerHint: string;
  className: string;
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
  const [isNotesPanelOpen, setIsNotesPanelOpen] = useState(true);
  const [isSourceCheckOpen, setIsSourceCheckOpen] = useState(false);
  const [isCoursePanelOpen, setIsCoursePanelOpen] = useState(true);
  const [isStudyPanelOpen, setIsStudyPanelOpen] = useState(true);
  const [activeCitationNumber, setActiveCitationNumber] = useState<number | null>(null);
  const fileInputRef = useRef<HTMLInputElement | null>(null);
  const sourceCardRefs = useRef<Record<number, HTMLLIElement | null>>({});

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
    const mediaQuery = window.matchMedia("(max-width: 780px)");
    const syncPanelDefaults = () => {
      setIsCoursePanelOpen(!mediaQuery.matches);
      setIsStudyPanelOpen(!mediaQuery.matches);
    };

    syncPanelDefaults();
    mediaQuery.addEventListener("change", syncPanelDefaults);

    return () => {
      mediaQuery.removeEventListener("change", syncPanelDefaults);
    };
  }, []);

  useEffect(() => {
    if (activeCitationNumber === null || !isStudyPanelOpen) {
      return;
    }

    const animationFrame = window.requestAnimationFrame(() => {
      const sourceCard = sourceCardRefs.current[activeCitationNumber];
      sourceCard?.scrollIntoView({ block: "center", behavior: "smooth" });
      sourceCard?.focus({ preventScroll: true });
    });

    return () => {
      window.cancelAnimationFrame(animationFrame);
    };
  }, [activeCitationNumber, isStudyPanelOpen, latestAnswerResponse]);

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
        setCourseError("QueryLearn could not create that course right now. Check that the app backend is running.");
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
    setActiveCitationNumber(null);
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
        setDocumentError("QueryLearn could not upload that file. Check the file type, then try again.");
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
    setActiveCitationNumber(null);
    setPreparingDocumentId(documentId);

    try {
      const response = await fetch(`${API_BASE_URL}/api/documents/${documentId}/prepare`, {
        method: "POST",
      });

      if (!response.ok) {
        const message = await readErrorDetail(
          response,
          "QueryLearn could not prepare this note right now. Your uploaded file is still saved.",
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
      setPrepareError(
        error instanceof Error
          ? error.message
          : "QueryLearn could not prepare this note right now.",
      );
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
          "QueryLearn could not check sources right now. Your prepared notes are still saved.",
        );
        throw new Error(message);
      }

      const retrievalResponse = (await response.json()) as RetrievalResponse;
      setRetrievalResults(retrievalResponse.results);
      setRetrievalQuestion(retrievalResponse.question);
    } catch (error) {
      setRetrievalResults([]);
      setRetrievalError(
        error instanceof Error
          ? error.message
          : "QueryLearn could not check sources right now.",
      );
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
        setActiveCitationNumber(null);
        setChatTitle("");
      })
      .catch(() => {
        setChatError("QueryLearn could not create that chat right now. Check that the app backend is running.");
      })
      .finally(() => {
        setIsCreatingChat(false);
      });
  }

  function handleSelectChat(chatId: string) {
    setSelectedChatId(chatId);
    setMessages([]);
    setLatestAnswerResponse(null);
    setActiveCitationNumber(null);
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
      setMessageError("Write a question before asking.");
      return;
    }

    if (readyDocumentCount === 0) {
      setMessageError("Prepare at least one note before asking a question.");
      return;
    }

    setMessageError("");
    setIsCreatingMessage(true);
    setActiveCitationNumber(null);

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
        const detail = await readErrorDetail(
          response,
          "QueryLearn could not generate an answer right now.",
        );
        throw new Error(formatAnswerFailureMessage(detail, response.status));
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
      setActiveCitationNumber(null);
      setMessageError(
        error instanceof Error
          ? error.message
          : "QueryLearn could not generate an answer right now.",
      );
    } finally {
      setIsCreatingMessage(false);
    }
  }

  const selectedCourse = courses.find((course) => course.id === selectedCourseId);
  const selectedChat = chats.find((chat) => chat.id === selectedChatId);
  const readyDocumentCount = documents.filter((document) => document.indexed_chunk_count > 0).length;
  const hasReadyNotes = readyDocumentCount > 0;
  const isComposerReady = Boolean(selectedChatId && hasReadyNotes);
  const canAskQuestion = Boolean(isComposerReady && !isCreatingMessage);
  const chatGuidance = getChatGuidance({
    hasSelectedCourse: Boolean(selectedCourseId),
    hasSelectedChat: Boolean(selectedChatId),
    hasDocuments: documents.length > 0,
    hasReadyNotes,
  });
  const appShellClassName = [
    "app-shell",
    isCoursePanelOpen ? "course-panel-open" : "course-panel-collapsed",
    isStudyPanelOpen ? "study-panel-open" : "study-panel-collapsed",
  ].join(" ");

  const latestCitationNumbers = new Set(
    latestAnswerResponse?.evidence.map((evidence) => evidence.citation_number) ?? [],
  );

  function handleCitationClick(citationNumber: number) {
    setActiveCitationNumber(citationNumber);
    setIsStudyPanelOpen(true);
  }

  return (
    <main className={appShellClassName}>
      <aside
        className={isCoursePanelOpen ? "sidebar" : "sidebar shell-panel-collapsed"}
        aria-label="Course and chat navigation"
      >
        <div className="side-panel-chrome">
          {isCoursePanelOpen && (
            <div className="brand-block">
              <h1>QueryLearn</h1>
              <p>Study with your course notes.</p>
            </div>
          )}
          <button
            className="panel-toggle"
            type="button"
            onClick={() => setIsCoursePanelOpen((isOpen) => !isOpen)}
            aria-expanded={isCoursePanelOpen}
            aria-controls="course-navigation-content"
            aria-label={
              isCoursePanelOpen ? "Collapse course navigation" : "Expand course navigation"
            }
          >
            {isCoursePanelOpen ? "Hide" : "Open"}
          </button>
        </div>

        <div
          id="course-navigation-content"
          className="side-panel-content"
          hidden={!isCoursePanelOpen}
        >
          <section className="panel sidebar-panel">
            <div className="section-heading">
              <h2>Courses</h2>
              <span className={`status-pill status-${backendStatus}`}>
                API {backendStatus}
              </span>
            </div>
            {backendStatus === "offline" && (
              <div className="setup-callout" role="status">
                <strong>Backend offline</strong>
                <p>Course, note, and answer actions need the local API to be running.</p>
              </div>
            )}
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
                        <div className="setup-callout">
                          <strong>No chats yet</strong>
                          <p>Create a chat for this course to start asking questions.</p>
                        </div>
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
        </div>

        {!isCoursePanelOpen && (
          <div className="rail-summary" aria-hidden="true">
            <strong>{courses.length}</strong>
            <span>courses</span>
          </div>
        )}
      </aside>

      <section className="chat-workspace" aria-label="Study chat">
        <header className="chat-header">
          <div>
            <p className="eyebrow">{selectedCourse?.name ?? "No course selected"}</p>
            <h2>{selectedChat?.title ?? "Start a study chat"}</h2>
          </div>
          <div className="readiness-summary" aria-label="Course note readiness">
            <span>{documents.length} notes</span>
            <span className={hasReadyNotes ? "is-ready" : "is-pending"}>{readyDocumentCount} ready</span>
          </div>
        </header>

        <div className="message-list">
          {messages.length === 0 && !messageError && (
            <div className={`empty-state ${chatGuidance.className}`}>
              <span className="empty-state-kicker">{chatGuidance.kicker}</span>
              <h3>{chatGuidance.title}</h3>
              <p>{chatGuidance.description}</p>
            </div>
          )}
          {messages.map((message) => (
            <article className={`message-bubble ${message.role}`} key={message.id}>
              <header className="message-heading">
                <span className="message-role">{message.role === "assistant" ? "QueryLearn" : "You"}</span>
              </header>
              <div className="message-content">
                {renderMessageContent(
                  message,
                  message.id === latestAnswerResponse?.assistant_message.id
                    ? latestCitationNumbers
                    : new Set<number>(),
                  handleCitationClick,
                )}
              </div>
            </article>
          ))}
          {isCreatingMessage && (
            <article className="message-bubble assistant message-pending" aria-live="polite">
              <header className="message-heading">
                <span className="message-role">QueryLearn</span>
              </header>
              <div className="message-content">
                <p>
                  <span className="pending-dots" aria-hidden="true">
                    <span />
                    <span />
                    <span />
                  </span>
                  Looking through your prepared notes...
                </p>
              </div>
            </article>
          )}
          {latestAnswerResponse && (
            <div className="latest-answer-strip">
              <span>
                Latest answer used {formatSourceCount(latestAnswerResponse.evidence.length)} with{" "}
                {formatAnswerModelChoice(latestAnswerResponse.model_choice)}.
              </span>
            </div>
          )}
        </div>

        <form className={isComposerReady ? "composer" : "composer composer-unavailable"} onSubmit={handleCreateMessage}>
          <div className="composer-settings">
            <div className="setting-field">
              <label htmlFor="answer-mode">Answer mode</label>
              <select
                id="answer-mode"
                value={answerMode}
                onChange={(event) => setAnswerMode(event.target.value as AnswerMode)}
                disabled={!selectedChatId || !hasReadyNotes || isCreatingMessage}
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
                disabled={!selectedChatId || !hasReadyNotes || isCreatingMessage}
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
              placeholder={chatGuidance.placeholder}
              disabled={!canAskQuestion}
              rows={2}
            />
            <button type="submit" disabled={!canAskQuestion}>
              {isCreatingMessage ? "Answering..." : "Ask"}
            </button>
          </div>
          {!isComposerReady && <p className="composer-hint">{chatGuidance.composerHint}</p>}
          {messageError && <p className="error-text">{messageError}</p>}
        </form>
      </section>

      <aside
        className={isStudyPanelOpen ? "context-panel" : "context-panel shell-panel-collapsed"}
        aria-label="Course notes and sources"
      >
        <div className="side-panel-chrome context-chrome">
          {isStudyPanelOpen && (
            <div className="side-panel-title">
              <h2>Study Context</h2>
              <p>{formatSourceCount(latestAnswerResponse?.evidence.length ?? 0)} available</p>
            </div>
          )}
          <button
            className="panel-toggle"
            type="button"
            onClick={() => setIsStudyPanelOpen((isOpen) => !isOpen)}
            aria-expanded={isStudyPanelOpen}
            aria-controls="study-context-content"
            aria-label={isStudyPanelOpen ? "Collapse study context" : "Expand study context"}
          >
            {isStudyPanelOpen ? "Hide" : "Open"}
          </button>
        </div>

        <div
          id="study-context-content"
          className="side-panel-content context-panel-content"
          hidden={!isStudyPanelOpen}
        >
          <section className="panel sources-panel">
            <div className="section-heading">
              <h2>Sources</h2>
            </div>
            {!latestAnswerResponse && (
              <div className="sources-empty">
                <strong>No answer sources yet</strong>
                <p>Ask a question after preparing notes, and the evidence for the latest answer will appear here.</p>
              </div>
            )}
            {latestAnswerResponse && (
              <div className="answer-preview">
                <p className="answer-metadata">
                  Latest answer - {formatSourceCount(latestAnswerResponse.evidence.length)} -{" "}
                  {formatAnswerModelChoice(latestAnswerResponse.model_choice)}
                </p>
                <ul className="source-card-list">
                  {latestAnswerResponse.evidence.map((evidence) => (
                    <li
                      id={`source-citation-${evidence.citation_number}`}
                      className={
                        evidence.citation_number === activeCitationNumber
                          ? "source-card is-active-source"
                          : "source-card"
                      }
                      key={`${evidence.chunk_id}-${evidence.citation_number}`}
                      ref={(element) => {
                        sourceCardRefs.current[evidence.citation_number] = element;
                      }}
                      tabIndex={-1}
                    >
                      <div className="source-card-heading">
                        <span className="citation-marker">[{evidence.citation_number}]</span>
                        <div>
                          <strong>{evidence.document_filename}</strong>
                          <span>{formatEvidenceLocation(evidence)}</span>
                        </div>
                      </div>
                      <p>{evidence.text}</p>
                    </li>
                  ))}
                </ul>
              </div>
            )}
          </section>

          <section className="panel notes-panel">
            <div className="section-heading">
              <h2>Notes</h2>
              <div className="heading-actions">
                <span>
                  {readyDocumentCount}/{documents.length} ready
                </span>
                <button
                  className="collapse-button"
                  type="button"
                  onClick={() => setIsNotesPanelOpen((isOpen) => !isOpen)}
                  aria-expanded={isNotesPanelOpen}
                  aria-controls="notes-panel-content"
                >
                  {isNotesPanelOpen ? "Hide" : "Show"}
                </button>
              </div>
            </div>
            <div id="notes-panel-content" className="notes-panel-content" hidden={!isNotesPanelOpen}>
              <form className="upload-form notes-upload" onSubmit={handleUploadDocument}>
                <label htmlFor="document-file">Add course notes</label>
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
                <div className="notes-empty">
                  <strong>No notes yet</strong>
                  <p>Upload a course file, then use Prepare once so QueryLearn can search it.</p>
                </div>
              )}
              <ul className="document-list">
                {documents.map((document) => {
                  const readiness = getDocumentReadiness(document, preparingDocumentId);

                  return (
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
                        <span className="document-title-row">
                          <strong>{document.original_filename}</strong>
                          <span className={`readiness-badge ${readiness.className}`}>
                            {readiness.label}
                          </span>
                        </span>
                        <span>{readiness.detail}</span>
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
                  );
                })}
              </ul>
            </div>
          </section>

          <section className="panel secondary-panel">
          <div className="section-heading">
            <h2>Source Check</h2>
            <div className="heading-actions">
              <button
                className="collapse-button"
                type="button"
                onClick={() => setIsSourceCheckOpen((isOpen) => !isOpen)}
                aria-expanded={isSourceCheckOpen}
                aria-controls="source-check-content"
              >
                {isSourceCheckOpen ? "Hide" : "Show"}
              </button>
            </div>
          </div>
          <div
            id="source-check-content"
            className="collapsible-panel-content"
            hidden={!isSourceCheckOpen}
          >
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
              <p className="muted-text">Use this when you want to inspect retrieval before asking.</p>
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
          </div>
          </section>

          <section className="panel debug-panel">
          <div className="section-heading">
            <h2>Note Inspection</h2>
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
        </div>

        {!isStudyPanelOpen && (
          <div className="rail-summary" aria-hidden="true">
            <strong>{latestAnswerResponse?.evidence.length ?? 0}</strong>
            <span>sources</span>
            <strong>
              {readyDocumentCount}/{documents.length}
            </strong>
            <span>ready</span>
          </div>
        )}
      </aside>
    </main>
  );
}

function getChatGuidance({
  hasSelectedCourse,
  hasSelectedChat,
  hasDocuments,
  hasReadyNotes,
}: {
  hasSelectedCourse: boolean;
  hasSelectedChat: boolean;
  hasDocuments: boolean;
  hasReadyNotes: boolean;
}): ChatGuidance {
  if (!hasSelectedCourse) {
    return {
      kicker: "Course",
      title: "Choose a course to begin.",
      description: "Your chats and prepared notes stay organized inside each course.",
      placeholder: "Choose a course first",
      composerHint: "Choose or create a course before starting a study chat.",
      className: "needs-course",
    };
  }

  if (!hasSelectedChat) {
    return {
      kicker: "Chat",
      title: "Open a study chat.",
      description: "Create or choose a chat under this course, then ask questions against prepared notes.",
      placeholder: "Choose a chat first",
      composerHint: "Choose or create a chat before asking a question.",
      className: "needs-chat",
    };
  }

  if (!hasDocuments) {
    return {
      kicker: "Notes",
      title: "Add notes for this course.",
      description: "Upload a document in the Notes panel and prepare it before asking course-specific questions.",
      placeholder: "Add course notes first",
      composerHint: "Upload and prepare at least one note before asking a question.",
      className: "needs-notes",
    };
  }

  if (!hasReadyNotes) {
    return {
      kicker: "Prepare",
      title: "Prepare a note to unlock answers.",
      description: "Uploaded notes need to be prepared once so QueryLearn can cite them in chat.",
      placeholder: "Prepare a note first",
      composerHint: "Prepare at least one note before asking a question.",
      className: "needs-prepare",
    };
  }

  return {
    kicker: "Ready",
    title: "Ask your first question.",
    description: "QueryLearn will answer from your prepared notes and keep citations nearby.",
    placeholder: "Ask about your notes...",
    composerHint: "",
    className: "is-ready",
  };
}

function renderMessageContent(
  message: Message,
  clickableCitationNumbers: Set<number>,
  onCitationClick: (citationNumber: number) => void,
) {
  const paragraphs = message.content
    .split(/\n{2,}/)
    .map((paragraph) => paragraph.trim())
    .filter(Boolean);

  if (paragraphs.length === 0) {
    return null;
  }

  return paragraphs.map((paragraph, index) => (
    <p key={`${message.id}-paragraph-${index}`}>
      {message.role === "assistant"
        ? renderCitationText(paragraph, clickableCitationNumbers, onCitationClick)
        : paragraph}
    </p>
  ));
}

function renderCitationText(
  text: string,
  clickableCitationNumbers: Set<number>,
  onCitationClick: (citationNumber: number) => void,
) {
  return text.split(/(\[\d+\])/g).map((part, index) => {
    if (/^\[\d+\]$/.test(part)) {
      const citationNumber = Number(part.slice(1, -1));
      if (clickableCitationNumbers.has(citationNumber)) {
        return (
          <button
            className="message-citation"
            key={`${part}-${index}`}
            type="button"
            onClick={() => onCitationClick(citationNumber)}
            aria-label={`Show source ${part}`}
          >
            {part}
          </button>
        );
      }

      return (
        <span className="message-citation" key={`${part}-${index}`}>
          {part}
        </span>
      );
    }

    return part;
  });
}

function getDocumentReadiness(
  document: SourceDocument,
  preparingDocumentId: string,
): DocumentReadiness {
  if (preparingDocumentId === document.id) {
    return {
      label: "Preparing",
      detail: "Building searchable notes now",
      className: "is-working",
    };
  }

  if (document.error || document.status === "failed") {
    return {
      label: "Needs attention",
      detail: "Preparation failed",
      className: "is-failed",
    };
  }

  if (document.indexed_chunk_count > 0) {
    return {
      label: "Ready",
      detail: `${formatIndexedChunkCount(document.indexed_chunk_count)} available for answers`,
      className: "is-ready",
    };
  }

  if (document.chunk_count > 0) {
    return {
      label: "Needs prepare",
      detail: `${formatChunkCount(document.chunk_count)} waiting to be indexed`,
      className: "is-pending",
    };
  }

  if (document.parsed_section_count > 0) {
    return {
      label: "Needs prepare",
      detail: `${formatParsedSectionCount(document.parsed_section_count)} waiting to be indexed`,
      className: "is-pending",
    };
  }

  return {
    label: "Needs prepare",
    detail: "Uploaded but not ready for answers",
    className: "is-pending",
  };
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

function formatSourceCount(count: number) {
  return count === 1 ? "1 source" : `${count} sources`;
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

function formatEvidenceLocation(evidence: AnswerEvidence) {
  const sourceLabel = evidence.source_label.trim() || formatSourceLabel(evidence.metadata);
  return `${sourceLabel} - Chunk ${evidence.chunk_index + 1}`;
}

function formatAnswerFailureMessage(detail: string, status: number) {
  const normalizedDetail = detail.toLowerCase();

  if (status === 502 || normalizedDetail.includes("bad gateway")) {
    return "QueryLearn could not reach the answer service right now. Your prepared notes are still saved. Try again in a moment.";
  }

  if (normalizedDetail.includes("indexed chunk") || normalizedDetail.includes("prepared note")) {
    return "Prepare at least one note before asking a question.";
  }

  if (detail.trim() && !normalizedDetail.includes("traceback")) {
    return detail;
  }

  return "QueryLearn could not generate an answer right now. Your prepared notes are still saved.";
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
