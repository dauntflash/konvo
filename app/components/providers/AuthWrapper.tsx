"use client";

import { useAuth } from "@/lib/useAuth";
import { usePathname, useRouter } from "next/navigation";
import { useEffect, useState } from "react";

export default function AuthWrapper({ children }: { children: React.ReactNode }) {
  const { isAuthenticated } = useAuth();
  const router = useRouter();
  const pathname = usePathname();
  const [isMounted, setIsMounted] = useState(false);

  useEffect(() => {
    setIsMounted(true);
  }, []);

  useEffect(() => {
    if (typeof window !== "undefined") {
      const savedFont = localStorage.getItem("fontPreference") || "medium";
      const fontSizes = { small: "12px", medium: "16px", large: "20px", extralarge: "24px" };
      document.documentElement.style.fontSize = fontSizes[savedFont as keyof typeof fontSizes] || "16px";
    }
  }, []);

  useEffect(() => {
    if (!isMounted) return;

    const publicRoutes = ["/", "/emailConfirmation", "/resetPassword"];

    if (!isAuthenticated && !publicRoutes.includes(pathname)) {
      router.replace("/");
    }

    if (isAuthenticated && publicRoutes.includes(pathname)) {
      router.replace("/");
    }
  }, [isAuthenticated, pathname, router, isMounted]);
  if (!isMounted) {
    return null;
  }

  if (!isAuthenticated && pathname !== "/") {
  }

  return children;
}