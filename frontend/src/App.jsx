import { useEffect, useMemo, useRef, useState } from "react";
import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";

import {
  Menu,
  Plus,
  Search,
  Send,
  Sun,
  Moon,
  Trash2,
  X,
  Sparkles,
  Bot,
  ArrowUpRight,
  Code2,
  GraduationCap,
  BriefcaseBusiness,
  Award,
} from "lucide-react";

import "./index.css";

// =========================================================
// API
// =========================================================

const API_URL = (
  import.meta.env.VITE_API_URL ||
  "https://hiremeai-ayush-ai.onrender.com"
).replace(/\/$/, "");

console.log("Ayush'Ai API:", API_URL);

// =========================================================
// INITIAL MESSAGE
// =========================================================

const INITIAL_MESSAGE = {
  id: "welcome-message",
  role: "assistant",
  content: `## Hey, I'm Ayush'Ai 👋

Your personal AI assistant for exploring **Ayush Gupta's professional profile**`

// I can help you learn about:

// - Education & academic background
// - Technical skills
// - DSA & programming
// - Projects
// - Certifications & achievements
// - Strengths & weaknesses
// - Career interests
// - Professional profile

// What would you like to know?`,
};

// =========================================================
// CLEAN MARKDOWN
// =========================================================

const cleanMarkdown = (text) => {
  if (!text) return "";

  return text
    .replace(/\\?<br\s*\/?>/gi, "\n")
    .replace(/<\/?p>/gi, "\n")
    .replace(/<\/?div>/gi, "\n")
    .replace(/\\n/g, "\n")
    .replace(/\n{3,}/g, "\n\n")
    .trim();
};

// =========================================================
// APP
// =========================================================

export default function App() {
  // -------------------------------------------------------
  // SIDEBAR
  // -------------------------------------------------------

  const [sidebarOpen, setSidebarOpen] = useState(true);

  // -------------------------------------------------------
  // THEME
  // -------------------------------------------------------

  const [darkMode, setDarkMode] = useState(() => {
    const saved = localStorage.getItem("ayush-ai-theme");

    return saved ? saved === "dark" : true;
  });

  // -------------------------------------------------------
  // CHAT
  // -------------------------------------------------------

  const [messages, setMessages] = useState([
    INITIAL_MESSAGE,
  ]);

  const [input, setInput] = useState("");

  const [isTyping, setIsTyping] = useState(false);

  const [currentChatId, setCurrentChatId] = useState(null);

  const [currentChatTitle, setCurrentChatTitle] =
    useState("New conversation");

  // -------------------------------------------------------
  // RECENT CONVERSATIONS
  // -------------------------------------------------------

  const [recentConversations, setRecentConversations] =
    useState(() => {
      try {
        const saved = localStorage.getItem(
          "ayush-ai-conversations"
        );

        return saved ? JSON.parse(saved) : [];
      } catch {
        return [];
      }
    });

  // -------------------------------------------------------
  // SEARCH
  // -------------------------------------------------------

  const [searchQuery, setSearchQuery] = useState("");

  // -------------------------------------------------------
  // REFS
  // -------------------------------------------------------

  const textareaRef = useRef(null);

  const messagesEndRef = useRef(null);

  // =========================================================
  // THEME
  // =========================================================

  useEffect(() => {
    localStorage.setItem(
      "ayush-ai-theme",
      darkMode ? "dark" : "light"
    );
  }, [darkMode]);

  // =========================================================
  // SAVE CONVERSATIONS
  // =========================================================

  useEffect(() => {
    localStorage.setItem(
      "ayush-ai-conversations",
      JSON.stringify(recentConversations)
    );
  }, [recentConversations]);

  // =========================================================
  // AUTO SCROLL
  // =========================================================

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({
      behavior: "smooth",
    });
  }, [messages]);

  // =========================================================
  // CREATE TITLE
  // =========================================================

  const createTitle = (text) => {
    const clean = text.replace(/\s+/g, " ").trim();

    if (clean.length <= 36) {
      return clean;
    }

    return `${clean.substring(0, 36)}...`;
  };

  // =========================================================
  // NEW CHAT
  // =========================================================

  const startNewChat = () => {
    setMessages([INITIAL_MESSAGE]);

    setCurrentChatId(null);

    setCurrentChatTitle("New conversation");

    setInput("");

    setIsTyping(false);

    setTimeout(() => {
      textareaRef.current?.focus();
    }, 100);
  };

  // =========================================================
  // SAVE CHAT
  // =========================================================

  const saveConversation = (
    chatId,
    chatMessages,
    title
  ) => {
    const hasUserMessage = chatMessages.some(
      (message) => message.role === "user"
    );

    if (!hasUserMessage) {
      return;
    }

    const conversation = {
      id: chatId,
      title,
      messages: chatMessages,
      updatedAt: Date.now(),
    };

    setRecentConversations((previous) => {
      const withoutCurrent = previous.filter(
        (chat) => chat.id !== chatId
      );

      return [
        conversation,
        ...withoutCurrent,
      ].slice(0, 15);
    });
  };

  // =========================================================
  // OPEN CHAT
  // =========================================================

  const openConversation = (conversation) => {
    setMessages(conversation.messages);

    setCurrentChatId(conversation.id);

    setCurrentChatTitle(conversation.title);

    setInput("");

    if (window.innerWidth < 768) {
      setSidebarOpen(false);
    }
  };

  // =========================================================
  // DELETE CHAT
  // =========================================================

  const deleteConversation = (
    event,
    conversationId
  ) => {
    event.stopPropagation();

    setRecentConversations((previous) =>
      previous.filter(
        (chat) => chat.id !== conversationId
      )
    );

    if (currentChatId === conversationId) {
      startNewChat();
    }
  };

  // =========================================================
  // TEXTAREA
  // =========================================================

  const resizeTextarea = () => {
    const textarea = textareaRef.current;

    if (!textarea) return;

    textarea.style.height = "auto";

    textarea.style.height =
      `${Math.min(textarea.scrollHeight, 120)}px`;
  };

  // =========================================================
  // SEND MESSAGE + STREAM
  // =========================================================

  const sendMessage = async (prompt = input) => {
    const question = prompt.trim();

    if (!question || isTyping) {
      return;
    }

    const chatId =
      currentChatId || crypto.randomUUID();

    const existingUserMessages =
      messages.filter(
        (message) => message.role === "user"
      );

    const firstMessage =
      existingUserMessages.length === 0;

    const title = firstMessage
      ? createTitle(question)
      : currentChatTitle;

    const userMessage = {
      id: crypto.randomUUID(),
      role: "user",
      content: question,
    };

    const assistantId = crypto.randomUUID();

    const assistantMessage = {
      id: assistantId,
      role: "assistant",
      content: "",
    };

    const updatedMessages = [
      ...messages,
      userMessage,
      assistantMessage,
    ];

    setCurrentChatId(chatId);

    setCurrentChatTitle(title);

    setMessages(updatedMessages);

    setInput("");

    setIsTyping(true);

    if (textareaRef.current) {
      textareaRef.current.style.height = "auto";
    }

    try {
      const response = await fetch(
        `${API_URL}/chat`,
        {
          method: "POST",

          headers: {
            "Content-Type": "application/json",
            Accept: "text/plain",
          },

          body: JSON.stringify({
            question,
          }),
        }
      );

      if (!response.ok) {
        const errorText =
          await response.text();

        throw new Error(
          `Backend error ${response.status}: ${errorText}`
        );
      }

      if (!response.body) {
        throw new Error(
          "Streaming response unavailable."
        );
      }

      const reader =
        response.body.getReader();

      const decoder =
        new TextDecoder("utf-8");

      let completeAnswer = "";

      while (true) {
        const {
          value,
          done,
        } = await reader.read();

        if (done) break;

        const chunk =
          decoder.decode(value, {
            stream: true,
          });

        completeAnswer += chunk;

        const formatted =
          cleanMarkdown(
            completeAnswer
          );

        setMessages((previous) =>
          previous.map((message) =>
            message.id === assistantId
              ? {
                  ...message,
                  content: formatted,
                }
              : message
          )
        );
      }

      completeAnswer += decoder.decode();

      const finalAnswer =
        cleanMarkdown(
          completeAnswer
        );

      setMessages((previous) => {
        const finalMessages =
          previous.map((message) =>
            message.id === assistantId
              ? {
                  ...message,
                  content: finalAnswer,
                }
              : message
          );

        saveConversation(
          chatId,
          finalMessages,
          title
        );

        return finalMessages;
      });
    } catch (error) {
      console.error(
        "Ayush'Ai error:",
        error
      );

      setMessages((previous) =>
        previous.map((message) =>
          message.id === assistantId
            ? {
                ...message,
                content:
                  "### Connection error\n\nI couldn't connect to Ayush'Ai. Please try again.",
              }
            : message
        )
      );
    } finally {
      setIsTyping(false);
    }
  };

  // =========================================================
  // ENTER
  // =========================================================

  const handleKeyDown = (event) => {
    if (
      event.key === "Enter" &&
      !event.shiftKey
    ) {
      event.preventDefault();

      sendMessage();
    }
  };

  // =========================================================
  // SEARCH
  // =========================================================

  const filteredConversations =
    useMemo(() => {
      const query =
        searchQuery.trim().toLowerCase();

      if (!query) {
        return recentConversations;
      }

      return recentConversations.filter(
        (conversation) =>
          conversation.title
            .toLowerCase()
            .includes(query)
      );
    }, [
      recentConversations,
      searchQuery,
    ]);

  // =========================================================
  // SUGGESTIONS
  // =========================================================

  const suggestions = [
    {
      icon: GraduationCap,
      title: "Education",
      description:
        "Explore Ayush's academic background",
      prompt:
        "Tell me about Ayush's education and academic background.",
    },

    {
      icon: Code2,
      title: "Technical Skills",
      description:
        "Explore programming and development skills",
      prompt:
        "What technical skills does Ayush have?",
    },

    {
      icon: BriefcaseBusiness,
      title: "Projects",
      description:
        "Explore Ayush's development projects",
      prompt:
        "Explain Ayush's projects and the technologies used in them.",
    },

    {
      icon: Award,
      title: "Certifications",
      description:
        "Explore certifications and achievements",
      prompt:
        "What certifications and achievements does Ayush have?",
    },
  ];
    
  const isWelcome =
    messages.length === 1 &&
    messages[0].id === "welcome-message";

  // =========================================================
  // UI
  // =========================================================

  return (
    <div
      className={
        darkMode
          ? "app dark"
          : "app light"
      }
    >
      {/* =====================================================
          SIDEBAR
      ===================================================== */}

      <aside
        className={
          sidebarOpen
            ? "sidebar sidebar-open"
            : "sidebar sidebar-closed"
        }
      >
        {/* Brand */}

        <div className="sidebar-brand">
          <div className="brand-left">
            <div className="brand-icon">
              <Sparkles size={18} />
            </div>

            <div>
              <div className="brand-name">
                Ayush'Ai
              </div>

              <div className="brand-subtitle">
                Personal AI Assistant
              </div>
            </div>
          </div>

          <button
            className="icon-button mobile-close"
            onClick={() =>
              setSidebarOpen(false)
            }
          >
            <X size={17} />
          </button>
        </div>

        {/* New Chat */}

        <div className="sidebar-section">
          <button
            className="new-chat-button"
            onClick={startNewChat}
          >
            <Plus size={17} />

            <span>New conversation</span>
          </button>
        </div>

        {/* Search */}

        <div className="sidebar-search">
          <Search size={16} />

          <input
            value={searchQuery}
            onChange={(event) =>
              setSearchQuery(
                event.target.value
              )
            }
            placeholder="Search conversations"
          />
        </div>

        {/* Recent */}

        <div className="recent-container">
          <div className="section-label">
            Recent conversations
          </div>

          {filteredConversations.length ===
          0 ? (
            <div className="empty-recent">
              <MessageSquareIcon />

              <span>
                Your recent conversations
                will appear here
              </span>
            </div>
          ) : (
            <div className="conversation-list">
              {filteredConversations.map(
                (conversation) => (
                  <button
                    key={conversation.id}
                    className={
                      currentChatId ===
                      conversation.id
                        ? "conversation active"
                        : "conversation"
                    }
                    onClick={() =>
                      openConversation(
                        conversation
                      )
                    }
                  >
                    <MessageSquareIcon />

                    <span className="conversation-title">
                      {conversation.title}
                    </span>

                    <Trash2
                      size={14}
                      className="delete-icon"
                      onClick={(event) =>
                        deleteConversation(
                          event,
                          conversation.id
                        )
                      }
                    />
                  </button>
                )
              )}
            </div>
          )}
        </div>

        {/* Profile */}

        <div className="sidebar-profile">
          <div className="avatar">
            A
          </div>

          <div className="profile-info">
            <strong>
              Ayush Gupta
            </strong>

            <span>
              Career Assistant
            </span>
          </div>
        </div>
      </aside>

      {/* =====================================================
          MAIN
      ===================================================== */}

      <main className="main">
        {/* Header */}

        <header className="topbar">
          <div className="topbar-left">
            <button
              className="icon-button"
              onClick={() =>
                setSidebarOpen(
                  !sidebarOpen
                )
              }
            >
              <Menu size={19} />
            </button>

            <div>
              <div className="topbar-title">
                Ayush'Ai
              </div>

              <div className="topbar-status">
                AI Career Assistant
              </div>
            </div>
          </div>

          {/* ONLY THEME TOGGLE */}

          <button
            className="theme-toggle"
            onClick={() =>
              setDarkMode(!darkMode)
            }
            aria-label="Toggle theme"
          >
            {darkMode ? (
              <Sun size={17} />
            ) : (
              <Moon size={17} />
            )}
          </button>
        </header>

        {/* Chat */}

        <section className="chat-area">
          <div className="chat-content">
            {isWelcome ? (
              <div className="welcome">
                {/* Hero */}

                <div className="hero-icon">
                  <Sparkles size={25} />
                </div>

                <div className="hero-badge">
                  <span className="status-dot" />
                  AI Career Assistant
                </div>

                <h1>
                  Meet{" "}
                  <span>Ayush'Ai</span>
                </h1>

                <p>
                  Explore Ayush Gupta's
                  professional journey,
                  technical skills, projects
                  and career profile through
                  an intelligent AI assistant.
                </p>

                {/* Suggestions */}

                <div className="suggestion-grid">
                  {suggestions.map(
                    (suggestion) => {
                      const Icon =
                        suggestion.icon;

                      return (
                        <button
                          key={
                            suggestion.title
                          }
                          className="suggestion-card"
                          onClick={() =>
                            sendMessage(
                              suggestion.prompt
                            )
                          }
                        >
                          <div className="suggestion-icon">
                            <Icon size={17} />
                          </div>

                          <div className="suggestion-text">
                            <strong>
                              {
                                suggestion.title
                              }
                            </strong>

                            <span>
                              {
                                suggestion.description
                              }
                            </span>
                          </div>

                          <ArrowUpRight
                            size={15}
                            className="suggestion-arrow"
                          />
                        </button>
                      );
                    }
                  )}
                </div>
              </div>
            ) : (
              <div className="messages">
                {messages.map(
                  (message) => (
                    <div
                      key={message.id}
                      className={
                        message.role ===
                        "user"
                          ? "message-row user-row"
                          : "message-row"
                      }
                    >
                      {message.role ===
                      "assistant" && (
                        <div className="message-avatar ai-avatar">
                          <Sparkles
                            size={15}
                          />
                        </div>
                      )}

                      <div
                        className={
                          message.role ===
                          "user"
                            ? "user-message"
                            : "assistant-message"
                        }
                      >
                        {message.role ===
                        "assistant" ? (
                          <ReactMarkdown
                            remarkPlugins={[
                              remarkGfm,
                            ]}
                          >
                            {message.content}
                          </ReactMarkdown>
                        ) : (
                          <p>
                            {message.content}
                          </p>
                        )}
                      </div>

                      {message.role ===
                        "user" && (
                        <div className="message-avatar user-avatar">
                          A
                        </div>
                      )}
                    </div>
                  )
                )}

                {isTyping &&
                  messages[
                    messages.length - 1
                  ]?.content === "" && (
                    <div className="message-row">
                      <div className="message-avatar ai-avatar">
                        <Bot size={15} />
                      </div>

                      <div className="typing">
                        <span />
                        <span />
                        <span />
                      </div>
                    </div>
                  )}

                <div
                  ref={messagesEndRef}
                />
              </div>
            )}
          </div>
        </section>

        {/* ===================================================
            INPUT
        =================================================== */}

        <div className="composer-area">
          <div className="composer">
            <textarea
              ref={textareaRef}
              value={input}
              onChange={(event) => {
                setInput(
                  event.target.value
                );

                resizeTextarea();
              }}
              onKeyDown={handleKeyDown}
              disabled={isTyping}
              placeholder="Message Ayush'Ai..."
              rows={1}
            />

            <div className="composer-bottom">
              <span>
                Enter to send · Shift +
                Enter for new line
              </span>

              <button
                className={
                  input.trim() &&
                  !isTyping
                    ? "send-button active"
                    : "send-button"
                }
                onClick={() =>
                  sendMessage()
                }
                disabled={
                  !input.trim() ||
                  isTyping
                }
              >
                <Send size={16} />
              </button>
            </div>
          </div>

          <div className="disclaimer">
            Ayush'Ai answers using the
            information available in
            Ayush's professional profile.
          </div>
        </div>
      </main>
    </div>
  );
}

// =========================================================
// SMALL ICON COMPONENT
// =========================================================

function MessageSquareIcon() {
  return (
    <svg
      width="15"
      height="15"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.8"
      strokeLinecap="round"
      strokeLinejoin="round"
    >
      <path d="M21 11.5a8.38 8.38 0 0 1-.9 3.8 8.5 8.5 0 0 1-7.6 4.7 8.38 8.38 0 0 1-3.8-.9L3 21l1.9-5.7a8.38 8.38 0 0 1-.9-3.8 8.5 8.5 0 0 1 4.7-7.6 8.38 8.38 0 0 1 3.8-.9h.5a8.48 8.48 0 0 1 8 8v.5Z" />
    </svg>
  );
}