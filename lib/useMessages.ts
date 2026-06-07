import { useState, useEffect } from "react";
import { RecordModel } from "pocketbase";
import pb from "./pocketbase";
import { useAuth } from "./useAuth";

export function useMessages(otherId: string) {
  const [messages, setMessages] = useState<RecordModel[]>([]);
  const [loading, setLoading] = useState(true);
  const { user } = useAuth();

  useEffect(() => {
    if (!user?.id || !otherId) return;

    const fetchMessages = async () => {
      try {
        const records = await pb.collection("messages").getFullList({
          filter: `(sender = "${user.id}" && receiver = "${otherId}") || (sender = "${otherId}" && receiver = "${user.id}")`,
          sort: "timestamp",
        });
        setMessages(records);
        setLoading(false);
      } catch (error) {
        console.error("Error fetching messages:", error);
        setLoading(false);
      }
    };

    fetchMessages();

    // Subscribe to realtime updates
    let unsubscribe: () => void;
    pb.collection("messages").subscribe("*", () => {
      fetchMessages();
    }).then((func) => {
      unsubscribe = func;
    });

    return () => {
      if (unsubscribe) unsubscribe();
    };
  }, [user?.id, otherId]);

  return { messages, loading };
}
