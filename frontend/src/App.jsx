import { useEffect, useMemo, useRef, useState } from "react";
import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";
import {
  Menu,
  Plus,
  Search,
  MessageSquare,
  Sun,
  Moon,
  Send,
  Paperclip,
  Mic,
  Bot,
  User,
  Trash2,
  X,
  Sparkles,
} from "lucide-react";

import "./index.css";

const API_URL = "http://localhost:8000";

const INITIAL_MESSAGE = {
  id: "welcome-message",
  role: "assistant",
  content:
    "Hi! I'm Ayush'Ai. I can help you explore Ayush's skills, projects, certifications, education and career profile.",
};

const cleanMarkdown = (text) => {
  if (!text) return "";

  return text
    .replace(/\\?<br\s*\/?>/gi, "\n")
    .replace(/\\n/g, "\n");
};

function App() {
  // =====================================================
  // UI STATE
  // =====================================================

  const [sidebarOpen, setSidebarOpen] = useState(true);

  const [darkMode, setDarkMode] = useState(() => {
    const saved = localStorage.getItem("ayush-ai-theme");

    if (saved) {
      return saved === "dark";
    }

    return true;
  });

  // =====================================================
  // CHAT STATE
  // =====================================================

  const [messages, setMessages] = useState([
    INITIAL_MESSAGE,
  ]);

  const [input, setInput] = useState("");

  const [isTyping, setIsTyping] = useState(false);

  const [currentChatId, setCurrentChatId] = useState(null);

  const [currentChatTitle, setCurrentChatTitle] =
    useState("New conversation");

  // =====================================================
  // SEARCH
  // =====================================================

  const [searchQuery, setSearchQuery] = useState("");

  // =====================================================
  // RECENT CONVERSATIONS
  // =====================================================

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

  // =====================================================
  // RESUME
  // =====================================================

  const [resume, setResume] = useState(null);

  const [resumeLoading, setResumeLoading] = useState(true);

  // =====================================================
  // REFS
  // =====================================================

  const textareaRef = useRef(null);

  const messagesEndRef = useRef(null);

  // =====================================================
  // THEME
  // =====================================================

  useEffect(() => {
    localStorage.setItem(
      "ayush-ai-theme",
      darkMode ? "dark" : "light"
    );
  }, [darkMode]);

  // =====================================================
  // SAVE RECENT CHATS
  // =====================================================

  useEffect(() => {
    localStorage.setItem(
      "ayush-ai-conversations",
      JSON.stringify(recentConversations)
    );
  }, [recentConversations]);

  // =====================================================
  // AUTO SCROLL
  // =====================================================

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({
      behavior: "smooth",
    });
  }, [messages, isTyping]);

  // =====================================================
  // LOAD RESUME
  // =====================================================

  useEffect(() => {
    const loadResume = async () => {
      try {
        setResumeLoading(true);

        const response = await fetch(
          `${API_URL}/resume`
        );

        if (!response.ok) {
          throw new Error(
            `Resume API error: ${response.status}`
          );
        }

        const data = await response.json();

        setResume(data);
      } catch (error) {
        console.error(
          "Failed to load resume:",
          error
        );
      } finally {
        setResumeLoading(false);
      }
    };

    loadResume();
  }, []);

  // =====================================================
  // TEXTAREA RESIZE
  // =====================================================

  const resizeTextarea = () => {
    const textarea = textareaRef.current;

    if (!textarea) return;

    textarea.style.height = "auto";

    textarea.style.height =
      Math.min(textarea.scrollHeight, 100) + "px";
  };

  // =====================================================
  // CREATE CHAT TITLE
  // =====================================================

  const createTitle = (message) => {
    const cleaned = message
      .replace(/\s+/g, " ")
      .trim();

    if (cleaned.length <= 38) {
      return cleaned;
    }

    return cleaned.substring(0, 38) + "...";
  };

  // =====================================================
  // SAVE RECENT CHAT
  // =====================================================

  const updateRecentChat = (
    chatId,
    chatMessages,
    title
  ) => {
    const userMessages = chatMessages.filter(
      (message) => message.role === "user"
    );

    if (userMessages.length === 0) {
      return;
    }

    const conversation = {
      id: chatId,
      title: title || "New conversation",
      messages: chatMessages,
      updatedAt: Date.now(),
    };

    setRecentConversations((previous) => {
      const filtered = previous.filter(
        (chat) => chat.id !== chatId
      );

      return [
        conversation,
        ...filtered,
      ].slice(0, 20);
    });
  };

  // =====================================================
  // NEW CHAT
  // =====================================================

  const startNewChat = () => {
    setMessages([INITIAL_MESSAGE]);

    setCurrentChatId(null);

    setCurrentChatTitle(
      "New conversation"
    );

    setInput("");

    setSearchQuery("");

    setIsTyping(false);

    setTimeout(() => {
      textareaRef.current?.focus();
    }, 50);
  };

  // =====================================================
  // OPEN CHAT
  // =====================================================

  const openConversation = (conversation) => {
    setMessages(conversation.messages);

    setCurrentChatId(conversation.id);

    setCurrentChatTitle(
      conversation.title
    );

    setInput("");

    setTimeout(() => {
      textareaRef.current?.focus();
    }, 50);
  };

  // =====================================================
  // DELETE CHAT
  // =====================================================

  const deleteConversation = (
    event,
    conversationId
  ) => {
    event.stopPropagation();

    setRecentConversations(
      (previous) =>
        previous.filter(
          (chat) =>
            chat.id !== conversationId
        )
    );

    if (currentChatId === conversationId) {
      startNewChat();
    }
  };

  // =====================================================
  // STREAMING CHAT
  // =====================================================

  const sendMessage = async (
    text = input
  ) => {
    const question = text.trim();

    if (!question || isTyping) {
      return;
    }

    // ---------------------------------------------------
    // Chat ID
    // ---------------------------------------------------

    const chatId =
      currentChatId ||
      crypto.randomUUID();

    // ---------------------------------------------------
    // Title
    // ---------------------------------------------------

    const userMessages = messages.filter(
      (message) =>
        message.role === "user"
    );

    const isFirstMessage =
      userMessages.length === 0;

    const title = isFirstMessage
      ? createTitle(question)
      : currentChatTitle;

    // ---------------------------------------------------
    // User message
    // ---------------------------------------------------

    const userMessage = {
      id: crypto.randomUUID(),
      role: "user",
      content: question,
    };

    const updatedMessages = [
      ...messages,
      userMessage,
    ];

    setCurrentChatId(chatId);

    setCurrentChatTitle(title);

    setMessages(updatedMessages);

    setInput("");

    setIsTyping(true);

    // ---------------------------------------------------
    // Reset textarea
    // ---------------------------------------------------

    if (textareaRef.current) {
      textareaRef.current.style.height =
        "auto";
    }

    // ---------------------------------------------------
    // Save
    // ---------------------------------------------------

    updateRecentChat(
      chatId,
      updatedMessages,
      title
    );

    // ---------------------------------------------------
    // Empty AI message
    // ---------------------------------------------------

    const aiMessageId =
      crypto.randomUUID();

    const aiMessage = {
      id: aiMessageId,
      role: "assistant",
      content: "",
    };

    setMessages((previous) => [
      ...previous,
      aiMessage,
    ]);

    // ===================================================
    // BACKEND REQUEST
    // ===================================================

    try {
      const response = await fetch(
        `${API_URL}/chat`,
        {
          method: "POST",

          headers: {
            "Content-Type":
              "application/json",
          },

          body: JSON.stringify({
            question,
          }),
        }
      );

      if (!response.ok) {
        const error =
          await response.text();

        throw new Error(
          error ||
            `Backend error: ${response.status}`
        );
      }

      if (!response.body) {
        throw new Error(
          "Streaming is not supported."
        );
      }

      // -------------------------------------------------
      // STREAM
      // -------------------------------------------------

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

        if (done) {
          break;
        }

        const chunk =
          decoder.decode(value, {
            stream: true,
          });

        completeAnswer += chunk;

        // ------------------------------------------------
        // Update UI immediately
        // ------------------------------------------------

        setMessages((previous) =>
          previous.map((message) =>
            message.id ===
            aiMessageId
              ? {
                  ...message,
                  content:
                    completeAnswer,
                }
              : message
          )
        );
      }

      // Flush decoder
      completeAnswer +=
        decoder.decode();

      // -------------------------------------------------
      // Save completed conversation
      // -------------------------------------------------

      setMessages((previous) => {
        updateRecentChat(
          chatId,
          previous,
          title
        );

        return previous;
      });
    } catch (error) {
      console.error(
        "Ayush'Ai error:",
        error
      );

      setMessages((previous) =>
        previous.map((message) =>
          message.id === aiMessageId
            ? {
                ...message,
                content:
                  "I couldn't connect to Ayush'Ai. Please make sure your FastAPI backend is running on port 8000.",
              }
            : message
        )
      );
    } finally {
      setIsTyping(false);
    }
  };

  // =====================================================
  // ENTER
  // =====================================================

  const handleKeyDown = (event) => {
    if (
      event.key === "Enter" &&
      !event.shiftKey
    ) {
      event.preventDefault();

      sendMessage();
    }
  };

  // =====================================================
  // SEARCH FILTER
  // =====================================================

  const filteredConversations =
    useMemo(() => {
      if (!searchQuery.trim()) {
        return recentConversations;
      }

      const query =
        searchQuery
          .toLowerCase()
          .trim();

      return recentConversations.filter(
        (chat) =>
          chat.title
            .toLowerCase()
            .includes(query)
      );
    }, [
      recentConversations,
      searchQuery,
    ]);

  // =====================================================
  // SUGGESTIONS
  // =====================================================

  const suggestions = [
  {
    icon: "✦",
    title: "About Ayush",
    description: "Education, background and career profile",
    prompt:
      "Tell me about Ayush's background, education, career interests and professional profile using only the information available in his resume.",
  },

  {
    icon: "⌘",
    title: "Technical Skills",
    description: "Programming, development and AI skills",
    prompt:
      "What are Ayush's technical skills? Give me a clear overview of his programming languages, DSA, frontend, backend, database, tools and other technologies mentioned in his resume.",
  },

  {
    icon: "◈",
    title: "Projects",
    description: "Ayush's projects and development experience",
    prompt:
      "Tell me about Ayush's projects. Explain each project, its purpose, technologies used and the important features mentioned in his resume.",
  },

  {
    icon: "★",
    title: "Achievements & Certifications",
    description: "Certifications, courses and accomplishments",
    prompt:
      "Tell me about Ayush's achievements, certifications, courses, coding accomplishments and other credentials mentioned in his resume.",
  },
];
  // =====================================================
  // RENDER
  // =====================================================

  return (
    <div
      className={
        darkMode
          ? "min-h-screen bg-[#090a0d] text-white"
          : "min-h-screen bg-[#f8f9fb] text-[#17181c]"
      }
    >

      {/* =================================================
          SIDEBAR
      ================================================= */}

      <aside
        className={`
          fixed
          left-0
          top-0
          z-50
          h-screen
          border-r
          transition-all
          duration-300

          ${
            darkMode
              ? "border-white/[0.07] bg-[#0e1014]"
              : "border-black/[0.08] bg-white"
          }

          ${
            sidebarOpen
              ? "w-[260px]"
              : "w-0 -translate-x-full"
          }
        `}
      >

        {sidebarOpen && (
          <div className="flex h-full flex-col">

            {/* =========================================
                BRAND
            ========================================== */}

            <div className="flex items-center justify-between px-4 py-5">

              <button
                onClick={startNewChat}
                className="flex items-center gap-3"
              >

                <div
                  className="
                    flex
                    h-9
                    w-9
                    items-center
                    justify-center
                    rounded-xl
                    bg-gradient-to-br
                    from-violet-500
                    via-purple-500
                    to-indigo-600
                    shadow-[0_0_25px_rgba(139,92,246,0.25)]
                  "
                >
                  <Sparkles
                    size={18}
                    className="text-white"
                  />
                </div>

                <div className="text-left">

                  <div className="text-[15px] font-semibold tracking-tight">
                    Ayush'Ai
                  </div>

                  <div
                    className={
                      darkMode
                        ? "text-[10px] text-white/35"
                        : "text-[10px] text-black/35"
                    }
                  >
                    Personal AI Assistant
                  </div>

                </div>

              </button>

              <button
                onClick={() =>
                  setSidebarOpen(false)
                }
                className={`
                  rounded-lg
                  p-1.5
                  transition

                  ${
                    darkMode
                      ? "text-white/40 hover:bg-white/5 hover:text-white"
                      : "text-black/40 hover:bg-black/5 hover:text-black"
                  }
                `}
              >
                <X size={17} />
              </button>

            </div>

            {/* =========================================
                NEW CHAT
            ========================================== */}

            <div className="px-3">

              <button
                onClick={startNewChat}
                className="
                  flex
                  w-full
                  items-center
                  gap-3
                  rounded-xl
                  border
                  border-violet-500/20
                  bg-gradient-to-r
                  from-violet-500/10
                  to-indigo-500/10
                  px-3
                  py-2.5
                  text-sm
                  font-medium
                  transition
                  hover:border-violet-500/40
                  hover:from-violet-500/15
                  hover:to-indigo-500/15
                "
              >

                <Plus
                  size={17}
                  className="text-violet-400"
                />

                New chat

              </button>

            </div>

            {/* =========================================
                SEARCH
            ========================================== */}

            <div className="px-3 py-4">

              <div
                className={`
                  flex
                  items-center
                  gap-2
                  rounded-xl
                  border
                  px-3
                  py-2

                  ${
                    darkMode
                      ? "border-white/[0.08] bg-white/[0.025]"
                      : "border-black/[0.08] bg-black/[0.025]"
                  }
                `}
              >

                <Search
                  size={16}
                  className={
                    darkMode
                      ? "text-white/30"
                      : "text-black/30"
                  }
                />

                <input
                  value={searchQuery}
                  onChange={(event) =>
                    setSearchQuery(
                      event.target.value
                    )
                  }
                  placeholder="Search conversations"
                  className="
                    w-full
                    bg-transparent
                    text-xs
                    outline-none
                    placeholder:text-gray-500
                  "
                />

              </div>

            </div>

            {/* =========================================
                RECENT
            ========================================== */}

            <div className="flex-1 overflow-y-auto px-3">

              {filteredConversations.length >
              0 ? (
                <>
                  <div
                    className={
                      darkMode
                        ? "mb-2 px-2 text-[10px] font-semibold uppercase tracking-[0.12em] text-white/25"
                        : "mb-2 px-2 text-[10px] font-semibold uppercase tracking-[0.12em] text-black/30"
                    }
                  >
                    Recent conversations
                  </div>

                  <div className="space-y-1">

                    {filteredConversations.map(
                      (conversation) => (
                        <button
                          key={conversation.id}
                          onClick={() =>
                            openConversation(
                              conversation
                            )
                          }
                          className={`
                            group
                            flex
                            w-full
                            items-center
                            gap-2.5
                            rounded-lg
                            px-2.5
                            py-2.5
                            text-left
                            transition

                            ${
                              currentChatId ===
                              conversation.id
                                ? darkMode
                                  ? "bg-white/[0.07]"
                                  : "bg-black/[0.05]"
                                : darkMode
                                  ? "hover:bg-white/[0.04]"
                                  : "hover:bg-black/[0.035]"
                            }
                          `}
                        >

                          <MessageSquare
                            size={14}
                            className="shrink-0 opacity-35"
                          />

                          <span className="min-w-0 flex-1 truncate text-xs">
                            {conversation.title}
                          </span>

                          <span
                            onClick={(event) =>
                              deleteConversation(
                                event,
                                conversation.id
                              )
                            }
                            className="
                              hidden
                              rounded-md
                              p-1
                              opacity-40
                              transition
                              hover:bg-red-500/10
                              hover:text-red-400
                              group-hover:block
                            "
                          >
                            <Trash2 size={12} />
                          </span>

                        </button>
                      )
                    )}

                  </div>
                </>
              ) : (
                <div
                  className={`
                    flex
                    flex-col
                    items-center
                    px-5
                    pt-12
                    text-center

                    ${
                      darkMode
                        ? "text-white/25"
                        : "text-black/30"
                    }
                  `}
                >

                  <MessageSquare
                    size={22}
                    className="mb-3 opacity-40"
                  />

                  <p className="text-xs">
                    No recent conversations
                  </p>

                  <p className="mt-1 text-[10px] opacity-60">
                    Your conversations will appear here
                  </p>

                </div>
              )}

            </div>

            {/* =========================================
                SIDEBAR FOOTER
            ========================================== */}

            <div
              className={`
                border-t
                px-4
                py-4

                ${
                  darkMode
                    ? "border-white/[0.07]"
                    : "border-black/[0.07]"
                }
              `}
            >

              <div className="flex items-center gap-3">

                <div
                  className="
                    flex
                    h-8
                    w-8
                    items-center
                    justify-center
                    rounded-full
                    bg-gradient-to-br
                    from-violet-500
                    to-indigo-600
                    text-xs
                    font-semibold
                    text-white
                  "
                >
                  A
                </div>

                <div className="min-w-0">

                  <div className="truncate text-xs font-medium">
                    Ayush
                  </div>

                  <div
                    className={
                      darkMode
                        ? "text-[10px] text-white/30"
                        : "text-[10px] text-black/30"
                    }
                  >
                    Resume Assistant
                  </div>

                </div>

              </div>

            </div>

          </div>
        )}

      </aside>

      {/* =================================================
          MAIN
      ================================================= */}

      <main
        className={`
          min-h-screen
          transition-all
          duration-300

          ${
            sidebarOpen
              ? "ml-[260px]"
              : "ml-0"
          }
        `}
      >

        {/* ===============================================
            TOP BAR
        ============================================== */}

        <header
          className={`
            sticky
            top-0
            z-40
            flex
            h-14
            items-center
            justify-between
            border-b
            px-4
            backdrop-blur-xl

            ${
              darkMode
                ? "border-white/[0.06] bg-[#090a0d]/75"
                : "border-black/[0.06] bg-[#f8f9fb]/80"
            }
          `}
        >

          {/* LEFT */}

          <div className="flex items-center gap-2">

            {!sidebarOpen && (
              <button
                onClick={() =>
                  setSidebarOpen(true)
                }
                className={`
                  rounded-lg
                  p-2

                  ${
                    darkMode
                      ? "text-white/50 hover:bg-white/5 hover:text-white"
                      : "text-black/50 hover:bg-black/5 hover:text-black"
                  }
                `}
              >
                <Menu size={19} />
              </button>
            )}

            <div className="flex items-center gap-2">

              <span
                className={`
                  text-sm
                  font-medium

                  ${
                    darkMode
                      ? "text-white/80"
                      : "text-black/75"
                  }
                `}
              >
                {currentChatTitle}
              </span>

            </div>

          </div>

          {/* =========================================
              ONLY DARK/LIGHT TOGGLE
          ========================================== */}

          <button
            onClick={() =>
              setDarkMode(!darkMode)
            }
            aria-label="Toggle dark mode"
            className={`
              relative
              flex
              h-8
              w-[58px]
              items-center
              rounded-full
              border
              p-1
              transition

              ${
                darkMode
                  ? "border-white/10 bg-white/[0.06]"
                  : "border-black/10 bg-black/[0.05]"
              }
            `}
          >

            <div
              className={`
                absolute
                flex
                h-6
                w-6
                items-center
                justify-center
                rounded-full
                shadow-sm
                transition-all
                duration-300

                ${
                  darkMode
                    ? "translate-x-[24px] bg-[#252831]"
                    : "translate-x-0 bg-white"
                }
              `}
            >

              {darkMode ? (
                <Moon
                  size={13}
                  className="text-violet-300"
                />
              ) : (
                <Sun
                  size={13}
                  className="text-amber-500"
                />
              )}

            </div>

            <div className="flex w-full justify-between px-1">

              <Sun
                size={12}
                className={
                  darkMode
                    ? "text-white/20"
                    : "text-amber-500/60"
                }
              />

              <Moon
                size={12}
                className={
                  darkMode
                    ? "text-violet-300/60"
                    : "text-black/20"
                }
              />

            </div>

          </button>

        </header>

        {/* ===============================================
            CHAT AREA
        ============================================== */}

        <div className="mx-auto flex min-h-[calc(100vh-56px)] max-w-4xl flex-col px-4">

          {/* =============================================
              MESSAGES
          ============================================ */}

          <div className="flex-1 py-8">

            {messages.map((message) => (
              <div
                key={message.id}
                className={`
                  mb-7
                  flex
                  gap-3.5

                  ${
                    message.role ===
                    "user"
                      ? "justify-end"
                      : "justify-start"
                  }
                `}
              >

                {/* AI AVATAR */}

                {message.role ===
                  "assistant" && (
                  <div
                    className="
                      flex
                      h-8
                      w-8
                      shrink-0
                      items-center
                      justify-center
                      rounded-xl
                      bg-gradient-to-br
                      from-violet-500
                      to-indigo-600
                      shadow-[0_0_20px_rgba(139,92,246,0.18)]
                    "
                  >
                    <Bot
                      size={16}
                      className="text-white"
                    />
                  </div>
                )}

                {/* MESSAGE */}

                <div
                  className={`
                    max-w-[78%]
                    whitespace-pre-wrap
                    break-words
                    text-[14px]
                    leading-7

                    ${
                      message.role ===
                      "user"
                        ? darkMode
                          ? "rounded-2xl rounded-br-md bg-[#20232a] px-4 py-2.5 text-white/90"
                          : "rounded-2xl rounded-br-md bg-white px-4 py-2.5 text-black/80 shadow-sm"
                        : darkMode
                          ? "text-white/80"
                          : "text-black/75"
                    }
                  `}
                >
                  <ReactMarkdown remarkPlugins={[remarkGfm]}>
                    {message.content}
                  </ReactMarkdown>
                </div>

                {/* USER AVATAR */}

                {message.role ===
                  "user" && (
                  <div
                    className={`
                      flex
                      h-8
                      w-8
                      shrink-0
                      items-center
                      justify-center
                      rounded-xl

                      ${
                        darkMode
                          ? "bg-white/[0.08]"
                          : "bg-black/[0.06]"
                      }
                    `}
                  >
                    <User size={15} />
                  </div>
                )}

              </div>
            ))}

            {/* =========================================
                TYPING
            ========================================== */}

            {isTyping && (
              <div className="mb-7 flex gap-3.5">

                <div
                  className="
                    flex
                    h-8
                    w-8
                    items-center
                    justify-center
                    rounded-xl
                    bg-gradient-to-br
                    from-violet-500
                    to-indigo-600
                  "
                >
                  <Bot
                    size={16}
                    className="text-white"
                  />
                </div>

                <div className="flex items-center gap-1">

                  <span className="h-1.5 w-1.5 animate-bounce rounded-full bg-current opacity-30" />

                  <span className="h-1.5 w-1.5 animate-bounce rounded-full bg-current opacity-30 [animation-delay:150ms]" />

                  <span className="h-1.5 w-1.5 animate-bounce rounded-full bg-current opacity-30 [animation-delay:300ms]" />

                </div>

              </div>
            )}

            <div ref={messagesEndRef} />

          </div>

          {/* =============================================
              WELCOME SUGGESTIONS
          ============================================ */}

          {messages.length === 1 && (
            <div className="pb-5">

              <div className="mb-4 text-center">

                <div
                  className="
                    mx-auto
                    mb-3
                    flex
                    h-12
                    w-12
                    items-center
                    justify-center
                    rounded-2xl
                    bg-gradient-to-br
                    from-violet-500
                    to-indigo-600
                    shadow-[0_0_35px_rgba(139,92,246,0.2)]
                  "
                >
                  <Sparkles
                    size={22}
                    className="text-white"
                  />
                </div>

                <h1
                  className={`
                    text-xl
                    font-semibold
                    tracking-tight

                    ${
                      darkMode
                        ? "text-white"
                        : "text-black/85"
                    }
                  `}
                >
                  How can I help you?
                </h1>

                <p
                  className={
                    darkMode
                      ? "mt-1 text-xs text-white/35"
                      : "mt-1 text-xs text-black/35"
                  }
                >
                  Ask Ayush'Ai anything about your career profile
                </p>

              </div>

              <div className="grid grid-cols-1 gap-2 sm:grid-cols-2">

                {suggestions.map(
                  (suggestion) => (
                    <button
                      key={suggestion.title}
                      onClick={() =>
                        sendMessage(
                          suggestion.prompt
                        )
                      }
                      className={`
                        group
                        rounded-xl
                        border
                        p-3.5
                        text-left
                        transition-all
                        duration-200

                        ${
                          darkMode
                            ? "border-white/[0.07] bg-white/[0.025] hover:border-violet-500/25 hover:bg-violet-500/[0.04]"
                            : "border-black/[0.07] bg-white hover:border-violet-500/20 hover:bg-violet-500/[0.025]"
                        }
                      `}
                    >

                      <div className="mb-2 flex items-center gap-2">

                        <span
                          className="
                            flex
                            h-7
                            w-7
                            items-center
                            justify-center
                            rounded-lg
                            bg-violet-500/10
                            text-xs
                            text-violet-400
                          "
                        >
                          {suggestion.icon}
                        </span>

                        <span className="text-xs font-medium">
                          {suggestion.title}
                        </span>

                      </div>

                      <div
                        className={
                          darkMode
                            ? "text-[11px] text-white/35"
                            : "text-[11px] text-black/40"
                        }
                      >
                        {suggestion.description}
                      </div>

                    </button>
                  )
                )}

              </div>

            </div>
          )}

          {/* =============================================
              MESSAGE INPUT
          ============================================ */}

          <div className="sticky bottom-0 pb-4 pt-2">

            <div
              className={`
                mx-auto
                w-full
                max-w-2xl
                rounded-2xl
                border
                p-2
                shadow-[0_10px_40px_rgba(0,0,0,0.12)]
                backdrop-blur-xl

                ${
                  darkMode
                    ? "border-white/[0.09] bg-[#15171c]"
                    : "border-black/[0.08] bg-white"
                }
              `}
            >

              {/* TEXT */}

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
                placeholder="Message Ayush'Ai..."
                rows={1}
                disabled={isTyping}
                className={`
                  block
                  max-h-[100px]
                  min-h-[40px]
                  w-full
                  resize-none
                  overflow-y-auto
                  bg-transparent
                  px-2
                  pt-1.5
                  text-[14px]
                  leading-6
                  outline-none
                  placeholder:text-gray-500

                  ${
                    darkMode
                      ? "text-white"
                      : "text-black"
                  }
                `}
              />

              {/* CONTROLS */}

              <div className="flex items-center justify-between px-1">

                <div className="flex items-center">

                  <button
                    type="button"
                    className={`
                      flex
                      h-8
                      w-8
                      items-center
                      justify-center
                      rounded-lg
                      transition

                      ${
                        darkMode
                          ? "text-white/30 hover:bg-white/5 hover:text-white/70"
                          : "text-black/30 hover:bg-black/5 hover:text-black/70"
                      }
                    `}
                  >
                    <Paperclip size={16} />
                  </button>

                  <button
                    type="button"
                    className={`
                      flex
                      h-8
                      w-8
                      items-center
                      justify-center
                      rounded-lg
                      transition

                      ${
                        darkMode
                          ? "text-white/30 hover:bg-white/5 hover:text-white/70"
                          : "text-black/30 hover:bg-black/5 hover:text-black/70"
                      }
                    `}
                  >
                    <Mic size={16} />
                  </button>

                </div>

                <button
                  onClick={() =>
                    sendMessage()
                  }
                  disabled={
                    !input.trim() ||
                    isTyping
                  }
                  className="
                    flex
                    h-8
                    w-8
                    items-center
                    justify-center
                    rounded-xl
                    bg-gradient-to-r
                    from-violet-500
                    to-indigo-600
                    text-white
                    shadow-md
                    transition
                    hover:from-violet-400
                    hover:to-indigo-500
                    disabled:cursor-not-allowed
                    disabled:opacity-25
                  "
                >
                  <Send size={15} />
                </button>

              </div>

            </div>

            <div
              className={
                darkMode
                  ? "mt-2 text-center text-[9px] text-white/20"
                  : "mt-2 text-center text-[9px] text-black/25"
              }
            >
              Ayush'Ai uses information from your resume to answer questions.
            </div>

          </div>

        </div>

      </main>

    </div>
  );
}

export default App;