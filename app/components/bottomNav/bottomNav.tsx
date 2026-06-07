"use client";

import pb from "@/lib/pocketbase";
import { useAuth } from "@/lib/useAuth";
import { usePathname, useRouter } from "next/navigation";
import { useEffect, useState } from "react";

function BottomNav() {
  const { user, isAuthenticated } = useAuth();
  const pathName = usePathname();
  const router = useRouter();
  const [unreadMessages, setUnreadMessages] = useState(0);
  const [unreadNotifications, setUnreadNotifications] = useState(0);

  useEffect(() => {
    if (!user?.id) return;

    const fetchCounts = async () => {
      try {
        const messages = await pb.collection("messages").getFullList({
          filter: `receiver = "${user.id}" && status != "seen"`,
          $autoCancel: false,
        });
        setUnreadMessages(messages.length);
      } catch {}
      try {
        const notifs = await pb.collection("notifications").getFullList({
          filter: `recipient = "${user.id}"`,
          $autoCancel: false,
        });
        setUnreadNotifications(notifs.filter((n: any) => !n.read).length);
      } catch {}
    };

    fetchCounts();

    let unsubMessages: (() => void) | null = null;
    let unsubNotifs: (() => void) | null = null;

    pb.collection("messages").subscribe("*", (e) => {
      if (e.record.receiver !== user.id) return;
      if (e.action === "create" && e.record.status !== "seen") setUnreadMessages(p => p + 1);
      if (e.action === "update" && e.record.status === "seen") setUnreadMessages(p => Math.max(0, p - 1));
      if (e.action === "delete") setUnreadMessages(p => Math.max(0, p - 1));
    }).then(u => unsubMessages = u).catch(() => {});

    pb.collection("notifications").subscribe("*", (e) => {
      if (e.record.recipient !== user.id) return;
      if (e.action === "create" && !e.record.read) setUnreadNotifications(p => p + 1);
      if (e.action === "update" && e.record.read) setUnreadNotifications(p => Math.max(0, p - 1));
      if (e.action === "delete" && !e.record.read) setUnreadNotifications(p => Math.max(0, p - 1));
    }).then(u => unsubNotifs = u).catch(() => {});

    return () => {
      unsubMessages?.();
      unsubNotifs?.();
    };
  }, [user?.id]);

  if (!isAuthenticated || !user?.hasSeenWelcome) return null;

  const items = [
    { path: "/", icon: "bi-chat-dots-fill", badge: unreadMessages },
    { path: "/search", icon: "bi-search" },
    { path: "/settings", icon: "bi-gear-fill" },
    { path: "/help", icon: "bi-info-circle-fill" },
    { path: "/account", icon: "bi-person-circle", badge: unreadNotifications },
  ];

  return (
    <nav className="md:hidden fixed bottom-0 left-0 right-0 z-50 bg-[rgba(17,25,40,0.95)] backdrop-blur-[9px] border-t border-[rgba(255,255,255,0.1)]">
      <div className="flex justify-around items-center h-16 px-2">
        {items.map(item => (
          <div key={item.path} onClick={() => router.push(item.path)}
            className={`relative flex items-center justify-center w-11 h-11 rounded-full cursor-pointer transition-colors ${pathName === item.path ? "bg-[#5182fe]" : "hover:bg-[rgba(255,255,255,0.1)]"}`}>
            <i className={`bi ${item.icon} text-xl text-white`} />
            {item.badge && item.badge > 0 ? (
              <div className="absolute -top-0.5 -right-0.5 bg-[#5182fe] border-2 border-[rgba(17,25,40,0.95)] text-[9px] min-w-[16px] h-4 flex items-center justify-center rounded-full px-0.5 font-bold">
                {item.badge > 99 ? "99+" : item.badge}
              </div>
            ) : null}
          </div>
        ))}
      </div>
    </nav>
  );
}

export default BottomNav;