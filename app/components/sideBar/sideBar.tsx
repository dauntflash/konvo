"use client";

import pb from "@/lib/pocketbase";
import { useAuth } from "@/lib/useAuth";
import { usePathname, useRouter } from "next/navigation";
import React, { useEffect, useState } from "react";
import Loader from "../loader/loader";

type UnreadMessage = {
  id: string;
  sender: string;
  receiver: string;
  text?: string;
  file?: string;
  timestamp: string;
  status: "sent" | "delivered" | "seen";
};

function SideBar() {
  const [unreadMessages, setUnreadMessages] = useState<UnreadMessage[]>([]);
  const [unreadNotifications, setUnreadNotifications] = useState<number>(0);
  const { user, isAuthenticated } = useAuth();
  const pathName = usePathname();
  const [isNavigating, setIsNavigating] = useState(false);
  const router = useRouter();

  useEffect(() => {
    if (!user?.id) return;

    const fetchMessages = async () => {
      try {
        const records = await pb.collection("messages").getFullList({
          filter: `receiver = "${user.id}" && status != "seen"`,
          sort: "-timestamp",
          $autoCancel: false,
        });
        setUnreadMessages(records as unknown as UnreadMessage[]);
      } catch (error) {
        console.error("Failed to fetch messages:", error);
      }
    };

    const fetchNotifications = async () => {
      try {
        const records = await pb.collection("notifications").getFullList({
          filter: `recipient = "${user.id}"`,
          $autoCancel: false,
        });
        setUnreadNotifications(records.filter((r: any) => !r.read).length);
      } catch (error) {
        console.error("Failed to fetch notifications:", error);
      }
    };

    fetchMessages();
    fetchNotifications();

    let unsubscribeMessages: (() => void) | null = null;
    let unsubscribeNotifications: (() => void) | null = null;

    const subscribeToMessages = async () => {
      try {
        unsubscribeMessages = await pb.collection("messages").subscribe("*", async (e) => {
          const message = e.record as unknown as UnreadMessage;
          if (message.receiver !== user.id) return;
          if (e.action === "create") {
            if (message.status !== "seen") {
              setUnreadMessages(prev => prev.some(m => m.id === message.id) ? prev : [...prev, message]);
            }
          } else if (e.action === "update") {
            if (message.status === "seen") {
              setUnreadMessages(prev => prev.filter(m => m.id !== message.id));
            } else {
              setUnreadMessages(prev => prev.some(m => m.id === message.id)
                ? prev.map(m => m.id === message.id ? message : m)
                : [...prev, message]
              );
            }
          } else if (e.action === "delete") {
            setUnreadMessages(prev => prev.filter(m => m.id !== message.id));
          }
        });
      } catch (error) {
        console.error("Failed to subscribe to messages:", error);
      }
    };

    const subscribeToNotifications = async () => {
      try {
        unsubscribeNotifications = await pb.collection("notifications").subscribe("*", (e) => {
          const notif = e.record;
          if (notif.recipient !== user.id) return;

          if (e.action === "create") {
            if (!notif.read) setUnreadNotifications(prev => prev + 1);
          } else if (e.action === "update") {
            if (notif.read) setUnreadNotifications(prev => Math.max(0, prev - 1));
          } else if (e.action === "delete") {
            if (!notif.read) setUnreadNotifications(prev => Math.max(0, prev - 1));
          }
        });
      } catch (error) {
        console.error("Failed to subscribe to notifications:", error);
      }
    };

    subscribeToMessages();
    subscribeToNotifications();

    return () => {
      if (unsubscribeMessages) unsubscribeMessages();
      if (unsubscribeNotifications) unsubscribeNotifications();
    };
  }, [user?.id]);

  const handleNavigation = async (path: string) => {
    if (path === pathName) return;
    setIsNavigating(true);
    try {
      await router.push(path);
      await new Promise(resolve => setTimeout(resolve, 100));
    } catch (error) {
      console.error('Navigation failed:', error);
    } finally {
      setTimeout(() => setIsNavigating(false), 3000);
    }
  };

  const navItem = (path: string, icon: string, badge?: number) => (
    <div onClick={() => handleNavigation(path)} className="flex flex-row-reverse items-center justify-center cursor-pointer">
      <div className={`${pathName === path ? "bg-[#5182fe]" : "hover:bg-[rgba(255,255,255,0.1)]"} ${icon} p-2 sm:p-4 rounded-[50%] h-8 w-8 sm:h-12 sm:w-12 relative flex items-center justify-center text-sm sm:text-base`}>
        {badge && badge > 0 ? (
          <div className="absolute top-0 right-0 bg-[#5182fe] text-[.6rem] size-4 sm:size-5 flex items-center justify-center rounded-[50%]">
            {badge > 99 ? "99+" : badge}
          </div>
        ) : null}
      </div>
      <div className={`${pathName === path ? "bg-[#5182fe]" : ""} h-8 sm:h-10 w-[3px] sm:w-[4px] rounded-lg mr-1`} />
    </div>
  );

  return (
    <nav className="h-full hidden md:block">
      {isNavigating && (
        <div className="absolute w-full bg-[rgba(17,25,40,.8)] backdrop-blur-[1px] inset-0 flex flex-col items-center justify-between z-50">
          <Loader size="medium" />
        </div>
      )}
      <section className="h-full border-[rgba(255,255,255,0.1)] border-r-[2px]\">
        {isAuthenticated && user?.hasSeenWelcome === true ? (
          <div className="h-full">
            <div className="flex flex-col gap-2 sm:gap-4 justify-center items-center rounded-sm p-1 sm:p-2">
              {navItem("/", "bi bi-chat-dots-fill", unreadMessages.length)}
              {navItem("/settings", "bi bi-gear-fill")}
              {navItem("/search", "bi bi-search")}
              {navItem("/help", "bi bi-info-circle-fill")}
              {navItem("/account", "bi bi-person-circle", unreadNotifications)}
            </div>
          </div>
        ) : null}
      </section>
    </nav>
  );
}

export default SideBar;