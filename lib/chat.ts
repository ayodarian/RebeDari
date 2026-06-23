import { getClient, withAuthRetry } from './insforge';
import { uploadFile } from './storage';
import { useAppStore } from '../store/index';
import { createNotification } from './notifications';

export interface ReplyTo {
  id: number;
  sender_name: string;
  type: string;
  content: string;
}

export interface Message {
  id: number;
  session_id: string;
  sender_id: string;
  sender_name: string;
  sender_avatar?: string;
  type: 'text' | 'image' | 'video' | 'audio' | 'file';
  content: string;
  file_name?: string;
  file_size?: number;
  duration?: number;
  waveform?: number[];
  created_at: string;
  read: boolean;
  reply_to?: ReplyTo;
}

const PAGE_SIZE = 50;

export async function getMessages(
  sessionId: string,
  limit: number = PAGE_SIZE,
  before?: string
): Promise<Message[]> {
  try {
    const run = async () => {
      let query = getClient()
        .database.from('messages')
        .select('*')
        .eq('session_id', sessionId)
        .order('created_at', { ascending: false })
        .limit(limit);
      if (before) {
        query = query.lt('created_at', before);
      }
      return query;
    };

    let { data, error } = await withAuthRetry(run);
    if (error) throw error;
    return ((data as Message[]) || []).reverse();
  } catch (error) {
    console.error('[chat] getMessages error:', error);
    return [];
  }
}

export async function sendMessage(
  sessionId: string,
  type: Message['type'],
  content: string,
  options?: {
    fileName?: string;
    fileSize?: number;
    duration?: number;
    waveform?: number[];
    replyTo?: ReplyTo;
  }
): Promise<Message> {
  const user = useAppStore.getState().user;
  if (!user) throw new Error('Usuario no autenticado');

  const createdAt = new Date().toISOString();
  const payload: Record<string, unknown> = {
    session_id: sessionId,
    sender_id: user.id,
    sender_name: user.nombre,
    sender_avatar: user.avatarUrl || null,
    type,
    content,
    created_at: createdAt,
    read: false,
  };
  if (options?.fileName) payload.file_name = options.fileName;
  if (options?.fileSize) payload.file_size = options.fileSize;
  if (options?.duration) payload.duration = Math.round(options.duration);
  if (options?.waveform) payload.waveform = options.waveform.map((v) => Math.round(v));
  if (options?.replyTo) payload.reply_to = options.replyTo;

  const { data, error } = await withAuthRetry(() =>
    getClient().database.from('messages').insert(payload).select().single()
  );
  if (error) throw error;

  try {
    await getClient().realtime.publish(`chat:${sessionId}`, 'message_created', {
      sender_id: user.id,
      type,
    });
  } catch {
    /* realtime publish is best-effort */
  }

  await createNotification(
    sessionId,
    user.id,
    user.nombre,
    'chat',
    'Nuevo mensaje',
    type === 'text' ? content : `Envió un ${type}`
  );

  return {
    id: data.id,
    session_id: sessionId,
    sender_id: user.id,
    sender_name: user.nombre,
    sender_avatar: user.avatarUrl || undefined,
    type,
    content,
    file_name: options?.fileName,
    file_size: options?.fileSize,
    duration: options?.duration,
    waveform: options?.waveform,
    created_at: createdAt,
    read: false,
    reply_to: options?.replyTo,
  };
}

export async function sendImageMessage(
  sessionId: string,
  imageUri: string,
  replyTo?: ReplyTo
): Promise<Message> {
  const path = `chat/images/${Date.now()}_${Math.random().toString(36).slice(2, 6)}.jpg`;
  const url = await uploadFile(imageUri, path);
  return sendMessage(sessionId, 'image', url, { replyTo });
}

export async function sendVideoMessage(
  sessionId: string,
  videoUri: string,
  replyTo?: ReplyTo
): Promise<Message> {
  const path = `chat/videos/${Date.now()}_${Math.random().toString(36).slice(2, 6)}.mp4`;
  const url = await uploadFile(videoUri, path);
  return sendMessage(sessionId, 'video', url, { replyTo });
}

export async function sendAudioMessage(
  sessionId: string,
  audioUri: string,
  duration: number,
  waveform: number[],
  replyTo?: ReplyTo
): Promise<Message> {
  const path = `chat/audios/${Date.now()}_${Math.random().toString(36).slice(2, 6)}.m4a`;
  const url = await uploadFile(audioUri, path);
  return sendMessage(sessionId, 'audio', url, { duration, waveform, replyTo });
}

export async function sendFileMessage(
  sessionId: string,
  fileUri: string,
  fileName: string,
  fileSize: number,
  replyTo?: ReplyTo
): Promise<Message> {
  const ext = fileName.split('.').pop() || 'file';
  const path = `chat/files/${Date.now()}_${Math.random().toString(36).slice(2, 6)}.${ext}`;
  const url = await uploadFile(fileUri, path);
  return sendMessage(sessionId, 'file', url, { fileName, fileSize, replyTo });
}

export async function markMessagesAsRead(sessionId: string, userId: string): Promise<void> {
  try {
    await withAuthRetry(() =>
      getClient()
        .database
        .from('messages')
        .update({ read: true })
        .eq('session_id', sessionId)
        .neq('sender_id', userId)
        .eq('read', false)
    );
  } catch (error) {
    console.error('[chat] markMessagesAsRead error:', error);
  }
}

export async function editMessage(messageId: number, newContent: string): Promise<void> {
  await withAuthRetry(() =>
    getClient()
      .database
      .from('messages')
      .update({ content: newContent })
      .eq('id', messageId)
  );
}

export async function deleteMessage(messageId: number): Promise<void> {
  await withAuthRetry(() =>
    getClient()
      .database
      .from('messages')
      .delete()
      .eq('id', messageId)
  );
}

export function searchMessages(messages: Message[], query: string): Message[] {
  if (!query.trim()) return [];
  const lower = query.toLowerCase();
  return messages.filter(
    (m) => m.type === 'text' && m.content.toLowerCase().includes(lower)
  );
}

export function subscribeToMessages(
  sessionId: string,
  callback: (messages: Message[]) => void,
  onHasMore?: (hasMore: boolean) => void
): () => void {
  let cancelled = false;

  const loadInitial = async () => {
    const messages = await getMessages(sessionId);
    if (!cancelled) {
      callback(messages);
      onHasMore?.(messages.length >= PAGE_SIZE);
    }
  };

  loadInitial();

  const channel = `chat:${sessionId}`;
  const realtime = getClient().realtime;

  const handler = async () => {
    if (cancelled) return;
    const messages = await getMessages(sessionId);
    if (!cancelled) {
      callback(messages);
      onHasMore?.(messages.length >= PAGE_SIZE);
    }
  };

  (async () => {
    try {
      await realtime.subscribe(channel);
      realtime.on('message_created', handler);
    } catch {
      /* realtime may be unavailable */
    }
  })();

  return () => {
    cancelled = true;
    try {
      realtime.off('message_created', handler);
      realtime.unsubscribe(channel);
    } catch {
      /* ignore */
    }
  };
}

export async function loadMoreMessages(
  sessionId: string,
  oldestCreatedAt: string
): Promise<{ messages: Message[]; hasMore: boolean }> {
  const messages = await getMessages(sessionId, PAGE_SIZE, oldestCreatedAt);
  return { messages, hasMore: messages.length >= PAGE_SIZE };
}

export function publishTyping(sessionId: string, userId: string, isTyping: boolean): void {
  try {
    getClient().realtime.publish(`typing:${sessionId}`, 'typing', {
      user_id: userId,
      is_typing: isTyping,
    });
  } catch {
    /* best-effort */
  }
}

export function subscribeToTyping(
  sessionId: string,
  userId: string,
  callback: (isTyping: boolean) => void
): () => void {
  let cancelled = false;
  const channel = `typing:${sessionId}`;
  const realtime = getClient().realtime;

  const handler = (payload: { user_id: string; is_typing: boolean }) => {
    if (!cancelled && payload.user_id !== userId) {
      callback(payload.is_typing);
    }
  };

  (async () => {
    try {
      await realtime.subscribe(channel);
      realtime.on('typing', handler);
    } catch {
      /* best-effort */
    }
  })();

  return () => {
    cancelled = true;
    try {
      realtime.off('typing', handler);
      realtime.unsubscribe(channel);
    } catch {
      /* ignore */
    }
  };
}
