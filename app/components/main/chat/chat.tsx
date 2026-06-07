"use client";
import React, { useEffect, useRef, useState } from "react";
import Header from "./header";
import Image from "next/image";
import Message from "./message";
import EmojiPicker, { EmojiStyle } from "emoji-picker-react";
import RecordingWaves from "../../recordingWaves/recordingWaves";
import { useAuth } from "@/lib/useAuth";
import pb from "@/lib/pocketbase";
import { useSound } from "../../useSound/useSound";

type Props = {
  setInfo: React.Dispatch<React.SetStateAction<boolean>>;
  activeUser: any;
};

function Chat({ setInfo, activeUser }: Props) {
  const { user } = useAuth();
  const [message, setMessage] = useState("");
  const photoInputRef = useRef<HTMLInputElement>(null);
  const videoInputRef = useRef<HTMLInputElement>(null);
  const musicInputRef = useRef<HTMLInputElement>(null);
  const documentInputRef = useRef<HTMLInputElement>(null);
  const [showEmoji, setShowEmoji] = useState(false);
  const emojiPickerRef = useRef<HTMLDivElement>(null);
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const [showFile, setShowFile] = useState(false);
  const [fileURL, setFileURL] = useState("");
  const [fileName, setFileName] = useState<string>("");
  const [fileType, setFileType] = useState<string>("");
  const videoRef = useRef<HTMLVideoElement | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [streaming, setStreaming] = useState(false);
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const [capturedImage, setCapturedImage] = useState<string | null>(null);
  const [isRecording, setIsRecording] = useState(false);
  const [audioURL, setAudioURL] = useState<string | null>(null);
  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const audioChunksRef = useRef<Blob[]>([]);
  const [isPaused, setIsPaused] = useState(false);
  const [attach, setAttach] = useState(false);
  const [replyingTo, setReplyingTo] = useState<string | null>(null);
  const typingTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  const isTypingRef = useRef(false);
  const [isChatVisible, setIsChatVisible] = useState(true);
  const unsubscribeRef = useRef<(() => void) | null>(null);
  const [blocked, setBlocked] = useState<false | "you" | "them" | "both">(false);

  const playSound = useSound("/send.wav", 1, "send_sound");
  const markMessagesAsSeen = async () => {
    if (!user?.id || !activeUser?.id) return;

    try {
      const unseenMessages = await pb.collection("messages").getList(1, 50, {
        filter: `sender = "${activeUser.id}" && receiver = "${user.id}" && status != "seen"`,
        sort: "-created",
      });

      const updatePromises = unseenMessages.items.map((msg) =>
        pb.collection("messages").update(msg.id, { status: "seen" })
      );

      if (updatePromises.length > 0) {
        await Promise.all(updatePromises);
        console.log(`Marked ${updatePromises.length} messages as seen`);
      }
    } catch (error) {
      console.error("Error marking messages as seen:", error);
    }
  };
  const checkIfBlocked = async () => {
    if (!user?.id || !activeUser?.id) return;

    try {
      // Check if I blocked them
      const iBlockedThem = await pb
        .collection("blocks")
        .getFirstListItem(`blocker = "${user.id}" && blocked = "${activeUser.id}"`)
        .catch(() => null);

      // Check if they blocked me
      const theyBlockedMe = await pb
        .collection("blocks")
        .getFirstListItem(`blocker = "${activeUser.id}" && blocked = "${user.id}"`)
        .catch(() => null);

      if (iBlockedThem && theyBlockedMe) {
        setBlocked("both");
      } else if (iBlockedThem) {
        setBlocked("you");
      } else if (theyBlockedMe) {
        setBlocked("them");
      } else {
        setBlocked(false);
      }
    } catch (error) {
      console.error("Error checking block status:", error);
      setBlocked(false);
    }
  };

  useEffect(() => {
    checkIfBlocked();

    let unsubscribeBlocks: (() => void) | undefined;

    const subscribeToBlocks = async () => {
      try {
        unsubscribeBlocks = await pb.collection("blocks").subscribe("*", (e) => {
          const blockRecord = e.record;

          const isRelevant =
            (blockRecord.blocker === user?.id && blockRecord.blocked === activeUser?.id) ||
            (blockRecord.blocker === activeUser?.id && blockRecord.blocked === user?.id);

          if (isRelevant) {
            checkIfBlocked();
          }
        });
      } catch (error) {
        console.error("Failed to subscribe to blocks:", error);
      }
    };

    subscribeToBlocks();

    return () => {
      if (unsubscribeBlocks) {
        unsubscribeBlocks();
      }
    };
  }, [activeUser?.id, user?.id]);
  useEffect(() => {
    const handleVisibilityChange = () => {
      setIsChatVisible(!document.hidden);

      if (!document.hidden) {
        markMessagesAsSeen();
      }
    };

    document.addEventListener("visibilitychange", handleVisibilityChange);
    return () => {
      document.removeEventListener("visibilitychange", handleVisibilityChange);
    };
  }, [user?.id, activeUser?.id]);

  useEffect(() => {
    if (!user?.id || !activeUser?.id) return;

    if (unsubscribeRef.current) {
      unsubscribeRef.current();
    }

    const setupSubscription = async () => {
      try {
        const unsubscribe = await pb.collection("messages").subscribe("*", async (e) => {
          if (e.action === "create") {
            const newMessage = e.record;

            if (newMessage.sender === activeUser.id && newMessage.receiver === user.id) {
              if (isChatVisible && !document.hidden) {
                try {
                  await pb.collection("messages").update(newMessage.id, { status: "seen" });
                } catch (error) {
                  console.error("Error marking new message as seen:", error);
                }
              }
            }
          }

          if (e.action === "update") {
            console.log("Message updated:", e.record.id);
          }
        });

        unsubscribeRef.current = unsubscribe;

        await markMessagesAsSeen();
      } catch (error) {
        console.error("Error setting up real-time subscription:", error);
      }
    };

    setupSubscription();

    return () => {
      if (unsubscribeRef.current) {
        unsubscribeRef.current();
      }
    };
  }, [user?.id, activeUser?.id, isChatVisible]);

  useEffect(() => {
    markMessagesAsSeen();
    setMessage("");
  }, [activeUser.id]);

  useEffect(() => {
    const observer = new IntersectionObserver(
      (entries) => {
        entries.forEach((entry) => {
          if (entry.isIntersecting) {
            markMessagesAsSeen();
          }
        });
      },
      { threshold: 0.1 }
    );

    const messagesContainer = document.querySelector(".messages-container");
    if (messagesContainer) {
      observer.observe(messagesContainer);
    }

    return () => {
      observer.disconnect();
    };
  }, [activeUser?.id, user?.id]);

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent): void => {
      if (emojiPickerRef.current && !emojiPickerRef.current.contains(event.target as Node)) {
        setShowEmoji(false);
      }
    };

    document.addEventListener("mousedown", handleClickOutside);
    return () => {
      document.removeEventListener("mousedown", handleClickOutside);
    };
  }, []);
  const updateTypingStatus = async (isTyping: boolean) => {
    if (!user?.id || !activeUser?.id) return;

    try {
      await pb.collection("users").update(user.id, {
        isTyping: isTyping,
        typingTo: isTyping ? activeUser.id : null,
      });
    } catch (error) {
      console.error("Failed to update typing status:", error);
    }
  };
  useEffect(() => {
    return () => {
      if (isTypingRef.current) {
        updateTypingStatus(false);
      }
      if (typingTimeoutRef.current) {
        clearTimeout(typingTimeoutRef.current);
      }
    };
  }, [activeUser?.id]);
  const handleChange = (e: React.ChangeEvent<HTMLTextAreaElement>) => {
    const value = e.target.value;
    setMessage(value);

    if (!isTypingRef.current && value.length > 0) {
      isTypingRef.current = true;
      updateTypingStatus(true);
    }

    if (typingTimeoutRef.current) {
      clearTimeout(typingTimeoutRef.current);
    }

    if (value.length > 0) {
      typingTimeoutRef.current = setTimeout(() => {
        isTypingRef.current = false;
        updateTypingStatus(false);
      }, 2000);
    } else {
      isTypingRef.current = false;
      updateTypingStatus(false);
    }
  };

  const handleSend = async () => {
    try {
      if (!user?.id) {
        console.error("No authenticated user found");
        return;
      }

      if (isTypingRef.current) {
        isTypingRef.current = false;
        await updateTypingStatus(false);
      }
      if (typingTimeoutRef.current) {
        clearTimeout(typingTimeoutRef.current);
      }

      const timestamp = new Date().toISOString();

      if (showFile) {
        try {
          const response = await fetch(fileURL);
          const blob = await response.blob();
          const file = new File([blob], fileName, { type: fileType });

          const formData = new FormData();
          formData.append("text", message);
          formData.append("receiver", activeUser.id);
          formData.append("sender", user.id);
          formData.append("timestamp", timestamp);
          formData.append("status", "sent");
          formData.append("file", file);
          formData.append("fileType", file.type);
          formData.append("fileName", file.name);
          formData.append("replyTo", replyingTo || "");

          const record = await pb
            .collection("messages")
            .create(formData, { expand: "replyTo.sender" });
          console.log("Message sent with ID:", record.id);

          setMessage("");
          setShowFile(false);
          setFileURL("");
          setAudioURL(null);

          if (textareaRef.current) {
            textareaRef.current.style.height = "auto";
          }

          await verifyTypingStatusCleared();
        } catch (err: any) {
          const msg = err.response?.data?.message || err.message || "Upload failed";
          console.error(msg, err);
          alert(msg);
        }
        return;
      }

      if (!message.trim()) return;

      try {
        const record = await pb.collection("messages").create(
          {
            text: message,
            receiver: activeUser.id,
            sender: user.id,
            timestamp: timestamp,
            status: "sent",
            file: null,
            fileType: null,
            fileName: null,
            replyTo: replyingTo || null,
          },
          { expand: "replyTo.sender" }
        );

        playSound();
        setMessage("");
        setShowFile(false);
        setReplyingTo(null);

        if (textareaRef.current) {
          textareaRef.current.style.height = "auto";
        }

        await verifyTypingStatusCleared();
      } catch (error) {
        console.error("Error creating text message:", error);
        alert("Failed to send message. Please try again.");
      }
    } catch (error) {
      console.error("Error in handleSend:", error);
    }
  };

  const verifyTypingStatusCleared = async () => {
    try {
      const userRecord = await pb.collection("users").getOne(user!.id);

      if (userRecord.isTyping === true && userRecord.typingTo === activeUser.id) {
        console.log("Typing status not cleared, forcing update...");
        await pb.collection("users").update(user!.id, {
          isTyping: false,
          typingTo: null,
        });
      }
    } catch (error) {
      console.error("Failed to verify typing status:", error);
    }
  };
  const autoResize = (e: React.ChangeEvent<HTMLTextAreaElement>) => {
    const textarea = e.target;
    textarea.style.height = "auto";

    if (!textarea.value) {
      textarea.style.height = "auto";
      return;
    }

    textarea.style.height = `${Math.min(textarea.scrollHeight, 150)}px`;
  };

  const startCamera = async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ video: true });
      if (videoRef.current) {
        videoRef.current.srcObject = stream;
        setStreaming(true);
      }
    } catch (err) {
      setError("Camera access denied or not available.");
      setStreaming(false);
      alert("Unable to access camera. Please check permissions.");
      console.error("Error accessing the camera: ", err);
    }
  };

  const stopCamera = () => {
    const video = videoRef.current;
    if (video && video.srcObject) {
      const stream = video.srcObject as MediaStream;
      stream.getTracks().forEach((track) => track.stop());
      video.srcObject = null;
    }
    setStreaming(false);
  };

  const captureImage = () => {
    const video = videoRef.current;
    const canvas = canvasRef.current;

    if (!video || !canvas) {
      console.error("Video or canvas element not available");
      return;
    }

    if (!video.videoWidth || !video.videoHeight) {
      alert("Camera is not ready yet. Please wait a moment and try again.");
      return;
    }

    canvas.width = video.videoWidth;
    canvas.height = video.videoHeight;
    const ctx = canvas.getContext("2d");

    if (!ctx) {
      console.error("Could not get canvas context");
      return;
    }

    ctx.drawImage(video, 0, 0, canvas.width, canvas.height);

    canvas.toBlob((blob) => {
      if (!blob) {
        console.error("Failed to create image blob");
        alert("Failed to capture image. Please try again.");
        return;
      }

      const image = URL.createObjectURL(blob);
      const timestamp = new Date().getTime();
      const fileName = `camera-${timestamp}.png`;

      setShowFile(true);
      setFileURL(image);
      setFileName(fileName);
      setFileType("image/png");
    }, "image/png");
  };

  const startRecording = async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      const mediaRecorder = new MediaRecorder(stream);
      mediaRecorderRef.current = mediaRecorder;
      audioChunksRef.current = [];

      mediaRecorder.ondataavailable = (event) => {
        if (event.data.size > 0) {
          audioChunksRef.current.push(event.data);
        }
      };

      mediaRecorder.onstop = () => {
        const audioBlob = new Blob(audioChunksRef.current, { type: "audio/mp3" });
        const audioUrl = URL.createObjectURL(audioBlob);
        const timestamp = new Date().getTime();
        const recordingFileName = `voice-note-${timestamp}.mp3`;

        setAudioURL(audioUrl);
        setShowFile(true);
        setFileURL(audioUrl);
        setFileName(recordingFileName);
        setFileType("audio/mp3");
      };

      mediaRecorder.start();
      setIsRecording(true);
    } catch (err) {
      console.error("Error accessing microphone:", err);
      setError("Microphone access denied or not available.");
    }
  };

  const stopRecording = () => {
    if (mediaRecorderRef.current && isRecording) {
      mediaRecorderRef.current.stop();
      mediaRecorderRef.current.stream.getTracks().forEach((track) => track.stop());
      setIsRecording(false);
    }
  };

  const handlePauseResume = () => {
    if (mediaRecorderRef.current && isRecording) {
      if (isPaused) {
        mediaRecorderRef.current.resume();
      } else {
        mediaRecorderRef.current.pause();
      }
      setIsPaused(!isPaused);
    }
  };

  useEffect(() => {
    if (streaming) {
      startCamera();
      setAttach(false);
    } else {
      stopCamera();
    }
  }, [streaming]);

  const handlePhotoClick = () => {
    if (photoInputRef.current) {
      photoInputRef.current.click();
      setAttach(false);
    }
  };

  const handleVideoClick = () => {
    if (videoInputRef.current) {
      videoInputRef.current.click();
      setAttach(false);
    }
  };

  const handleMusicClick = () => {
    if (musicInputRef.current) {
      musicInputRef.current.click();
      setAttach(false);
    }
  };

  const handleDocumentClick = () => {
    if (documentInputRef.current) {
      documentInputRef.current.click();
      setAttach(false);
    }
  };

  const MAX_FILE_SIZE = 100 * 1024 * 1024;
  const MAX_PASTE_SIZE = 10 * 1024 * 1024;
  const MAX_TEXT_LENGTH = 10000;

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      if (file.size > MAX_FILE_SIZE) {
        alert("File is too large. Maximum size is 100MB");
        e.target.value = "";
        return;
      }
      const fileUrl = URL.createObjectURL(file);
      setShowFile(true);
      setFileURL(fileUrl);
      setFileName(file.name);
      setFileType(file.type);
      e.target.value = "";
    }
  };

  const handlePaste = (e: React.ClipboardEvent<HTMLTextAreaElement>) => {
    const items = e.clipboardData?.items;
    const pastedText = e.clipboardData?.getData("text");

    if (pastedText && pastedText.length > MAX_TEXT_LENGTH) {
      e.preventDefault();
      alert(
        "Sorry, pasted text is too large"
      );
      return;
    }

    if (!items) return;

    for (let i = 0; i < items.length; i++) {
      const item = items[i];

      if (item.type.startsWith("image/")) {
        e.preventDefault();

        const blob = item.getAsFile();
        if (!blob) continue;

        if (blob.size > MAX_PASTE_SIZE) {
          alert(`Pasted image is too large. Maximum size is ${MAX_PASTE_SIZE / (1024 * 1024)}MB`);
          return;
        }

        const fileUrl = URL.createObjectURL(blob);
        const timestamp = new Date().getTime();
        const fileName = `pasted-image-${timestamp}.png`;

        setShowFile(true);
        setFileURL(fileUrl);
        setFileName(fileName);
        setFileType(blob.type);

        break;
      }
    }
  };
  const wallpaperUrl = user?.wallpaper ? pb.files.getURL(user, user.wallpaper) : null;

  return (
    <section
      className="flex-[2] border-[rgba(255,255,255,0.3)] border-r-[1px] flex flex-col"
      style={{
        backgroundImage: wallpaperUrl ? `url(${wallpaperUrl})` : "none",
        backgroundSize: "cover",
        backgroundPosition: "center",
        backgroundRepeat: "no-repeat",
      }}>
      <div
        className={`bg-opacity-50 ${
          wallpaperUrl ? "bg-[rgba(17,25,40,0.55)] backdrop-blur-[9px] saturate-[180%]" : ""
        }`}>
        <Header setInfo={setInfo} activeUser={activeUser} />
      </div>

      <div className="flex-1 overflow-auto messages-container">
        <Message
          activeUser={activeUser}
          replyingTo={replyingTo || ""}
          setReplyingTo={setReplyingTo}
        />
      </div>

      <div className="flex flex-col items-center gap-4">
        {streaming && (
          <div className="flex flex-col absolute left-0 size-full bottom-0 justify-center items-center bg-[rgba(17,25,40,0.75)] backdrop-blur-[19px] saturate-[180%] z-10">
            <div
              className="bi bi-x text-[3rem] cursor-pointer hover:text-[#5183fe]"
              onClick={streaming ? stopCamera : startCamera}
            />
            <video
              ref={videoRef}
              muted
              autoPlay
              playsInline
              className="rounded border-2 h-auto object-contain w-[50%]"
            />
            <div className="">
              <div
                className="bi bi-camera text-[3rem] cursor-pointer p-4 bg-[#5183fe] rounded-full w-[5rem] h-[5rem] flex justify-center items-center"
                onClick={() => {
                  captureImage();
                  streaming ? stopCamera() : startCamera();
                }}
              />
            </div>
          </div>
        )}
      </div>
      <div className="py-2">
        {blocked &&
          (blocked === "you" ? (
            <p className="text-center text-red-500">You have blocked this user.</p>
          ) : blocked === "them" ? (
            <p className="text-center text-red-500">You are blocked by this user.</p>
          ) : blocked === "both" ? (
            <p className="text-center text-red-500">You and this user have blocked each other.</p>
          ) : null)}
      </div>

      <div
        className={` ${
          blocked ? "hidden" : ""
        } relative flex items-end py-1 border-t-[1px] border-[rgba(255,255,255,0.3)]`}>
        <div className="flex px-5 gap-4 *:hover:cursor-pointer my-5 justify-center items-center relative">
          <div
            className={`${isRecording || showFile ? "hidden" : ""} bi bi-paperclip`}
            onClick={() => setAttach((prev) => !prev)}></div>
          <div className="">
            {attach && (
              <div className="absolute left-0 bottom-10 bg-[rgba(17,25,40,0.9)] backdrop-blur-[9px] saturate-[180%] rounded-lg *:px-2 *:py-1 *:flex *:gap-3 flex flex-col border-[.5px] border-[rgba(255,255,255,0.2)]">
                <div className="hover:bg-[rgba(255,255,255,0.1)]" onClick={handlePhotoClick}>
                  <div className=" bi bi-card-image"></div>
                  <p>Photo</p>
                </div>

                <div className="hover:bg-[rgba(255,255,255,0.1)]" onClick={handleVideoClick}>
                  <div className=" bi bi-camera-video"></div>
                  <p>Video</p>
                </div>

                <div className="hover:bg-[rgba(255,255,255,0.1)]" onClick={handleMusicClick}>
                  <div className=" bi bi-headphones"></div>
                  <p>Audio</p>
                </div>

                <div
                  className={`${isRecording ? "hidden" : ""} hover:bg-[rgba(255,255,255,0.1)]`}
                  onClick={handleDocumentClick}>
                  <div className="bi bi-file-earmark"></div>
                  <p>Document</p>
                </div>

                <div
                  className="hover:bg-[rgba(255,255,255,0.1)]"
                  onClick={() => setStreaming((prev) => !prev)}>
                  <div className="bi bi-camera"></div>
                  <p>Camera</p>
                </div>
              </div>
            )}
          </div>
          <input
            type="file"
            accept="image/*"
            ref={photoInputRef}
            onChange={handleFileChange}
            className="hidden"
          />
          <input
            type="file"
            accept="video/*"
            ref={videoInputRef}
            onChange={handleFileChange}
            className="hidden"
          />
          <input
            type="file"
            accept="audio/*"
            ref={musicInputRef}
            onChange={handleFileChange}
            className="hidden"
          />
          <input
            type="file"
            ref={documentInputRef}
            onChange={handleFileChange}
            className="hidden"
          />

          <div className="flex items-center gap-2">
            <div
              className={`${showFile ? "hidden" : ""} bi bi-mic-fill ${
                isRecording ? "text-[#5183fe]" : ""
              } cursor-pointer`}
              onClick={() => {
                if (isRecording) {
                  stopRecording();
                  setIsPaused(false);
                } else {
                  startRecording();
                }
              }}
            />
            {isRecording && (
              <RecordingWaves
                isRecording={isRecording}
                isPaused={isPaused}
                onPauseResume={handlePauseResume}
              />
            )}
          </div>
        </div>
        <div className="flex-1">
          {showFile && (
            <div className="relative w-[55%] max-h-[350px] overflow-hidden rounded-lg mb-6">
              <div
                className="absolute bg-[rgba(17,25,40,0.66)] top-2 right-2 bi bi-x text-[1.5rem] cursor-pointer z-10"
                onClick={() => {
                  setShowFile(false);
                  setFileURL("");
                  setAudioURL(null);
                  setFileName("");
                  setFileType("");
                }}
              />
              <div className="relative h-full w-full">
                {audioURL ? (
                  <div className="bg-[rgba(81,130,254,0.36)] p-4 rounded-lg">
                    <audio controls className="w-full">
                      <source src={audioURL} type="audio/mp3" />
                      Your browser does not support the audio element.
                    </audio>
                    <p className="text-sm mt-2 opacity-75">{fileName}</p>
                  </div>
                ) : fileType.startsWith("image/") ? (
                  <div className="relative">
                    <Image
                      src={fileURL}
                      alt={fileName}
                      width={500}
                      height={500}
                      className="w-full h-full object-contain"
                      style={{ maxHeight: "350px" }}
                    />
                    <p className="text-sm mt-2 opacity-75">{fileName}</p>
                  </div>
                ) : fileType.startsWith("video/") ? (
                  <div className="relative">
                    <video
                      controls
                      className="w-full h-full object-contain"
                      style={{ maxHeight: "350px" }}>
                      <source src={fileURL} type={fileType} />
                      Your browser does not support the video element.
                    </video>
                    <p className="text-sm mt-2 opacity-75">{fileName}</p>
                  </div>
                ) : fileType.startsWith("audio/") ? (
                  <div className="bg-[rgba(81,130,254,0.36)] p-4 rounded-lg">
                    <audio controls className="w-full">
                      <source src={fileURL} type={fileType} />
                      Your browser does not support the audio element.
                    </audio>
                    <p className="text-sm mt-2 opacity-75">{fileName}</p>
                  </div>
                ) : (
                  <div className="bg-[rgba(81,130,254,0.36)] p-4 rounded-lg flex items-center gap-3">
                    <div className="bi bi-file-earmark-text text-3xl" />
                    <div className="flex flex-col">
                      <p className="text-sm font-medium">{fileName}</p>
                    </div>
                  </div>
                )}
              </div>
            </div>
          )}
          <textarea
            ref={textareaRef}
            onChange={(e) => {
              handleChange(e);
              autoResize(e);
            }}
            onPaste={handlePaste}
            className={`${
              isRecording ? "hidden" : ""
            } box-border outline-none bg-[rgba(17,25,40,0.66)] py-3 rounded-lg flex-1 px-4 max-h-[150px] overflow-y-auto resize-none text-sm transition-height duration-200 border-[2px] border-[rgba(255,255,255,0.1)] w-full`}
            rows={1}
            onKeyDown={(e) => {
              if (e.key === "Eevnter" && !e.shiftKey) {
                e.preventDefault();
                handleSend();
              }
            }}
          
            placeholder="Type a message..."
            value={message}
          />
        </div>

        <div className="flex px-5 gap-4 items-center my-3">
          <div
            className={`${
              isRecording ? "hidden" : ""
            } bi bi-emoji-wink-fill text-xl hover:cursor-pointer`}
            onClick={() => setShowEmoji((prev) => !prev)}
          />
          {showEmoji && (
            <div ref={emojiPickerRef} className="absolute bottom-20 right-10 z-50">
              <EmojiPicker
                onEmojiClick={(e) => setMessage((prev) => prev + e.emoji)}
                emojiStyle={EmojiStyle.APPLE}
              />
            </div>
          )}
          {!message.trim() && !showFile ? (
            <div className="bi bi-send-x-fill bg-[#5183fe] text-lg px-[15px] font-semibold py-[7px] rounded-md text-center" />
          ) : (
            <div
              className="bi bi-send-fill bg-[#5183fe] text-lg px-[15px] font-semibold py-[7px] rounded-md text-center cursor-pointer"
              onClick={handleSend}
            />
          )}
          <canvas ref={canvasRef} style={{ display: "none" }} />
        </div>
      </div>
    </section>
  );
}

export default Chat;
