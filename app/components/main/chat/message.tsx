"use client";
import React, { useEffect, useRef, useState, useCallback } from "react";
import Image from "next/image";
import { useAuth } from "@/lib/useAuth";
import pb from "@/lib/pocketbase";
import ChatAvatar from "../../Avatars/chatAvatar";
import Loader from "../../loader/loader";
import AudioPlayer from "../UseAudio/AudioPlayer";

type MessageRecord = {
  id: string;
  sender: string;
  receiver: string;
  text?: string;
  file?: string;
  fileType?: string;
  fileName?: string;
  timestamp: string;
  fileSize?: string;
  replyTo?: string;
  status: "sent" | "delivered" | "seen";
  expand?: {
    sender: { id: string; username: string };
    receiver: { id: string; username: string };
    replyTo?: MessageRecord & {
      expand?: {
        sender?: { id: string; username: string } | null;
      };
    };
  };
};

type MessageProps = {
  activeUser: {
    id: string;
    username: string;
  };
  replyingTo: string;
  setReplyingTo: (c: string) => void;
  onOptimisticMessage?: (msg: MessageRecord) => void;
};

function Message({ activeUser, replyingTo, setReplyingTo }: MessageProps) {
  const [fullImage, setFullImage] = useState<MessageRecord | null>(null);
  const [fullVideo, setFullVideo] = useState<MessageRecord | null>(null);
  const endRef = useRef<HTMLDivElement>(null);
  const { user } = useAuth();
  const [messages, setMessages] = useState<MessageRecord[]>([]);
  const messageRefs = useRef<(HTMLDivElement | null)[]>([]);
  const processedStatusUpdates = useRef(new Set<string>());
  const [isLoading, setIsLoading] = useState(true);
  const showProfilePic = user?.showChatsProfilePic;
  const [quoted, setQuoted] = useState<MessageRecord | null>(null);
  const [deleteMsgId, setDeleteMsgId] = useState<string | null>(null);

  const fmtSize = (b: number) => {
    const u = ["B", "KB", "MB", "GB"],
      i = Math.floor(Math.log(b) / Math.log(1024));
    return `${(b / 1024 ** i).toFixed(1)} ${u[i]}`;
  };
  const handleDownloadFile = (fileUrl: string, fileName: string) => {
    fetch(fileUrl)
      .then((response) => response.blob())
      .then((blob) => {
        const url = window.URL.createObjectURL(blob);
        const link = document.createElement("a");
        link.href = url;
        link.download = fileName || "download";
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
        window.URL.revokeObjectURL(url);
      })
      .catch((err) => console.error("Download failed:", err));
  };

  // Helper function to get date label
  const getDateLabel = (timestamp: string): string => {
    const messageDate = new Date(timestamp);
    const today = new Date();
    const yesterday = new Date(today);
    yesterday.setDate(yesterday.getDate() - 1);

    // Reset time to compare dates only
    const messageDateOnly = new Date(
      messageDate.getFullYear(),
      messageDate.getMonth(),
      messageDate.getDate()
    );
    const todayOnly = new Date(today.getFullYear(), today.getMonth(), today.getDate());
    const yesterdayOnly = new Date(
      yesterday.getFullYear(),
      yesterday.getMonth(),
      yesterday.getDate()
    );

    if (messageDateOnly.getTime() === todayOnly.getTime()) {
      return "Today";
    } else if (messageDateOnly.getTime() === yesterdayOnly.getTime()) {
      return "Yesterday";
    } else {
      // Check if it's within the current week
      const daysDiff = Math.floor(
        (todayOnly.getTime() - messageDateOnly.getTime()) / (1000 * 60 * 60 * 24)
      );

      if (daysDiff <= 7 && daysDiff > 1) {
        return messageDate.toLocaleDateString("en-US", { weekday: "long" });
      } else {
        // For older messages, show the full date
        return messageDate.toLocaleDateString("en-US", {
          month: "short",
          day: "numeric",
          year: messageDate.getFullYear() !== today.getFullYear() ? "numeric" : undefined,
        });
      }
    }
  };

  
  const shouldShowDateSeparator = (
    currentMessage: MessageRecord,
    previousMessage: MessageRecord | null
  ): boolean => {
    if (!previousMessage) return true;

    const currentDate = new Date(currentMessage.timestamp);
    const previousDate = new Date(previousMessage.timestamp);

    // Check if they're on different days
    return currentDate.toDateString() !== previousDate.toDateString();
  };

  const fetchMessages = async () => {
    if (!user?.id || !activeUser.id) return;

    try {
      const records = await pb.collection("messages").getFullList({
        filter: `((sender = "${user.id}" && receiver = "${activeUser.id}") || (sender = "${activeUser.id}" && receiver = "${user.id}")) && hiddenFor !~ "${user.id}"`,
        sort: "timestamp",
        $autoCancel: false,
      });

      // Ensure unique messages by ID
      const uniqueMessages = Array.from(
        new Map(records.map((record) => [record.id, record])).values()
      );

      setMessages(uniqueMessages as unknown as MessageRecord[]);

      // When we open a chat, mark delivered messages from activeUser as seen
      const messagesToMarkSeen = records.filter(
        (msg: any) =>
          msg.sender === activeUser.id && msg.receiver === user?.id && msg.status === "delivered" // Only change delivered to seen, not sent to delivered
      );

      // Update status to seen for delivered messages when opening chat
      for (const msg of messagesToMarkSeen) {
        try {
          await pb.collection("messages").update(msg.id, { status: "seen" });
        } catch (error) {
          console.error("Failed to update message status to seen:", error);
        }
      }

      for (const m of uniqueMessages as unknown as MessageRecord[]) {
        if (m.file && !m.fileSize) {
          const h = await fetch(pb.files.getURL(m, m.file), { method: "HEAD" });
          const len = h.headers.get("content-length");
          if (len) m.fileSize = fmtSize(+len);
        }
      }
    } catch (error) {
      console.error("Failed to fetch messages:", error);
    }
  };

  const updateMessageStatus = useCallback(
    async (messageId: string, newStatus: "delivered" | "seen") => {
      const updateKey = `${messageId}-${newStatus}`;
      if (processedStatusUpdates.current.has(updateKey)) {
        return; // Already processed this update
      }

      try {
        await pb.collection("messages").update(messageId, { status: newStatus });
        processedStatusUpdates.current.add(updateKey);

        setMessages((prevMessages) =>
          prevMessages.map((msg) => (msg.id === messageId ? { ...msg, status: newStatus } : msg))
        );
      } catch (error) {
        console.error(`Failed to update message status to ${newStatus}:`, error);
      }
    },
    []
  );

  const updateOnlineStatus = useCallback(async () => {
    if (!user?.id) return;

    try {
      await pb.collection("users").update(user.id, {
        last_seen: new Date().toISOString(),
        is_online: true,
      });

      // When user comes online, mark all sent messages addressed to them as delivered
      const sentMessagesToMe = await pb.collection("messages").getFullList({
        filter: `receiver = "${user.id}" && status = "sent"`,
      });

      // Update all sent messages to delivered
      for (const message of sentMessagesToMe) {
        try {
          await pb.collection("messages").update(message.id, { status: "delivered" });
        } catch (error) {
          console.error(`Failed to mark message ${message.id} as delivered:`, error);
        }
      }
    } catch (error) {
      console.error("Failed to update online status:", error);
    }
  }, [user?.id]);

  // Set user offline
  const setOfflineStatus = useCallback(async () => {
    if (!user?.id) return;

    try {
      await pb.collection("users").update(user.id, {
        is_online: false,
        last_seen: new Date().toISOString(),
      });
       
    } catch (error) {
      console.error("Failed to update offline status:", error);
    }
  }, [user?.id]);

  // Set up online status tracking
  useEffect(() => {
    updateOnlineStatus();

    // Update online status every 30 seconds while component is mounted
    const interval = setInterval(updateOnlineStatus, 15000);

    // Update on window focus
    const handleFocus = () => updateOnlineStatus();
    window.addEventListener("focus", handleFocus);

    // Update on any user activity
    const handleActivity = () => updateOnlineStatus();
    window.addEventListener("mousedown", handleActivity);
    window.addEventListener("keydown", handleActivity);
    window.addEventListener("scroll", handleActivity);

    // Mark as offline when leaving
    const handleBeforeUnload = () => setOfflineStatus();
    window.addEventListener("beforeunload", handleBeforeUnload);

    // Handle page visibility changes
    const handleVisibilityChange = () => {
      if (document.hidden) {
        setOfflineStatus();
      } else {
        updateOnlineStatus();
      }
    };
    document.addEventListener("visibilitychange", handleVisibilityChange);

    return () => {
      clearInterval(interval);
      window.removeEventListener("focus", handleFocus);
      window.removeEventListener("mousedown", handleActivity);
      window.removeEventListener("keydown", handleActivity);
      window.removeEventListener("scroll", handleActivity);
      window.removeEventListener("beforeunload", handleBeforeUnload);
      document.removeEventListener("visibilitychange", handleVisibilityChange);
      setOfflineStatus(); // Mark offline when component unmounts
    };
  }, [updateOnlineStatus, setOfflineStatus]);

  // Subscribe to user online status changes to handle message delivery
  useEffect(() => {
    let unsubscribeUsers: (() => void) | null = null;

    pb.collection("users")
      .subscribe("*", async (e) => {
        // When any user comes online, check if they have sent messages that should be marked as delivered
        if (e.action === "update" && e.record.is_online === true) {
           

          // Find sent messages from this user to current user
          const sentMessages = await pb.collection("messages").getFullList({
            filter: `sender = "${e.record.id}" && receiver = "${user?.id}" && status = "sent"`,
          });

          // Mark these messages as delivered
          for (const message of sentMessages) {
            try {
              await pb.collection("messages").update(message.id, { status: "delivered" });
            } catch (error) {
              console.error(`Failed to mark message as delivered:`, error);
            }
          }
        }
      })
      .then((func) => {
        unsubscribeUsers = func;
      })
      .catch((error) => {
        console.error("Failed to subscribe to users:", error);
      });

    return () => {
      if (unsubscribeUsers) {
        unsubscribeUsers();
      }
    };
  }, [user?.id]);

  useEffect(() => {
    processedStatusUpdates.current.clear();
    setMessages([]);
    fetchMessages();

    const isRelevantMessage = (record: any) => {
      const isBetweenCurrentUsers =
        (record.sender === user?.id && record.receiver === activeUser.id) ||
        (record.sender === activeUser.id && record.receiver === user?.id);

      return isBetweenCurrentUsers;
    };

    let unsubscribe: (() => void) | null = null;
    pb.collection("messages")
      .subscribe("*", async (e) => {
        if (!isRelevantMessage(e.record)) {
          return;
        }

        if (e.action === "create") {
          try {
            const fullMessage = await pb.collection("messages").getOne(e.record.id, {
              expand: "sender,receiver,replyTo,replyTo.sender",
            });

            if (fullMessage.file && !fullMessage.fileSize) {
              try {
                const h = await fetch(pb.files.getURL(fullMessage, fullMessage.file), {
                  method: "HEAD",
                });
                const len = h.headers.get("content-length");
                if (len) fullMessage.fileSize = fmtSize(+len);
              } catch (error) {
                console.error("Failed to get file size:", error);
              }
            }

            setMessages((prevMessages) => {
              const exists = prevMessages.some((msg) => msg.id === fullMessage.id);
              if (exists) {
                return prevMessages;
              }

              const newMessages = [...prevMessages, fullMessage as unknown as MessageRecord];
              return newMessages.sort(
                (a, b) => new Date(a.timestamp).getTime() - new Date(b.timestamp).getTime()
              );
            });
          } catch (error) {
            console.error("Failed to fetch full message:", error);
          }
        } else if (e.action === "update") {
          if (e.record.hiddenFor?.includes(user?.id)) {
            setMessages((prev) => prev.filter((msg) => msg.id !== e.record.id));
            return;
          }

          try {
            const fullMessage = await pb.collection("messages").getOne(e.record.id, {
              expand: "sender,receiver,replyTo,replyTo.sender",
            });

            setMessages((prevMessages) => {
              const exists = prevMessages.some((msg) => msg.id === fullMessage.id);
              if (!exists) {
                return prevMessages;
              }

              return prevMessages.map((msg) =>
                msg.id === fullMessage.id ? (fullMessage as unknown as MessageRecord) : msg
              );
            });
          } catch (error) {
            console.error("Failed to fetch updated message:", error);
          }
        }
      })
      .then((func) => {
        unsubscribe = func;
      })
      .catch((error) => {
        console.error("Failed to subscribe to messages:", error);
      });

    return () => {
      if (unsubscribe) {
        unsubscribe();
      }
    };
  }, [user?.id, activeUser.id, updateMessageStatus]);

  useEffect(() => {
    const observer = new IntersectionObserver(
      (entries) => {
        entries.forEach((entry) => {
          const index = messageRefs.current.indexOf(entry.target as HTMLDivElement);
          if (index !== -1 && entry.isIntersecting && messages[index]) {
            const message = messages[index];

            if (
              message.sender === activeUser.id &&
              message.receiver === user?.id &&
              message.status === "delivered"
            ) {
              updateMessageStatus(message.id, "seen");
            }
          }
        });
      },
      {
        threshold: 0.5,
        rootMargin: "0px 0px -50px 0px",
      }
    );

    // Clean up existing observations
    messageRefs.current.forEach((ref) => {
      if (ref) observer.unobserve(ref);
    });

    // Observe current message refs
    messageRefs.current.forEach((ref) => {
      if (ref) observer.observe(ref);
    });

    return () => {
      messageRefs.current.forEach((ref) => {
        if (ref) observer.unobserve(ref);
      });
    };
  }, [messages, user?.id, activeUser.id, updateMessageStatus]);

  useEffect(() => {
    const loadMessages = async () => {
      setIsLoading(true);
      setQuoted(null);
      try {
        await fetchMessages();

        await new Promise((res) => setTimeout(res, 0));

        endRef.current?.scrollIntoView();
      } finally {
        setIsLoading(false);
      }
    };

    loadMessages();
  }, [activeUser.id, user?.id]);

  useEffect(() => {
    if (messages.length > 0) {
      const lastMsg = messages[messages.length - 1];
      const isMyLastMessage = lastMsg?.sender === user?.id;

      if (isMyLastMessage) {
        endRef.current?.scrollIntoView({ behavior: "smooth" });
      }
    }
  }, [messages.length, user?.id]);

  const parseLinks = (text: string) => {
    const urlRegex = /(https?:\/\/[^\s]+)/g;
    const parts = text.split(urlRegex);

    return parts.map((part, index) => {
      if (urlRegex.test(part)) {
        return (
          <a
            key={index}
            href={part}
            target="_blank"
            rel="noopener noreferrer"
            className="text-blue-400 hover:text-blue-300 underline break-all">
            {part}
          </a>
        );
      }
      return <span key={index}>{part}</span>;
    });
  };

  const getReplyData = (replyingToId: string) => {
    if (!replyingToId) return;
    const quotedMessage = messages.find((msg) => msg.id === replyingToId);
    setQuoted(quotedMessage ? { ...quotedMessage } : null);
    setReplyingTo(replyingToId);
  };

  const scrollToMessage = (id: string) => {
    const idx = messages.findIndex((m) => m.id === id);
    const node = messageRefs.current[idx];
    if (node) {
      node.scrollIntoView({ behavior: "smooth", block: "center" });
    }
  };

  const deleteMessage = async (id: string) => {
    try {
      await pb.collection("messages").delete(id);
      setMessages((prev) => prev.filter((m) => m.id !== id));
      if (replyingTo === id) {
        setQuoted(null);
        setReplyingTo("");
      }
    } catch (e) {
      console.error("Delete failed:", e);
      alert("Could not delete message");
    }
  };

  return (
    <div className="overflow-hidden relative flex flex-col h-full">
      <div className="flex gap-[10px] flex-col *:text-[.8rem] *:font-medium pr-4 py-3 pt-8 h-full overflow-auto">
        {isLoading ? (
          <Loader size="medium" />
        ) : (
          messages.length === 0 && (
            <div className="flex flex-col items-center justify-center h-full">
              Drop a message to begin the conversation
            </div>
          )
        )}
        {messages.map((message, index) => {
          const isMyMessage = message.sender === user?.id;
          const messageDate = new Date(message.timestamp);
          const now = new Date();
          const diffMs = now.getTime() - messageDate.getTime();
          const diffMins = Math.floor(diffMs / (1000 * 60)); // Full minutes only
          const timeAgo =
            diffMins < 60
              ? diffMins === 0
                ? "Just now"
                : `${diffMins} minute${diffMins === 1 ? "" : "s"} ago`
              : messageDate.toLocaleTimeString([], {
                  hour: "2-digit",
                  minute: "2-digit",
                });

          const fileUrl = message.file ? pb.files.getURL(message, message.file) : "";

          const showDateSeparator = shouldShowDateSeparator(
            message,
            index > 0 ? messages[index - 1] : null
          );

          return (
            <React.Fragment key={message.id}>
              {/* Date Separator */}
              {showDateSeparator && (
                <>
                  <div className="flex items-center justify-center my-4">
                    <div className="flex-grow h-px bg-gray-600 opacity-30"></div>
                    <div className="px-4 py-1 mx-4 text-xs text-gray-400 bg-[rgba(17,25,40,0.5)] rounded-full border border-gray-600 border-opacity-30">
                      {getDateLabel(message.timestamp)}
                    </div>
                    <div className="flex-grow h-px bg-gray-600 opacity-30"></div>
                  </div>
                </>
              )}

              {/* Message */}
              <div
                ref={(el) => {
                  messageRefs.current[index] = el;
                }}
                className="flex flex-col">
                {/* Message replying to */}

                {message.expand?.replyTo && (
                  <div
                    className={`flex cursor-pointer flex-col border-[rgba(255,255,255,0.2)] px-3 py-2 my-1 max-w-xs ${
                      isMyMessage ? "justify-end self-end" : "justify-start"
                    }`}
                    onClick={() => scrollToMessage(message.replyTo!)}>
                    {isMyMessage ? (
                      <span
                        className={`text-sm font-light my-2 opacity-70 px-3 ${
                          isMyMessage ? "text-right" : "text-left"
                        }`}>
                        {`You replied to ${
                          message.expand.replyTo.expand?.sender?.username === user?.username
                            ? "Yourself"
                            : message.expand.replyTo.expand?.sender?.username ?? "Unknown"
                        }`}
                      </span>
                    ) : (
                      <span
                        className={`text-sm font-light my-2 opacity-70 px-3 ${
                          isMyMessage ? "text-right" : "text-left"
                        }`}>
                        {`Replied to ${
                          message.expand.replyTo.expand?.sender?.username === user?.username
                            ? "you"
                            : "their own message"
                        }`}
                      </span>
                    )}

                    <div
                      className={`p-3 border-[rgba(255,255,255,0.2)] ${
                        isMyMessage ? "border-r-4 self-end" : "border-l-4"
                      }`}>
                      <span className="bg-[rgba(255,255,255,0.2)] rounded-3xl p-2 line-clamp-2 break-all">
                        {message.expand?.replyTo?.file
                          ? "📎 " + (message.expand?.replyTo?.text || "Attachment")
                          : message.expand?.replyTo?.text}
                      </span>
                    </div>
                  </div>
                )}

                <div
                  className={`flex group items-center  ${
                    isMyMessage ? "justify-end " : `justify-start  ${showProfilePic ? "" : "pl-5"} `
                  }  `}>
                  {!isMyMessage && showProfilePic && (
                    <div className="px-3 self-start">
                      <ChatAvatar avatarUser={activeUser} />
                    </div>
                  )}
                  <div
                    className={`${
                      isMyMessage ? "" : "order-1"
                    } opacity-0 group-hover:opacity-100 items-center justify-center relative *:text-lg *:opacity-70`}>
                    {isMyMessage ? (
                      <div className=" absolute right-0 mx-2 flex bottom-[50%] *:cursor-pointer *:mx-1">
                        <span
                          className="bi bi-reply"
                          onClick={() => {
                            getReplyData(message.id);
                          }}
                          title="Reply"
                          ></span>
                        <span
                          className="bi bi-trash"
                          onClick={() => setDeleteMsgId(message.id)}
                          title="Delete"
                          ></span>
                      </div>
                    ) : (
                      <div className="absolute mx-2 flex flex-row-reverse bottom-[50%] *:cursor-pointer *:mx-1">
                        <span
                          className="bi bi-reply"
                          onClick={() => {
                            getReplyData(message.id);
                          }}
                          title="Reply"
                          
                          ></span>
                      </div>
                    )}
                  </div>
                  <div
                    className={`flex flex-col max-w-[65%] ${
                      isMyMessage ? "items-end" : "items-start"
                    }`}>
                    {message.file ? (
                      <div
                        className={`overflow-hidden ${
                          isMyMessage
                            ? "bg-[#3c73ff] message-bubble-sent"
                            : "bg-[#5a5478] message-bubble-received"
                        }`}>
                        {message.fileType?.startsWith("audio/") ? (
                          <div className="p-3 w-ful">
                            <AudioPlayer url={fileUrl} fileName={message.fileName} />
                            {message.text && (
                              <div className="px-3 py-2 font-normal break-all whitespace-pre-wrap">
                                {message.text}
                              </div>
                            )}
                          </div>
                        ) : message.fileType?.startsWith("image/") ? (
                          <div className="relative">
                            <Image
                              src={fileUrl}
                              alt="attachment"
                              width={500}
                              height={500}
                              onClick={() => setFullImage(message)}
                              className="max-h-[300px] min-h-[200px] w-auto object-cover cursor-pointer"
                            />
                            {message.text && (
                              <div className="px-3 py-2 font-normal break-all whitespace-pre-wrap">
                                {message.text}
                              </div>
                            )}
                          </div>
                        ) : message.fileType?.startsWith("video/") ? (
                          <div className="relative">
                            <div className="max-w-[350px] cursor-pointer relative flex items-center justify-center">
                              <video
                                src={fileUrl}
                                width="100%"
                                height="45px"
                                className="rounded-md"></video>
                              <div className="absolute z-40  bg-[#5122fe] w-[3rem] h-[3rem] rounded-full text-center">
                                <div
                                  className="bi bi-play-fill text-[3rem] size-full p-2 flex items-center justify-center"
                                  onClick={() => setFullVideo(message)}></div>
                              </div>
                              <div
                                className="absolute bg-[rgba(81,130,254,.4)] bg-opacity30 z-20 top-0 lrft-0 h-full w-full"
                                onClick={() => setFullVideo(message)}></div>
                            </div>
                            {message.text && (
                              <div className="px-3 py-2 font-normal break-all whitespace-pre-wrap">
                                {message.text}
                              </div>
                            )}
                          </div>
                        ) : (
                          <div className="p-3 w-full">
                            <div className="bg-black bg-opacity-40 backdrop-blur-md rounded-lg p-2">
                              <div className="flex items-center gap-3">
                                {message.fileType?.includes("doc") ? (
                                  <div className="bi bi-file-earmark-word text-2xl" />
                                ) : message.fileType?.includes("pdf") ? (
                                  <div className="bi bi-file-earmark-pdf text-2xl" />
                                ) : message.fileType?.includes("xls") ||
                                  message.fileType?.includes("spreadsheet") ? (
                                  <div className="bi bi-file-earmark-excel text-2xl" />
                                ) : message.fileType?.includes("ppt") ? (
                                  <div className="bi bi-file-earmark-ppt text-2xl" />
                                ) : (
                                  <div className="bi bi-file-earmark text-2xl" />
                                )}
                                <div className="flex flex-col">
                                  <p className="text-sm font-medium">{message.fileName}</p>
                                  <p className="text-xs opacity-80">{message.fileSize}</p>
                                </div>
                                <button
                                  onClick={() =>
                                    handleDownloadFile(fileUrl, message.fileName || "document")
                                  }
                                  className="hover:opacity-80 transition"
                                  title="Download">
                                  <span className="bi bi-download"></span>
                                </button>
                              </div>
                            </div>
                            {message.text && (
                              <div className="px-3 py-2 font-normal break-all whitespace-pre-wrap">
                                {message.text}
                              </div>
                            )}
                          </div>
                        )}
                      </div>
                    ) : (
                      <div
                        className={`${
                          isMyMessage
                            ? "bg-[#3c73ff] message-bubble-sent"
                            : "bg-[#5a5478] message-bubble-received"
                        } px-3 py-2 font-normal text-[.9rem] break-all whitespace-pre-wrap min-w-[100px]`}>
                        {parseLinks(message.text || "")}
                      </div>
                    )}
                    <span className="text-[.75rem] mt-1 opacity-70">
                      {timeAgo} {isMyMessage && <span> - {message.status}</span>}
                    </span>
                  </div>
                </div>
              </div>
            </React.Fragment>
          );
        })}

        <div ref={endRef} />
        {fullImage && (
          <div
            className="fixed top-0 left-0 w-full h-full bg-black bg-opacity-80 flex items-center justify-center z-50"
            onClick={() => setFullImage(null)}>
            <img
              src={pb.files.getURL(fullImage, fullImage?.file || "")}
              alt="Full View"
              className="max-w-[90%] max-h-[90%] rounded-lg"
            />
            <span
              className=" bi bi-download cursor-pointer absolute top-8 right-2 text-[2rem] z-40"
              onClick={() =>
                handleDownloadFile(
                  pb.files.getURL(fullImage, fullImage?.file || ""),
                  fullVideo?.fileName || ""
                )
              }
              title="Download"
              ></span>
          </div>
        )}
        {fullVideo && (
          <div className="fixed top-0 left-0 w-full h-full bg-black flex flex-col-reverse justify-center z-50">
            <video
              src={pb.files.getURL(fullVideo, fullVideo?.file || "")}
              controls
              className="h-[90%] w-auto"></video>
            <span
              className=" bi bi-download cursor-pointer absolute top-8 right-2 text-[2rem]"
              onClick={() =>
                handleDownloadFile(
                  pb.files.getURL(fullVideo, fullVideo?.file || ""),
                  fullVideo?.fileName || ""
                )
              }></span>
            <span
              className=" bi bi-arrow-left-short cursor-pointer absolute top-2 left-2 text-[4rem]"
              onClick={() => setFullVideo(null)}></span>
          </div>
        )}
        {deleteMsgId && (
          <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center text-center justify-center z-50">
            <div className="bg-white rounded-lg p-6 w-80 text-black">
              <h2 className="text-lg font-semibold mb-4">Delete Message?</h2>
              <p className="mb-4">
                Are you sure you want to delete this message? This action cannot be undone.
              </p>
              <div className="flex flex-col gap-2 justify-center">
                <button
                  className="px-4 py-2 bg-red-500 text-white rounded-md mr-2"
                  onClick={() => {
                    if (deleteMsgId) {
                      deleteMessage(deleteMsgId);
                      setDeleteMsgId(null);
                    }
                  }}>
                  Delete
                </button>
                <button
                  className="px-4 py-2 bg-gray-300 text-gray-800 rounded-md"
                  onClick={() => setDeleteMsgId("")}>
                  Cancel
                </button>
              </div>
            </div>
          </div>
        )}
      </div>
      {replyingTo && quoted && (
        <div className="px-3 py-2 border-t border-[rgba(255,255,255,0.3)] flex justify-between rounded-t-3xl w-full ">
          <div className="flex flex-col gap-1  ">
            <span className="text-lg font-light max-w-[300px] truncate ">
              Replying to{" "}
              <b>{quoted.sender === user!.id ? "yourself" : quoted.expand?.sender.username}</b>
            </span>
            <span className="text-sm opacity-70 ml-4 px-2 border-l-2 border-[rgba(255,255,255,0.3)] max-w-[600px] truncate">
              {quoted.file ? (quoted.text ? "📎" + quoted.text : "📎Attachment") : quoted.text}
            </span>
          </div>
          <span
            className="bi bi-x text-2xl cursor-pointer"
            onClick={() => {
              setReplyingTo("");
              setQuoted(null);
            }}
          />
        </div>
      )}
    </div>
  );
}

export default Message;
