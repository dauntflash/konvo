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

  let stopped = false;

  const update = async (isOnline: boolean, keepalive = false) => {
    if (stopped || !pb.authStore.isValid) return;
    try {
      await pb.collection("users").update(
        user.id,
        { is_online: isOnline, last_seen: new Date().toISOString() },
        { requestKey: null, keepalive }
      );
    } catch (error: any) {
      if (error?.status === 404 || error?.status === 401 || error?.status === 403) {
        // user gone or not allowed: stop retrying
        stopped = true;
        clearInterval(interval);
      }
      console.error("Heartbeat failed:", error);
    }
  };

  update(true);
  const interval = setInterval(() => update(!document.hidden), 25000);

  const handleVisibility = () => update(!document.hidden);
  const handleUnload = () => update(false, true);

  document.addEventListener("visibilitychange", handleVisibility);
  window.addEventListener("beforeunload", handleUnload);

  return () => {
    clearInterval(interval);
    document.removeEventListener("visibilitychange", handleVisibility);
    window.removeEventListener("beforeunload", handleUnload);
    update(false);
  };
}, [user?.id]);

  if (isLoading) {
    return <Loader />;
  }

  return (
    <section className="flex flex-col md:flex-row h-full min-h-0 w-full overflow-hidden rounded-sm">
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
