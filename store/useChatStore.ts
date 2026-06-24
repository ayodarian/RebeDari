import { create } from 'zustand';
import { getClient } from '../lib/insforge';
import { useAppStore } from './index';

export type MediaType = 'text' | 'image' | 'video' | 'audio' | 'file' | 'sticker';

export interface MessageReaction {
  user_id: string;
  emoji: string;
}

export interface ChatMessage {
  id: number | string;
  session_id: string;
  sender_id: string;
  content: string | null;
  media_url: string | null;
  media_type: MediaType | null;
  reply_to_id: number | null;
  created_at: string;
  is_edited?: boolean;
  is_deleted?: boolean;
  reactions?: MessageReaction[];
  status?: 'sending' | 'sent' | 'error';
  tempId?: string;
}

interface ChatState {
  messages: ChatMessage[];
  isLoading: boolean;
  isSending: boolean;
  replyingTo: ChatMessage | null;
  editingMessage: ChatMessage | null;
  searchQuery: string;
  currentSessionId: string | null;
  currentChannel: string | null;
  _messageHandler: ((raw: unknown) => void) | null;
  _updateHandler: ((raw: unknown) => void) | null;

  loadMessages: (sessionId: string) => Promise<void>;
  sendMessage: (
    sessionId: string,
    senderId: string,
    content?: string,
    mediaUrl?: string,
    mediaType?: MediaType,
    replyToId?: number
  ) => Promise<ChatMessage | null>;
  editMessage: (messageId: number | string, newContent: string) => Promise<void>;
  deleteMessage: (messageId: number | string) => Promise<void>;
  toggleReaction: (messageId: number | string, userId: string, emoji: string) => Promise<void>;
  subscribeToChat: (sessionId: string) => Promise<void>;
  unsubscribeFromChat: () => Promise<void>;
  setReplyingTo: (message: ChatMessage | null) => void;
  clearReply: () => void;
  setEditingMessage: (message: ChatMessage | null) => void;
  clearEditing: () => void;
  setSearchQuery: (query: string) => void;
  uploadMedia: (
    sessionId: string,
    fileUri: string,
    fileName: string,
    mimeType: string,
    mediaType: MediaType
  ) => Promise<string | null>;
}

function genTempId(): string {
  return `temp_${Date.now()}_${Math.random().toString(36).slice(2, 9)}`;
}

export const useChatStore = create<ChatState>((set, get) => ({
  messages: [],
  isLoading: false,
  isSending: false,
  replyingTo: null,
  editingMessage: null,
  searchQuery: '',
  currentSessionId: null,
  currentChannel: null,
  _messageHandler: null,
  _updateHandler: null,

  loadMessages: async (sessionId) => {
    set({ isLoading: true, currentSessionId: sessionId });
    try {
      const client = getClient();
      const { data, error } = await client.database
        .from('chat_messages')
        .select('*')
        .eq('session_id', sessionId)
        .order('created_at', { ascending: true });

      if (error) throw error;
      set({ messages: (data as ChatMessage[]) || [], isLoading: false });
    } catch (e) {
      console.error('[chat] loadMessages error:', e);
      set({ isLoading: false });
    }
  },

  sendMessage: async (sessionId, senderId, content, mediaUrl, mediaType = 'text', replyToId) => {
    if (!content && !mediaUrl) return null;

    const tempId = genTempId();
    const optimistic: ChatMessage = {
      id: tempId,
      session_id: sessionId,
      sender_id: senderId,
      content: content ?? null,
      media_url: mediaUrl ?? null,
      media_type: mediaType,
      reply_to_id: replyToId ?? null,
      created_at: new Date().toISOString(),
      status: 'sending',
      tempId,
    };

    set((s) => ({
      messages: [...s.messages, optimistic],
      isSending: true,
    }));

    try {
      const client = getClient();
      const { data, error } = await client.database
        .from('chat_messages')
        .insert([
          {
            session_id: sessionId,
            sender_id: senderId,
            content: content ?? null,
            media_url: mediaUrl ?? null,
            media_type: mediaType,
            reply_to_id: replyToId ?? null,
          },
        ])
        .select()
        .single();

      if (error) throw error;

      const real = data as ChatMessage;
      set((s) => ({
        messages: s.messages.map((m) => (m.tempId === tempId ? { ...real, status: 'sent' } : m)),
        isSending: false,
        replyingTo: null,
      }));
      return real;
    } catch (e) {
      console.error('[chat] sendMessage error:', e);
      set((s) => ({
        messages: s.messages.map((m) => (m.tempId === tempId ? { ...m, status: 'error' } : m)),
        isSending: false,
      }));
      return null;
    }
  },

  editMessage: async (messageId, newContent) => {
    if (!newContent || !newContent.trim()) return;

    const original = get().messages.find((m) => m.id === messageId);
    if (!original) return;

    set((s) => ({
      messages: s.messages.map((m) =>
        m.id === messageId
          ? { ...m, content: newContent, is_edited: true, status: 'sending' }
          : m
      ),
    }));

    try {
      const client = getClient();
      const { error } = await client.database
        .from('chat_messages')
        .update({ content: newContent, is_edited: true })
        .eq('id', messageId);

      if (error) throw error;

      set((s) => ({
        messages: s.messages.map((m) =>
          m.id === messageId ? { ...m, content: newContent, is_edited: true, status: 'sent' } : m
        ),
        editingMessage: null,
      }));
    } catch (e) {
      console.error('[chat] editMessage error:', e);
      set((s) => ({
        messages: s.messages.map((m) =>
          m.id === messageId ? { ...original, status: 'error' } : m
        ),
      }));
    }
  },

  deleteMessage: async (messageId) => {
    const original = get().messages.find((m) => m.id === messageId);
    if (!original) return;

    set((s) => ({
      messages: s.messages.map((m) =>
        m.id === messageId
          ? { ...m, is_deleted: true, content: null, status: 'sending' }
          : m
      ),
    }));

    try {
      const client = getClient();
      const { error } = await client.database
        .from('chat_messages')
        .update({ is_deleted: true, content: null })
        .eq('id', messageId);

      if (error) throw error;

      set((s) => ({
        messages: s.messages.map((m) =>
          m.id === messageId
            ? { ...m, is_deleted: true, content: null, status: 'sent' }
            : m
        ),
      }));
    } catch (e) {
      console.error('[chat] deleteMessage error:', e);
      set((s) => ({
        messages: s.messages.map((m) =>
          m.id === messageId ? { ...original, status: 'error' } : m
        ),
      }));
    }
  },

  toggleReaction: async (messageId, userId, emoji) => {
    const message = get().messages.find((m) => m.id === messageId);
    if (!message) return;

    const current = message.reactions ?? [];
    const exists = current.find((r) => r.user_id === userId && r.emoji === emoji);

    const updated: MessageReaction[] = exists
      ? current.filter((r) => !(r.user_id === userId && r.emoji === emoji))
      : [...current, { user_id: userId, emoji }];

    set((s) => ({
      messages: s.messages.map((m) =>
        m.id === messageId ? { ...m, reactions: updated, status: 'sending' } : m
      ),
    }));

    try {
      const client = getClient();
      const { error } = await client.database
        .from('chat_messages')
        .update({ reactions: updated })
        .eq('id', messageId);

      if (error) throw error;

      set((s) => ({
        messages: s.messages.map((m) =>
          m.id === messageId ? { ...m, reactions: updated, status: 'sent' } : m
        ),
      }));
    } catch (e) {
      console.error('[chat] toggleReaction error:', e);
      set((s) => ({
        messages: s.messages.map((m) =>
          m.id === messageId
            ? { ...m, reactions: message.reactions, status: 'error' }
            : m
        ),
      }));
    }
  },

  subscribeToChat: async (sessionId) => {
    const client = getClient();
    const channel = `chat:${sessionId}`;

    const messageHandler = (raw: unknown) => {
      const wrapper = raw as { meta?: unknown; payload?: unknown };
      const payload = (wrapper?.payload ?? wrapper) as ChatMessage;
      if (!payload || payload.session_id !== sessionId) return;

      const currentUser = useAppStore.getState().user;
      if (currentUser && payload.sender_id === currentUser.id) return;

      set((s) => {
        if (s.messages.some((m) => m.id === payload.id)) return s;
        return { messages: [...s.messages, { ...payload, status: 'sent' as const }] };
      });
    };

    const updateHandler = (raw: unknown) => {
      const wrapper = raw as { meta?: unknown; payload?: unknown };
      const payload = (wrapper?.payload ?? wrapper) as Partial<ChatMessage>;
      if (!payload || payload.session_id !== sessionId) return;
      if (payload.id === undefined || payload.id === null) return;

      set((s) => ({
        messages: s.messages.map((m) =>
          m.id === payload.id
            ? {
                ...m,
                content: payload.content !== undefined ? payload.content : m.content,
                is_edited: payload.is_edited !== undefined ? payload.is_edited : m.is_edited,
                is_deleted:
                  payload.is_deleted !== undefined ? payload.is_deleted : m.is_deleted,
                reactions: payload.reactions !== undefined ? payload.reactions : m.reactions,
                status: 'sent' as const,
              }
            : m
        ),
      }));
    };

    try {
      await client.realtime.connect();
      await client.realtime.subscribe(channel);
      client.realtime.on('new_message', messageHandler as never);
      client.realtime.on('message_updated', updateHandler as never);
      set({
        currentChannel: channel,
        _messageHandler: messageHandler,
        _updateHandler: updateHandler,
      });
    } catch (e) {
      console.error('[chat] subscribe error:', e);
    }
  },

  unsubscribeFromChat: async () => {
    const { currentChannel, _messageHandler, _updateHandler } = get();
    if (!currentChannel) return;
    try {
      const client = getClient();
      if (_messageHandler) {
        client.realtime.off('new_message', _messageHandler as never);
      }
      if (_updateHandler) {
        client.realtime.off('message_updated', _updateHandler as never);
      }
      client.realtime.unsubscribe(currentChannel);
      set({
        currentChannel: null,
        _messageHandler: null,
        _updateHandler: null,
      });
    } catch (e) {
      console.error('[chat] unsubscribe error:', e);
    }
  },

  setReplyingTo: (message) => set({ replyingTo: message }),
  clearReply: () => set({ replyingTo: null }),

  setEditingMessage: (message) => set({ editingMessage: message, replyingTo: null }),
  clearEditing: () => set({ editingMessage: null }),

  setSearchQuery: (query) => set({ searchQuery: query }),

  uploadMedia: async (sessionId, fileUri, fileName, _mimeType, mediaType) => {
    try {
      const client = getClient();
      const folder = mediaType === 'image' ? 'photos'
        : mediaType === 'video' ? 'videos'
        : mediaType === 'audio' ? 'audios'
        : 'files';
      const safeName = fileName.replace(/[^a-zA-Z0-9._-]/g, '_');
      const key = `chat/${folder}/${sessionId}/${Date.now()}_${safeName}`;

      const response = await fetch(fileUri);
      const blob = await response.blob();

      const { data, error } = await client.storage
        .from('chat-media')
        .upload(key, blob);

      if (error) throw error;
      const url = (data as { url?: string; key?: string })?.url;
      return url ?? key;
    } catch (e) {
      console.error('[chat] uploadMedia error:', e);
      return null;
    }
  },
}));
