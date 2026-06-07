
import { useEffect, useState } from "react";
import pb from "./pocketbase"; // adjust path if needed

export function useAuth() {
  const [user, setUser] = useState(pb.authStore.record);
  const [isAuthenticated, setIsAuthenticated] = useState(pb.authStore.isValid);

  useEffect(() => {
    function updateAuth() {
      setUser(pb.authStore.record);
      setIsAuthenticated(pb.authStore.isValid);
    }

    // Listen to auth changes (login/logout)
    pb.authStore.onChange(updateAuth);

    // Initial update
    updateAuth();

    return () => {
      pb.authStore.onChange(() => {}); // clean up
    };
  }, []);

  return { user, isAuthenticated, setIsAuthenticated };
}
