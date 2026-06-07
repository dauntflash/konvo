import { useEffect, useRef } from 'react';
import pb from "@/lib/pocketbase";

class OnlineStatusService {
  private heartbeat: NodeJS.Timeout | null = null;
  private userId: string | null = null;
  private sessionId: string | null = null;

  async start(userId: string) {
    if (this.userId === userId && this.sessionId) return;
    this.stop();
    
    this.userId = userId;
    this.sessionId = `${userId}_${Date.now()}_${Math.random()}`;
    
    await pb.collection("users").update(userId, { 
      is_online: true, 
      last_seen: new Date().toISOString(),
      session_id: this.sessionId
    });
    
    // Heartbeat every 10 seconds (server checks every 60s for 70s timeout)
    this.heartbeat = setInterval(() => {
      pb.collection("users").update(userId, { 
        last_seen: new Date().toISOString(),
        session_id: this.sessionId 
      }).catch(console.error);
    }, 10000);

    const setOffline = () => {
      pb.collection("users").update(userId, { 
        is_online: false,
        session_id: null 
      }).catch(console.error);
    };
    
    window.addEventListener('beforeunload', setOffline);
    window.addEventListener('pagehide', setOffline);
  }

  stop() {
    if (this.heartbeat) clearInterval(this.heartbeat);
    
    if (this.userId) {
      pb.collection("users").update(this.userId, { 
        is_online: false,
        session_id: null 
      }).catch(console.error);
    }
    
    this.userId = null;
    this.sessionId = null;
  }
}

const service = new OnlineStatusService();

export function useOnlineStatus(userId: string | null) {
  const started = useRef(false);

  useEffect(() => {
    if (!userId) {
      if (started.current) service.stop();
      started.current = false;
      return;
    }

    service.start(userId);
    started.current = true;

    return () => {
      service.stop();
      started.current = false;
    };
  }, [userId]);
}