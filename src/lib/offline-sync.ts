export type OfflineQueueItem<T = unknown> = {
  id: string;
  createdAt: string;
  syncStatus: "pending" | "synced" | "failed";
  payload: T;
};

const OFFLINE_QUEUE_KEY = "kashapos:offline:sales";

function getStorage() {
  if (typeof window === "undefined") return null;
  return window.localStorage;
}

export function readOfflineQueue<T = unknown>(): OfflineQueueItem<T>[] {
  const storage = getStorage();
  if (!storage) return [];

  const raw = storage.getItem(OFFLINE_QUEUE_KEY);
  if (!raw) return [];

  try {
    const parsed = JSON.parse(raw);
    return Array.isArray(parsed) ? (parsed as OfflineQueueItem<T>[]) : [];
  } catch {
    return [];
  }
}

export function writeOfflineQueue<T = unknown>(
  queue: OfflineQueueItem<T>[],
): void {
  const storage = getStorage();
  if (!storage) return;
  storage.setItem(OFFLINE_QUEUE_KEY, JSON.stringify(queue));
}

export function enqueueOfflineSale<T = unknown>(
  payload: T,
): OfflineQueueItem<T> {
  const queue = readOfflineQueue<T>();
  const item: OfflineQueueItem<T> = {
    id: crypto.randomUUID(),
    createdAt: new Date().toISOString(),
    syncStatus: "pending",
    payload,
  };
  queue.push(item);
  writeOfflineQueue(queue);
  return item;
}

export async function flushOfflineSales(
  endpoint = "/api/sales",
): Promise<{ synced: number; failed: number }> {
  const queue = readOfflineQueue();
  if (!queue.length) return { synced: 0, failed: 0 };

  let synced = 0;
  let failed = 0;
  const nextQueue: OfflineQueueItem[] = [];

  for (const item of queue) {
    try {
      const payloadObject =
        typeof item.payload === "object" && item.payload !== null
          ? item.payload
          : { value: item.payload };

      const response = await fetch(endpoint, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          ...payloadObject,
          syncStatus: item.syncStatus,
          clientTimestamp: item.createdAt,
        }),
      });

      if (!response.ok) {
        failed += 1;
        nextQueue.push({ ...item, syncStatus: "failed" });
        continue;
      }

      synced += 1;
    } catch {
      failed += 1;
      nextQueue.push({ ...item, syncStatus: "failed" });
    }
  }

  writeOfflineQueue(nextQueue);
  return { synced, failed };
}
