"use client";

import React, { useEffect, useState } from "react";
import List from "./components/list/list";
import Authentication from "./components/auth/authentication";
import Main from "./components/main/main";
import { useAuth } from "@/lib/useAuth";
import Loader from "./components/loader/loader";
import WelcomePage from "./components/welcomePage/welcomePage";
import { usePathname } from "next/navigation";
import pb from "@/lib/pocketbase";

type activeUserInfo = {
  id: string;
  username: string;
  message: string;
  avatar: any;
};

function Page() {
  const [activeUser, setActiveUSer] = React.useState<activeUserInfo[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const { user, isAuthenticated } = useAuth();
  const pathName = usePathname();

  const exemptPathName = pathName === "/resetPassword" || pathName === "/emailConfirmation";
  useEffect(() => {
    if (!isAuthenticated) {
      const timer = setTimeout(() => {
        setIsLoading(false);
      }, 1000);
      return () => clearTimeout(timer);
    }
    setIsLoading(false);
  }, [isAuthenticated]);

  useEffect(() => {
    if (!user?.id) return;

    const heartbeat = async (isOnline: boolean) => {
      try {
        await pb.collection("users").update(user.id, {
          is_online: isOnline,
          last_seen: new Date().toISOString(),
        });
      } catch (error) {
        console.error("Heartbeat failed:", error);
      }
    };

    heartbeat(true);
    const interval = setInterval(() => heartbeat(true), 25000);

    const handleVisibility = () => {
      if (document.hidden) {
        heartbeat(false);
      } else {
        heartbeat(true);
      }
    };

    const handleOffline = () => {
      pb.collection("users").update(user.id, { is_online: false });
    };

    document.addEventListener("visibilitychange", handleVisibility);
    window.addEventListener("beforeunload", handleOffline);

    return () => {
      clearInterval(interval);
      document.removeEventListener("visibilitychange", handleVisibility);
      window.removeEventListener("beforeunload", handleOffline);
      handleOffline();
    };
  }, [user?.id]);

  if (isLoading) {
    return <Loader />;
  }

  return (
    <section className="flex flex-col md:flex-row h-full w-full rounded-sm">
      {isAuthenticated ? (
        user?.hasSeenWelcome ? (
          <>
            <List activeUser={activeUser} setActiveUser={setActiveUSer} />
            <Main activeUser={activeUser} />
          </>
        ) : (
          <WelcomePage />
        )
      ) : exemptPathName ? null : (
        <Authentication />
      )}
    </section>
  );
}

export default Page;
