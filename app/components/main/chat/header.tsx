import React, { useEffect, useState } from "react";
import UserAvatar from "../../Avatars/userAvatar";
import pb from "@/lib/pocketbase";
import { useAuth } from "@/lib/useAuth";

type HeaderProps = {
  setInfo: React.Dispatch<React.SetStateAction<boolean>>;
  activeUser: {
    created: string | undefined;
    id: string;
    username: string;
    avatar?: string;
    is_online: boolean;
    last_seen?: string;
    about?: string;
  };
};
function Header({ setInfo, activeUser }: HeaderProps) {
  const [isTyping, setIsTyping] = useState(false);
  const { user } = useAuth();
  const [blocked, setBlocked] = useState(false);

  const lastSeen = () => {
    if (activeUser.is_online) {
      return "Online";
    } else {
      const raw = activeUser.last_seen || activeUser.created;
      if (!raw || typeof raw !== "string") return "Unknown";

      const isoString = raw.replace(" ", "T").replace(" UTC", "Z");
      const messageDate = new Date(isoString);
      const now = new Date();

      if (Number.isNaN(messageDate.getTime())) return "Invalid date";

      const diffMs = now.getTime() - messageDate.getTime();
      const diffDays = diffMs / (1000 * 60 * 60 * 24);

      const timeStr = messageDate.toLocaleTimeString([], {
        hour: "2-digit",
        minute: "2-digit",
      });

      if (
        messageDate.getFullYear() === now.getFullYear() &&
        messageDate.getMonth() === now.getMonth() &&
        messageDate.getDate() === now.getDate()
      ) {
        return `Today at ${timeStr}`;
      } else if (diffDays < 2 && now.getDate() - messageDate.getDate() === 1) {
        return `Yesterday at ${timeStr}`;
      } else if (diffDays < 7) {
        const weekday = messageDate.toLocaleDateString(undefined, {
          weekday: "long",
        });
        return `${weekday} at ${timeStr}`;
      } else {
        return `${messageDate.toLocaleDateString("en-GB")} at ${timeStr}`;
      }
    }
  };
  useEffect(() => {
    if (!activeUser?.id) return;

    let unsubscribe: (() => void) | null = null;

    const getCurrentUserId = () => {
      try {
        const authData = localStorage.getItem("pocketbase_auth");
        if (authData) {
          const parsed = JSON.parse(authData);
          return parsed?.record?.id || parsed?.model?.id;
        }
      } catch (e) {
        console.error("Failed to get current user ID:", e);
      }
      return null;
    };

    const currentUserId = getCurrentUserId();

    // Subscribe to the specific user's changes in the users collection
    pb.collection("users")
      .subscribe(activeUser.id, (e) => {
        // Only show typing if they're typing AND typing to the current user
        if (e.record.isTyping !== undefined) {
          const isTypingToMe = e.record.isTyping && e.record.typingTo === currentUserId;
          setIsTyping(isTypingToMe);
        }
      })
      .then((unsub) => {
        unsubscribe = unsub;
      })
      .catch((error) => {
        console.error("Failed to subscribe to user typing status:", error);
      });

    // Fetch initial typing status from the user record
    pb.collection("users")
      .getOne(activeUser.id)
      .then((record) => {
        const isTypingToMe = record.isTyping && record.typingTo === currentUserId;
        setIsTyping(isTypingToMe || false);
      })
      .catch(() => {
        setIsTyping(false);
      });

    return () => {
      if (unsubscribe) {
        unsubscribe();
      }
      setIsTyping(false);
    };
  }, [activeUser?.id]);

  const checkIfBlocked = async () => {
    if (!user?.id || !activeUser?.id) return;

    try {
      await pb
        .collection("blocks")
        .getFirstListItem(
          `(blocker = "${user.id}" && blocked = "${activeUser.id}") || (blocker = "${activeUser.id}" && blocked = "${user.id}")`
        );
      setBlocked(true);
    } catch (error) {
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

  return (
    <div className="flex justify-between items-center py-4 px-3 border-b-[1px] border-[rgba(255,255,255,0.3)] dark:border-[rgba(81,130,254,0.3)]">
      <div className="flex items-center gap-6">
        <div className="">
          <UserAvatar avatarUser={activeUser} />
        </div>
        <div className="flex flex-col">
          <span className="font-bold">{activeUser.username}</span>
          {!blocked && (
            <span className="font-extralight opacity-60 text-[.8rem]">
              {isTyping ? (
                <span className="animate-pulse">typing...</span>
              ) : activeUser.is_online ? (
                "Online"
              ) : (
                "last seen " + lastSeen()
              )}
            </span>
          )}
        </div>
      </div>
      <div className="flex gap-9 *:hover:cursor-pointer">
        <div
          className="bi bi-info-circle text-[1.6rem]"
          onClick={() => setInfo((prev) => !prev)}></div>
      </div>
    </div>
  );
}

export default Header;
