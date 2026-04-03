import { useEffect, useRef, useCallback } from "react";
import { supabase } from "@/integrations/supabase/client";

const NOTIFICATION_SOUND_URL = "/sounds/sale-notification.mp3";

export function useRealtimePayments(userId: string | undefined) {
  const audioRef = useRef<HTMLAudioElement | null>(null);

  // Pre-load audio
  useEffect(() => {
    audioRef.current = new Audio(NOTIFICATION_SOUND_URL);
    audioRef.current.volume = 0.7;
  }, []);

  const playSound = useCallback(() => {
    if (audioRef.current) {
      audioRef.current.currentTime = 0;
      audioRef.current.play().catch((e) => {
        console.warn("Could not play notification sound:", e);
      });
    }
  }, []);

  useEffect(() => {
    if (!userId) return;

    const channel = supabase
      .channel("mp-payments-realtime")
      .on(
        "postgres_changes",
        {
          event: "INSERT",
          schema: "public",
          table: "mp_payments",
          filter: `user_id=eq.${userId}`,
        },
        (payload) => {
          console.log("New sale received!", payload.new);
          if (payload.new.status === "approved") {
            playSound();
          }
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [userId, playSound]);
}
