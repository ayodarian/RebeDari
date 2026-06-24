import { getClient } from './insforge';

function isRealtimeConnected(realtime: any): boolean {
  return realtime?.socket?.connected === true;
}

export function subscribeToTable(
  channelName: string,
  eventName: string,
  callback: () => void
): () => void {
  let cancelled = false;
  const realtime = getClient().realtime;
  const handler = () => {
    if (!cancelled) callback();
  };

  (async () => {
    try {
      await realtime.subscribe(channelName);
      realtime.on(eventName, handler);
    } catch {
      /* realtime may be unavailable */
    }
  })();

  return () => {
    cancelled = true;
    try {
      if (isRealtimeConnected(realtime)) {
        realtime.off(eventName, handler);
        realtime.unsubscribe(channelName);
      }
    } catch {
      /* ignore */
    }
  };
}

export function publishTableEvent(
  channelName: string,
  eventName: string,
  payload: Record<string, unknown> = {}
): void {
  try {
    const realtime = getClient().realtime;
    if (isRealtimeConnected(realtime)) {
      realtime.publish(channelName, eventName, payload);
    }
  } catch {
    /* best-effort */
  }
}
