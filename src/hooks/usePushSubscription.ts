import { useEffect, useState, useCallback } from "react";
import { supabase } from "@/integrations/supabase/client";

const VAPID_PUBLIC_KEY = "BMdkHB29N1N_WgEH_TxvgG-F8T5I95DW6pqI78tjK3vRxA5ZgCdVg3umjDGMVuSzr2ga7Z4uArK4yh9NWJwJqfY";

function urlBase64ToUint8Array(base64String: string) {
  const padding = "=".repeat((4 - (base64String.length % 4)) % 4);
  const base64 = (base64String + padding).replace(/-/g, "+").replace(/_/g, "/");
  const rawData = window.atob(base64);
  const outputArray = new Uint8Array(rawData.length);
  for (let i = 0; i < rawData.length; ++i) {
    outputArray[i] = rawData.charCodeAt(i);
  }
  return outputArray;
}

export function usePushSubscription(userId: string | undefined) {
  const [isSubscribed, setIsSubscribed] = useState(false);
  const [isSupported, setIsSupported] = useState(false);
  const [permission, setPermission] = useState<NotificationPermission>("default");

  useEffect(() => {
    const supported = "serviceWorker" in navigator && "PushManager" in window && "Notification" in window;
    setIsSupported(supported);
    if (supported) {
      setPermission(Notification.permission);
    }
  }, []);

  // Check existing subscription on mount
  useEffect(() => {
    if (!isSupported || !userId) return;

    navigator.serviceWorker.ready.then(async (reg) => {
      const sub = await reg.pushManager.getSubscription();
      setIsSubscribed(!!sub);
    });
  }, [isSupported, userId]);

  const subscribe = useCallback(async () => {
    if (!isSupported || !userId) return false;

    try {
      // Register SW if not already
      const reg = await navigator.serviceWorker.register("/sw.js");
      await navigator.serviceWorker.ready;

      const result = await Notification.requestPermission();
      setPermission(result);
      if (result !== "granted") return false;

      const subscription = await reg.pushManager.subscribe({
        userVisibleOnly: true,
        applicationServerKey: urlBase64ToUint8Array(VAPID_PUBLIC_KEY),
      });

      const subJson = subscription.toJSON();
      const endpoint = subJson.endpoint!;
      const p256dh = subJson.keys!.p256dh;
      const auth = subJson.keys!.auth;

      // Delete old subscriptions for this user, then insert new
      await supabase.from("push_subscriptions").delete().eq("user_id", userId);
      const { error } = await supabase.from("push_subscriptions").insert({
        user_id: userId,
        endpoint,
        p256dh,
        auth,
      });

      if (error) {
        console.error("Error saving push subscription:", error);
        return false;
      }

      setIsSubscribed(true);
      return true;
    } catch (err) {
      console.error("Push subscription error:", err);
      return false;
    }
  }, [isSupported, userId]);

  const unsubscribe = useCallback(async () => {
    if (!isSupported || !userId) return;

    const reg = await navigator.serviceWorker.ready;
    const sub = await reg.pushManager.getSubscription();
    if (sub) await sub.unsubscribe();

    await supabase.from("push_subscriptions").delete().eq("user_id", userId);
    setIsSubscribed(false);
  }, [isSupported, userId]);

  return { isSupported, isSubscribed, permission, subscribe, unsubscribe };
}
