import { useEffect, useState } from "react";
import { subscribeQueue } from "./queue";
import { offlineDb, type QueuedMutation } from "./db";

export function useOnlineStatus(): boolean {
  const [online, setOnline] = useState(() =>
    typeof navigator === "undefined" ? true : navigator.onLine,
  );
  useEffect(() => {
    const update = () => setOnline(navigator.onLine);
    window.addEventListener("online", update);
    window.addEventListener("offline", update);
    return () => {
      window.removeEventListener("online", update);
      window.removeEventListener("offline", update);
    };
  }, []);
  return online;
}

export function usePendingSyncCount(): number {
  const [count, setCount] = useState(0);
  useEffect(() => subscribeQueue(setCount), []);
  return count;
}

export function useQueuedMutations(): QueuedMutation[] {
  const [items, setItems] = useState<QueuedMutation[]>([]);
  useEffect(() => {
    let mounted = true;
    const refresh = async () => {
      const all = await offlineDb.mutations.orderBy("createdAt").toArray();
      if (mounted) setItems(all);
    };
    void refresh();
    return subscribeQueue(() => {
      void refresh();
    });
  }, []);
  return items;
}
