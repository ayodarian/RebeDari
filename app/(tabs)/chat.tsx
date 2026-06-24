import React, { useEffect, useRef, useMemo, useCallback, useState } from 'react';
import {
  View,
  Text,
  FlatList,
  StyleSheet,
  Pressable,
  ActivityIndicator,
  KeyboardAvoidingView,
  Platform,
  TextInput,
  Alert,
} from 'react-native';
import * as Clipboard from 'expo-clipboard';
import { useRouter } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useAppStore } from '../../store/index';
import { useChatStore, type ChatMessage, type MediaType } from '../../store/useChatStore';
import { useThemeStore } from '../../store/useThemeStore';
import { getColors } from '../../constants/Colors';
import ChatBubble from '../components/ChatBubble';
import ChatInput, { type PendingAttachment } from '../components/ChatInput';
import ReplyBar from '../components/ReplyBar';

export default function ChatScreen() {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const user = useAppStore((s) => s.user);
  const sessionId = useAppStore((s) => s.sessionId);
  const isDarkMode = useThemeStore((s) => s.isDarkMode);
  const colors = getColors(isDarkMode);

  const messages = useChatStore((s) => s.messages);
  const isLoading = useChatStore((s) => s.isLoading);
  const isSending = useChatStore((s) => s.isSending);
  const replyingTo = useChatStore((s) => s.replyingTo);
  const editingMessage = useChatStore((s) => s.editingMessage);
  const searchQuery = useChatStore((s) => s.searchQuery);
  const loadMessages = useChatStore((s) => s.loadMessages);
  const sendMessage = useChatStore((s) => s.sendMessage);
  const subscribeToChat = useChatStore((s) => s.subscribeToChat);
  const unsubscribeFromChat = useChatStore((s) => s.unsubscribeFromChat);
  const setReplyingTo = useChatStore((s) => s.setReplyingTo);
  const clearReply = useChatStore((s) => s.clearReply);
  const setEditingMessage = useChatStore((s) => s.setEditingMessage);
  const clearEditing = useChatStore((s) => s.clearEditing);
  const setSearchQuery = useChatStore((s) => s.setSearchQuery);
  const editMessage = useChatStore((s) => s.editMessage);
  const deleteMessage = useChatStore((s) => s.deleteMessage);
  const toggleReaction = useChatStore((s) => s.toggleReaction);
  const uploadMedia = useChatStore((s) => s.uploadMedia);

  const listRef = useRef<FlatList<ChatMessage>>(null);
  const [isSearching, setIsSearching] = useState(false);
  const [searchText, setSearchText] = useState('');

  useEffect(() => {
    if (!sessionId) return;
    loadMessages(sessionId);
    subscribeToChat(sessionId);
    return () => {
      unsubscribeFromChat();
    };
  }, [sessionId]);

  const filteredMessages = useMemo(() => {
    const q = searchQuery.trim().toLowerCase();
    if (!q) return messages;
    return messages.filter((m) => {
      if (m.is_deleted) return false;
      const text = m.content?.toLowerCase() ?? '';
      return text.includes(q);
    });
  }, [messages, searchQuery]);

  const replyLookup = useMemo(() => {
    const map = new Map<string | number, ChatMessage>();
    messages.forEach((m) => {
      if (m.reply_to_id != null) {
        const found = messages.find((x) => x.id === m.reply_to_id);
        if (found) map.set(m.id, found);
      }
    });
    return map;
  }, [messages]);

  const handleSendText = useCallback(
    (text: string) => {
      if (!sessionId || !user) return;
      sendMessage(
        sessionId,
        user.id,
        text,
        undefined,
        'text',
        replyingTo?.id as number | undefined
      );
    },
    [sessionId, user, replyingTo, sendMessage]
  );

  const handleSendMedia = useCallback(
    async (att: PendingAttachment) => {
      if (!sessionId || !user) return;
      const mediaType: MediaType = att.mediaType;
      const url = await uploadMedia(sessionId, att.uri, att.fileName, att.mimeType, mediaType);
      if (!url) return;
      await sendMessage(
        sessionId,
        user.id,
        undefined,
        url,
        mediaType,
        replyingTo?.id as number | undefined
      );
    },
    [sessionId, user, replyingTo, uploadMedia, sendMessage]
  );

  const handleSwipeReply = useCallback(
    (msg: ChatMessage) => {
      setReplyingTo(msg);
    },
    [setReplyingTo]
  );

  const handleEdit = useCallback(
    (msg: ChatMessage) => {
      setEditingMessage(msg);
    },
    [setEditingMessage]
  );

  const handleDelete = useCallback(
    (msg: ChatMessage) => {
      Alert.alert(
        'Eliminar mensaje',
        '¿Estás seguro de que quieres eliminar este mensaje?',
        [
          { text: 'Cancelar', style: 'cancel' },
          {
            text: 'Eliminar',
            style: 'destructive',
            onPress: () => deleteMessage(msg.id),
          },
        ]
      );
    },
    [deleteMessage]
  );

  const handleReact = useCallback(
    (msg: ChatMessage, emoji: string) => {
      if (!user) return;
      toggleReaction(msg.id, user.id, emoji);
    },
    [user, toggleReaction]
  );

  const handleCopy = useCallback(async (msg: ChatMessage) => {
    if (msg.content) {
      try {
        await Clipboard.setStringAsync(msg.content);
      } catch (e) {
        Alert.alert('Error', 'No se pudo copiar el mensaje');
      }
    }
  }, []);

  const handleEditSend = useCallback(
    (newContent: string) => {
      if (!editingMessage) return;
      editMessage(editingMessage.id, newContent);
    },
    [editingMessage, editMessage]
  );

  const handleCancelEdit = useCallback(() => {
    clearEditing();
  }, [clearEditing]);

  const openSearch = useCallback(() => {
    setIsSearching(true);
  }, []);

  const closeSearch = useCallback(() => {
    setIsSearching(false);
    setSearchText('');
    setSearchQuery('');
  }, [setSearchQuery]);

  const handleSearchChange = useCallback(
    (text: string) => {
      setSearchText(text);
      setSearchQuery(text);
    },
    [setSearchQuery]
  );

  const renderItem = useCallback(
    ({ item }: { item: ChatMessage }) => {
      const isMine = item.sender_id === user?.id;
      const replyToMsg = item.reply_to_id != null ? replyLookup.get(item.id) : null;
      return (
        <ChatBubble
          message={item}
          isMine={isMine}
          senderName={user?.nombre}
          replyToMessage={replyToMsg}
          onSwipeReply={() => handleSwipeReply(item)}
          onEdit={isMine ? () => handleEdit(item) : undefined}
          onDelete={isMine ? () => handleDelete(item) : undefined}
          onReact={(emoji) => handleReact(item, emoji)}
          onCopy={() => handleCopy(item)}
        />
      );
    },
    [user?.id, user?.nombre, replyLookup, handleSwipeReply, handleEdit, handleDelete, handleReact, handleCopy]
  );

  if (!user) {
    return (
      <View style={[styles.center, { backgroundColor: colors.background }]}>
        <ActivityIndicator color={colors.primary} />
      </View>
    );
  }

  return (
    <KeyboardAvoidingView
      style={[styles.container, { backgroundColor: colors.background }]}
      behavior={Platform.OS === 'ios' ? 'padding' : undefined}
      keyboardVerticalOffset={Platform.OS === 'ios' ? 0 : 0}
    >
      <View
        style={[
          styles.headerBar,
          { backgroundColor: colors.background, paddingTop: insets.top + 8 },
        ]}
      >
        {isSearching ? (
          <>
            <Pressable onPress={closeSearch} hitSlop={10} style={styles.headerSide}>
              <Text style={[styles.headerAction, { color: colors.primary }]}>✕</Text>
            </Pressable>
            <View
              style={[
                styles.searchInputWrapper,
                { backgroundColor: colors.surface, borderColor: colors.inputBorder },
              ]}
            >
              <Text style={[styles.searchIcon, { color: colors.textSecondary }]}>🔍</Text>
              <TextInput
                style={[styles.searchInput, { color: colors.text }]}
                placeholder="Buscar mensaje..."
                placeholderTextColor={colors.textSecondary}
                value={searchText}
                onChangeText={handleSearchChange}
                autoFocus
                returnKeyType="search"
              />
            </View>
          </>
        ) : (
          <>
            <Pressable
              onPress={() => router.back()}
              hitSlop={10}
              style={styles.headerSide}
            >
              <Text style={[styles.backIcon, { color: colors.primary }]}>‹</Text>
            </Pressable>
            <View style={styles.headerCenter}>
              <Text style={[styles.headerTitle, { color: colors.primary }]}>Chat</Text>
              <Text style={[styles.headerSubtitle, { color: colors.textSecondary }]}>
                {user.nombre}
              </Text>
            </View>
            <Pressable onPress={openSearch} hitSlop={10} style={styles.headerSide}>
              <Text style={[styles.headerAction, { color: colors.primary }]}>🔍</Text>
            </Pressable>
          </>
        )}
      </View>

      {isLoading ? (
        <View style={styles.center}>
          <ActivityIndicator color={colors.primary} />
        </View>
      ) : (
        <FlatList
          ref={listRef}
          data={filteredMessages}
          keyExtractor={(m) => String(m.id)}
          renderItem={renderItem}
          contentContainerStyle={styles.listContent}
          inverted={false}
          onContentSizeChange={() => listRef.current?.scrollToEnd({ animated: false })}
          keyboardShouldPersistTaps="handled"
          keyboardDismissMode="interactive"
          ListEmptyComponent={
            isSearching && searchQuery ? (
              <View style={styles.emptyState}>
                <Text style={[styles.emptyText, { color: colors.textSecondary }]}>
                  No se encontraron mensajes
                </Text>
              </View>
            ) : null
          }
        />
      )}

      {replyingTo && !editingMessage && (
        <ReplyBar replyTo={replyingTo} onCancel={clearReply} />
      )}

      <ChatInput
        onSendText={handleSendText}
        onSendMedia={handleSendMedia}
        isSending={isSending}
        editingMessage={editingMessage}
        onCancelEdit={handleCancelEdit}
        onEditSend={handleEditSend}
      />
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  center: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  headerBar: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 12,
    paddingBottom: 10,
    gap: 8,
  },
  headerSide: {
    width: 40,
    height: 40,
    alignItems: 'center',
    justifyContent: 'center',
  },
  backIcon: {
    fontSize: 32,
    fontWeight: '300',
  },
  headerAction: {
    fontSize: 20,
  },
  headerCenter: {
    flex: 1,
    alignItems: 'center',
  },
  headerTitle: {
    fontSize: 18,
    fontWeight: '700',
  },
  headerSubtitle: {
    fontSize: 12,
    marginTop: 1,
  },
  searchInputWrapper: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    borderRadius: 20,
    borderWidth: 1,
    paddingHorizontal: 12,
    height: 40,
    gap: 8,
  },
  searchIcon: {
    fontSize: 14,
  },
  searchInput: {
    flex: 1,
    fontSize: 15,
    paddingVertical: 0,
  },
  listContent: {
    paddingVertical: 12,
    paddingHorizontal: 4,
    flexGrow: 1,
  },
  emptyState: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 60,
  },
  emptyText: {
    fontSize: 14,
    fontStyle: 'italic',
  },
});
