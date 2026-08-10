import { useEffect, useRef, useState } from "react";
import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";

import {
  Menu,
  Plus,
  Search,
  Send,
  Moon,
  Sun,
  Paperclip,
  User,
  Bot,
  Trash2,
  X,
} from "lucide-react";

// =========================================================
// API
// =========================================================

const API_URL = (
  import.meta.env.VITE_API_URL ||
  "https://hiremeai-ayush-ai.onrender.com"
).replace(/\/$/, "");

// =========================================================
// INITIAL MESSAGE
// =========================================================

const INITIAL_MESSAGE = {
  id: "initial-message",
  role: "assistant",
  content: `# Hello, I'm Ayush'Ai 👋

I'm Ayush Gupta's personal AI career assistant.

I can help you explore Ayush's:

- Education
- Technical skills
- DSA knowledge
- Projects
- Certifications
- Strengths and weaknesses
- Career interests
- GitHub and LinkedIn
- Resume information

Ask me anything about Ayush's professional profile.`,
};

// =========================================================
// HELPERS
// =========================================================

function createTitle(text) {
  const clean = text.trim();

  if (clean.length <= 32) {
    return clean;
  }

  return `${clean.substring(0, 32)}...`;
}

function cleanMarkdown(text) {
  if (!text) return "";

  return text
    .replace(/<br\s*\/?>/gi, "\n")
    .replace(/<\/?p>/gi, "\n")
    .replace(/<\/?div>/gi, "\n")
    .replace(/<\/?span>/gi, "")
    .replace(/\n{3,}/g, "\n\n")
    .trim();
}

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

    if (saved) {
      return saved === "dark";
    }

    return false;
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

  const [recentChats, setRecentChats] = useState(() => {
    try {
      const saved = localStorage.getItem(
        "ayush-ai-recent-chats"
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
  // THEME EFFECT
  // =========================================================

  useEffect(() => {
    localStorage.setItem(
      "ayush-ai-theme",
      darkMode ? "dark" : "light"
    );
  }, [darkMode]);

  // =========================================================
  // SAVE RECENT CHATS
  // =========================================================

  useEffect(() => {
    localStorage.setItem(
      "ayush-ai-recent-chats",
      JSON.stringify(recentChats)
    );
  }, [recentChats]);

  // =========================================================
  // AUTO SCROLL
  // =========================================================

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({
      behavior: "smooth",
    });
  }, [messages]);

  // =========================================================
  // TEXTAREA HEIGHT
  // =========================================================

  const resizeTextarea = () => {
    if (!textareaRef.current) return;

    textareaRef.current.style.height = "auto";

    textareaRef.current.style.height = `${Math.min(
      textareaRef.current.scrollHeight,
      140
    )}px`;
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

    if (textareaRef.current) {
      textareaRef.current.style.height = "auto";
    }
  };

  // =========================================================
  // UPDATE RECENT CHAT
  // =========================================================

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

    setRecentChats((previous) => {
      const existing = previous.find(
        (chat) => chat.id === chatId
      );

      const updatedChat = {
        id: chatId,
        title,
        messages: chatMessages,
        updatedAt: Date.now(),
      };

      let updated;

      if (existing) {
        updated = previous.map((chat) =>
          chat.id === chatId ? updatedChat : chat
        );
      } else {
        updated = [updatedChat, ...previous];
      }

      return updated
        .sort(
          (a, b) =>
            b.updatedAt - a.updatedAt
        )
        .slice(0, 10);
    });
  };

  // =========================================================
  // LOAD RECENT CHAT
  // =========================================================

  const loadRecentChat = (chat) => {
    setCurrentChatId(chat.id);

    setCurrentChatTitle(chat.title);

    setMessages(chat.messages);

    setInput("");

    setIsTyping(false);
  };

  // =========================================================
  // DELETE RECENT CHAT
  // =========================================================

  const deleteRecentChat = (
    event,
    chatId
  ) => {
    event.stopPropagation();

    setRecentChats((previous) =>
      previous.filter(
        (chat) => chat.id !== chatId
      )
    );

    if (currentChatId === chatId) {
      startNewChat();
    }
  };

  // =========================================================
  // SEND MESSAGE
  // =========================================================

  const sendMessage = async (
    messageText = input
  ) => {
    const question = messageText.trim();

    if (!question || isTyping) {
      return;
    }

    const chatId =
      currentChatId || crypto.randomUUID();

    const userMessages = messages.filter(
      (message) => message.role === "user"
    );

    const isFirstMessage =
      userMessages.length === 0;

    const title = isFirstMessage
      ? createTitle(question)
      : currentChatTitle;

    const userMessage = {
      id: crypto.randomUUID(),
      role: "user",
      content: question,
    };

    const assistantMessageId =
      crypto.randomUUID();

    const assistantMessage = {
      id: assistantMessageId,
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
      const endpoint = `${API_URL}/chat`;

      console.log(
        "Connecting to:",
        endpoint
      );

      const response = await fetch(endpoint, {
        method: "POST",

        headers: {
          "Content-Type": "application/json",
          Accept: "text/plain",
        },

        body: JSON.stringify({
          question,
        }),
      });

      console.log(
        "Backend status:",
        response.status
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
          "Backend did not return a streaming response."
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

        if (done) {
          break;
        }

        const chunk =
          decoder.decode(value, {
            stream: true,
          });

        completeAnswer += chunk;

        const formattedAnswer =
          cleanMarkdown(
            completeAnswer
          );

        setMessages((previous) =>
          previous.map(
            (message) =>
              message.id ===
              assistantMessageId
                ? {
                    ...message,
                    content:
                      formattedAnswer,
                  }
                : message
          )
        );
      }

      completeAnswer +=
        decoder.decode();

      const finalAnswer =
        cleanMarkdown(
          completeAnswer
        );

      setMessages((previous) => {
        const finalMessages =
          previous.map(
            (message) =>
              message.id ===
              assistantMessageId
                ? {
                    ...message,
                    content:
                      finalAnswer,
                  }
                : message
          );

        updateRecentChat(
          chatId,
          finalMessages,
          title
        );

        return finalMessages;
      });
    } catch (error) {
      console.error(
        "Ayush'Ai connection error:",
        error
      );

      setMessages((previous) =>
        previous.map(
          (message) =>
            message.id ===
            assistantMessageId
              ? {
                  ...message,
                  content:
                    "I couldn't connect to Ayush'Ai. Please check the backend and try again.",
                }
              : message
        )
      );
    } finally {
      setIsTyping(false);
    }
  };

  // =========================================================
  // ENTER KEY
  // =========================================================

  const handleKeyDown = (event) => {
    if (event.key === "Enter" && !event.shiftKey) {
      event.preventDefault();

      sendMessage();
    }
  };

  // =========================================================
  // SEARCH FILTER
  // =========================================================

  const filteredChats =
    recentChats.filter((chat) =>
      chat.title
        .toLowerCase()
        .includes(
          searchQuery.toLowerCase()
        )
    );

  // =========================================================
  // UI
  // =========================================================

  return (
    <div
      className={`min-h-screen flex ${
        darkMode
          ? "bg-[#212121] text-gray-100"
          : "bg-white text-gray-900"
      }`}
    >
      {/* =====================================================
          SIDEBAR
      ===================================================== */}

      <aside
        className={`
          fixed md:relative z-30
          h-screen
          flex flex-col
          border-r
          transition-all duration-300
          ${
            sidebarOpen
              ? "w-[270px]"
              : "w-0 overflow-hidden border-none"
          }
          ${
            darkMode
              ? "bg-[#171717] border-[#303030]"
              : "bg-[#f7f7f8] border-gray-200"
          }
        `}
      >
        {/* Logo */}

        <div className="px-5 pt-5 pb-4">
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-xl font-bold">
                Ayush'Ai
              </h1>

              <p
                className={`text-xs mt-1 ${
                  darkMode
                    ? "text-gray-400"
                    : "text-gray-500"
                }`}
              >
                AI Career Assistant
              </p>
            </div>

            <button
              onClick={() =>
                setSidebarOpen(false)
              }
              className={`md:hidden p-2 rounded-lg ${
                darkMode
                  ? "hover:bg-[#2a2a2a]"
                  : "hover:bg-gray-200"
              }`}
            >
              <X size={18} />
            </button>
          </div>
        </div>

        {/* New chat */}

        <div className="px-3">
          <button
            onClick={startNewChat}
            className={`
              w-full
              flex items-center gap-3
              px-4 py-3
              rounded-xl
              border
              transition
              ${
                darkMode
                  ? "border-[#3a3a3a] hover:bg-[#2a2a2a]"
                  : "border-gray-200 hover:bg-gray-200"
              }
            `}
          >
            <Plus size={18} />

            <span className="font-medium">
              New chat
            </span>
          </button>
        </div>

        {/* Search */}

        <div className="px-3 mt-4">
          <div
            className={`
              flex items-center gap-2
              px-3 py-2.5
              rounded-xl
              ${
                darkMode
                  ? "bg-[#2a2a2a]"
                  : "bg-white border border-gray-200"
              }
            `}
          >
            <Search
              size={17}
              className={
                darkMode
                  ? "text-gray-400"
                  : "text-gray-500"
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
              className={`
                flex-1
                bg-transparent
                outline-none
                text-sm
                ${
                  darkMode
                    ? "placeholder:text-gray-500"
                    : "placeholder:text-gray-400"
                }
              `}
            />
          </div>
        </div>

        {/* Recent */}

        <div className="flex-1 overflow-y-auto px-3 mt-5">
          <p
            className={`px-2 mb-2 text-xs font-semibold uppercase tracking-wider ${
              darkMode
                ? "text-gray-500"
                : "text-gray-400"
            }`}
          >
            Recent
          </p>

          {filteredChats.length === 0 ? (
            <p
              className={`px-2 py-3 text-sm ${
                darkMode
                  ? "text-gray-500"
                  : "text-gray-400"
              }`}
            >
              No recent conversations
            </p>
          ) : (
            <div className="space-y-1">
              {filteredChats.map((chat) => (
                <button
                  key={chat.id}
                  onClick={() =>
                    loadRecentChat(chat)
                  }
                  className={`
                    group
                    w-full
                    flex items-center gap-2
                    text-left
                    px-3 py-2.5
                    rounded-lg
                    text-sm
                    ${
                      darkMode
                        ? "hover:bg-[#2a2a2a]"
                        : "hover:bg-gray-200"
                    }
                  `}
                >
                  <span className="flex-1 truncate">
                    {chat.title}
                  </span>

                  <Trash2
                    size={15}
                    onClick={(event) =>
                      deleteRecentChat(
                        event,
                        chat.id
                      )
                    }
                    className={`
                      shrink-0
                      opacity-0
                      group-hover:opacity-100
                      transition
                      ${
                        darkMode
                          ? "text-gray-500 hover:text-red-400"
                          : "text-gray-400 hover:text-red-500"
                      }
                    `}
                  />
                </button>
              ))}
            </div>
          )}
        </div>

        {/* Bottom */}

        <div
          className={`p-4 border-t ${
            darkMode
              ? "border-[#303030]"
              : "border-gray-200"
          }`}
        >
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-full bg-black text-white flex items-center justify-center font-semibold">
              A
            </div>

            <div>
              <p className="text-sm font-medium">
                Ayush Gupta
              </p>

              <p
                className={`text-xs ${
                  darkMode
                    ? "text-gray-500"
                    : "text-gray-500"
                }`}
              >
                Personal AI
              </p>
            </div>
          </div>
        </div>
      </aside>

      {/* =====================================================
          MAIN
      ===================================================== */}

      <main className="flex-1 min-w-0 flex flex-col h-screen">
        {/* Header */}

        <header
          className={`
            h-16
            shrink-0
            flex items-center justify-between
            px-4 md:px-6
            border-b
            ${
              darkMode
                ? "border-[#303030]"
                : "border-gray-200"
            }
          `}
        >
          <div className="flex items-center gap-3">
            <button
              onClick={() =>
                setSidebarOpen(
                  !sidebarOpen
                )
              }
              className={`p-2 rounded-lg ${
                darkMode
                  ? "hover:bg-[#2a2a2a]"
                  : "hover:bg-gray-100"
              }`}
            >
              <Menu size={20} />
            </button>

            <div>
              <h2 className="font-semibold">
                Ayush'Ai
              </h2>

              <p
                className={`text-xs ${
                  darkMode
                    ? "text-gray-500"
                    : "text-gray-400"
                }`}
              >
                Career & Resume Assistant
              </p>
            </div>
          </div>

          {/* ONLY TOGGLE */}

          <button
            onClick={() =>
              setDarkMode(!darkMode)
            }
            aria-label="Toggle dark and light mode"
            className={`
              w-10 h-10
              rounded-full
              flex items-center justify-center
              transition
              ${
                darkMode
                  ? "bg-[#2a2a2a] hover:bg-[#333]"
                  : "bg-gray-100 hover:bg-gray-200"
              }
            `}
          >
            {darkMode ? (
              <Sun size={18} />
            ) : (
              <Moon size={18} />
            )}
          </button>
        </header>

        {/* ===================================================
            CHAT AREA
        =================================================== */}

        <section className="flex-1 overflow-y-auto">
          <div className="max-w-4xl mx-auto px-4 md:px-6 py-8">
            {messages.map((message) => (
              <div
                key={message.id}
                className="mb-8"
              >
                {message.role === "user" ? (
                  <div className="flex justify-end">
                    <div
                      className={`
                        max-w-[80%]
                        px-4 py-3
                        rounded-2xl
                        ${
                          darkMode
                            ? "bg-[#303030]"
                            : "bg-[#f4f4f4]"
                        }
                      `}
                    >
                      <p className="whitespace-pre-wrap text-sm leading-6">
                        {message.content}
                      </p>
                    </div>
                  </div>
                ) : (
                  <div className="flex gap-3">
                    <div
                      className={`
                        shrink-0
                        w-8 h-8
                        rounded-full
                        flex items-center justify-center
                        ${
                          darkMode
                            ? "bg-white text-black"
                            : "bg-black text-white"
                        }
                      `}
                    >
                      <Bot size={17} />
                    </div>

                    <div className="min-w-0 flex-1">
                      <div
                        className={`
                          prose
                          max-w-none
                          text-sm
                          leading-7
                          ${
                            darkMode
                              ? "prose-invert"
                              : ""
                          }
                        `}
                      >
                        <ReactMarkdown
                          remarkPlugins={[
                            remarkGfm,
                          ]}
                        >
                          {message.content}
                        </ReactMarkdown>
                      </div>
                    </div>
                  </div>
                )}
              </div>
            ))}

            {isTyping &&
              messages[
                messages.length - 1
              ]?.content === "" && (
                <div className="flex gap-3">
                  <div
                    className={`
                      w-8 h-8
                      rounded-full
                      flex items-center justify-center
                      ${
                        darkMode
                          ? "bg-white text-black"
                          : "bg-black text-white"
                      }
                    `}
                  >
                    <Bot size={17} />
                  </div>

                  <div className="flex items-center gap-1 py-3">
                    <span className="w-2 h-2 rounded-full bg-gray-400 animate-bounce" />
                    <span
                      className="w-2 h-2 rounded-full bg-gray-400 animate-bounce"
                      style={{
                        animationDelay:
                          "100ms",
                      }}
                    />
                    <span
                      className="w-2 h-2 rounded-full bg-gray-400 animate-bounce"
                      style={{
                        animationDelay:
                          "200ms",
                      }}
                    />
                  </div>
                </div>
              )}

            <div ref={messagesEndRef} />
          </div>
        </section>

        {/* ===================================================
            INPUT
        =================================================== */}

        <div className="shrink-0 px-4 md:px-6 pb-5">
          <div className="max-w-3xl mx-auto">
            <div
              className={`
                rounded-2xl
                border
                p-2
                shadow-sm
                ${
                  darkMode
                    ? "bg-[#2f2f2f] border-[#454545]"
                    : "bg-white border-gray-300"
                }
              `}
            >
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
                  w-full
                  resize-none
                  bg-transparent
                  outline-none
                  px-3
                  pt-2
                  pb-1
                  text-sm
                  max-h-[140px]
                  ${
                    darkMode
                      ? "placeholder:text-gray-500"
                      : "placeholder:text-gray-400"
                  }
                `}
              />

              <div className="flex items-center justify-between px-2 pb-1 pt-1">
                <button
                  className={`p-2 rounded-lg ${
                    darkMode
                      ? "hover:bg-[#3a3a3a]"
                      : "hover:bg-gray-100"
                  }`}
                  type="button"
                >
                  <Paperclip size={18} />
                </button>

                <button
                  onClick={() =>
                    sendMessage()
                  }
                  disabled={
                    !input.trim() ||
                    isTyping
                  }
                  className={`
                    p-2.5
                    rounded-xl
                    transition
                    ${
                      input.trim() &&
                      !isTyping
                        ? darkMode
                          ? "bg-white text-black hover:bg-gray-200"
                          : "bg-black text-white hover:bg-gray-800"
                        : darkMode
                        ? "bg-[#404040] text-gray-600"
                        : "bg-gray-200 text-gray-400"
                    }
                  `}
                >
                  <Send size={17} />
                </button>
              </div>
            </div>

            <p
              className={`text-center text-[11px] mt-2 ${
                darkMode
                  ? "text-gray-600"
                  : "text-gray-400"
              }`}
            >
              Ayush'Ai can make mistakes. Verify
              important information.
            </p>
          </div>
        </div>
      </main>
    </div>
  );
}