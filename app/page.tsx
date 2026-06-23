"use client";

import React, { useEffect, useState } from "react";
import List from "./components/list/list";
import Authentication from "./components/auth/authentication";
import Main from "./components/main/main";
import { useAuth } from "@/lib/useAuth";
import Loader from "./components/loader/loader";
import WelcomePage from "./components/welcomePage/welcomePage";
import { usePathname } from "next/navigation";

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

  if (isLoading) {
    return <Loader />;
  }

  return (
    <section className="flex flex-col md:flex-row h-full w-full roundedme-sm">
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
