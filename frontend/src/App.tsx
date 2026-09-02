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

type DocumentIndexResult = {
  document_id: string;
  indexed_chunk_count: number;
  embedding_model: string;
  embedding_dimension: number;
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
  const [chunkingDocumentId, setChunkingDocumentId] = useState("");
  const [indexError, setIndexError] = useState("");
  const [indexingDocumentId, setIndexingDocumentId] = useState("");
  const [selectedDocumentFile, setSelectedDocumentFile] = useState<File | null>(null);
  const [documentError, setDocumentError] = useState("");
  const [isUploadingDocument, setIsUploadingDocument] = useState(false);
  const [parsingDocumentId, setParsingDocumentId] = useState("");
  const [retrievalQuestion, setRetrievalQuestion] = useState("");
  const [retrievalResults, setRetrievalResults] = useState<RetrievedChunk[]>([]);
  const [retrievalError, setRetrievalError] = useState("");
  const [isRetrieving, setIsRetrieving] = useState(false);
  const [chats, setChats] = useState<Chat[]>([]);
  const [selectedChatId, setSelectedChatId] = useState("");
  const [messages, setMessages] = useState<Message[]>([]);
  const [messageContent, setMessageContent] = useState("");
  const [answerMode, setAnswerMode] = useState<AnswerMode>("supplemented");
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
    setIndexError("");
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
        setIndexError("");
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
    setIndexError("");
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

  async function handleParseDocument(documentId: string) {
    setDocumentError("");
    setSectionError("");
    setChunkError("");
    setIndexError("");
    setParsingDocumentId(documentId);

    try {
      const response = await fetch(`${API_BASE_URL}/api/documents/${documentId}/parse`, {
        method: "POST",
      });

      if (!response.ok) {
        const message = await readErrorDetail(
          response,
          "Could not parse document. Only .txt, .md, .csv, .docx, .xlsx, .pptx, and text-based .pdf files are supported right now.",
        );
        await refreshDocument(documentId).catch(() => undefined);
        throw new Error(message);
      }

      const sections = (await response.json()) as ParsedSection[];
      setParsedSections(sections);
      setChunks([]);
      setIndexError("");
      setSelectedDocumentId(documentId);
      await refreshDocument(documentId);
    } catch (error) {
      setDocumentError(error instanceof Error ? error.message : "Could not parse document.");
    } finally {
      setParsingDocumentId("");
    }
  }

  async function handleChunkDocument(documentId: string) {
    setDocumentError("");
    setChunkError("");
    setIndexError("");
    setChunkingDocumentId(documentId);

    try {
      const response = await fetch(`${API_BASE_URL}/api/documents/${documentId}/chunks`, {
        method: "POST",
      });

      if (!response.ok) {
        const message = await readErrorDetail(
          response,
          "Could not chunk document. Parse the document before chunking.",
        );
        throw new Error(message);
      }

      const createdChunks = (await response.json()) as Chunk[];
      setChunks(createdChunks);
      setIndexError("");
      setSelectedDocumentId(documentId);
      await refreshDocument(documentId);
    } catch (error) {
      setChunkError(error instanceof Error ? error.message : "Could not chunk document.");
    } finally {
      setChunkingDocumentId("");
    }
  }

  async function handleIndexDocument(documentId: string) {
    setDocumentError("");
    setIndexError("");
    setIndexingDocumentId(documentId);

    try {
      const response = await fetch(`${API_BASE_URL}/api/documents/${documentId}/index`, {
        method: "POST",
      });

      if (!response.ok) {
        const message = await readErrorDetail(
          response,
          "Could not index document. Chunk the document before indexing.",
        );
        throw new Error(message);
      }

      await response.json() as DocumentIndexResult;
      setSelectedDocumentId(documentId);
      await refreshDocument(documentId);
    } catch (error) {
      setIndexError(error instanceof Error ? error.message : "Could not index document.");
    } finally {
      setIndexingDocumentId("");
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
        body: JSON.stringify({ question: content, mode: answerMode, limit: 5 }),
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
                  {document.status} - {formatParsedSectionCount(document.parsed_section_count)} -{" "}
                  {formatChunkCount(document.chunk_count)} -{" "}
                  {formatIndexedChunkCount(document.indexed_chunk_count)} -{" "}
                  {document.file_extension} - {formatFileSize(document.file_size)}
                  {document.id === selectedDocumentId ? " - selected" : ""}
                </span>
                {document.error && <span className="document-error">Error: {document.error}</span>}
              </button>
              <button
                type="button"
                onClick={() => handleParseDocument(document.id)}
                disabled={parsingDocumentId === document.id}
              >
                {parsingDocumentId === document.id ? "Parsing..." : "Parse"}
              </button>
              <button
                type="button"
                onClick={() => handleChunkDocument(document.id)}
                disabled={document.parsed_section_count === 0 || chunkingDocumentId === document.id}
              >
                {chunkingDocumentId === document.id ? "Chunking..." : "Chunk"}
              </button>
              <button
                type="button"
                onClick={() => handleIndexDocument(document.id)}
                disabled={document.chunk_count === 0 || indexingDocumentId === document.id}
              >
                {indexingDocumentId === document.id ? "Indexing..." : "Index"}
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
        {chunkError && <p>{chunkError}</p>}
        {indexError && <p>{indexError}</p>}
        {selectedDocumentId && chunks.length === 0 && !chunkError && (
          <p>No chunks for this document yet.</p>
        )}
        {chunks.length > 0 && (
          <div className="chunk-preview">
            <h3>Chunks</h3>
            <ul>
              {chunks.map((chunk) => (
                <li key={chunk.id}>
                  <strong>Chunk {chunk.chunk_index + 1}</strong>
                  <pre>{chunk.text}</pre>
                </li>
              ))}
            </ul>
          </div>
        )}
      </section>

      <section>
        <h2>Retrieved Sources</h2>
        <form onSubmit={handleRetrieveSources}>
          <label htmlFor="retrieval-question">Question</label>
          <input
            id="retrieval-question"
            type="text"
            value={retrievalQuestion}
            onChange={(event) => setRetrievalQuestion(event.target.value)}
            placeholder="What is a scalar variable?"
            disabled={!selectedCourseId || isRetrieving}
          />
          <button type="submit" disabled={!selectedCourseId || isRetrieving}>
            {isRetrieving ? "Retrieving..." : "Retrieve sources"}
          </button>
        </form>
        {retrievalError && <p>{retrievalError}</p>}
        {!selectedCourseId && <p>Select a course to retrieve sources.</p>}
        {selectedCourseId && retrievalResults.length === 0 && !retrievalError && (
          <p>No retrieved sources yet.</p>
        )}
        {retrievalResults.length > 0 && (
          <div className="retrieval-preview">
            <h3>Top source chunks</h3>
            <ul>
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
          </div>
        )}
      </section>

      <section>
        <h2>Messages</h2>
        <form onSubmit={handleCreateMessage}>
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
            {isCreatingMessage ? "Answering..." : "Ask"}
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
        {latestAnswerResponse && (
          <div className="answer-preview">
            <h3>Sources for latest answer</h3>
            <ul>
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

export default App;
