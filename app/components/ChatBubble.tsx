import React, { useMemo, useState } from 'react';
import {
  View,
  Text,
  Image,
  Pressable,
  StyleSheet,
  ActivityIndicator,
  Modal,
} from 'react-native';
import Animated, {
  useSharedValue,
  useAnimatedStyle,
  withSpring,
  runOnJS,
} from 'react-native-reanimated';
import { Gesture, GestureDetector } from 'react-native-gesture-handler';
import type { ChatMessage, MessageReaction } from '../../store/useChatStore';
import { useThemeStore } from '../../store/useThemeStore';
import { getColors } from '../../constants/Colors';

interface ChatBubbleProps {
  message: ChatMessage;
  isMine: boolean;
  senderName?: string;
  replyToMessage?: ChatMessage | null;
  onLongPress?: () => void;
  onSwipeReply?: () => void;
  onEdit?: () => void;
  onDelete?: () => void;
  onReact?: (emoji: string) => void;
  onCopy?: () => void;
}

const SWIPE_THRESHOLD = -60;

const QUICK_REACTIONS = ['❤️', '😂', '😮', '😢', '🔥', '👍', '😘', '🥰'] as const;

function formatTime(iso: string): string {
  const d = new Date(iso);
  return d.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
}

function getFileName(url: string | null): string {
  if (!url) return 'archivo';
  try {
    const last = url.split('/').pop() || 'archivo';
    return decodeURIComponent(last.split('_').slice(1).join('_') || last);
  } catch {
    return 'archivo';
  }
}

function groupReactions(
  reactions: MessageReaction[]
): { emoji: string; count: number; mine: boolean }[] {
  const map = new Map<string, { emoji: string; count: number; mine: boolean }>();
  for (const r of reactions) {
    const existing = map.get(r.emoji);
    if (existing) {
      existing.count += 1;
    } else {
      map.set(r.emoji, { emoji: r.emoji, count: 1, mine: false });
    }
  }
  return Array.from(map.values());
}

function ChatBubble({
  message,
  isMine,
  senderName,
  replyToMessage,
  onLongPress,
  onSwipeReply,
  onEdit,
  onDelete,
  onReact,
  onCopy,
}: ChatBubbleProps) {
  const isDarkMode = useThemeStore((s) => s.isDarkMode);
  const colors = getColors(isDarkMode);
  const translateX = useSharedValue(0);
  const opacity = useSharedValue(0);
  const [showMenu, setShowMenu] = useState(false);

  React.useEffect(() => {
    opacity.value = withSpring(1, { damping: 18, stiffness: 180 });
  }, []);

  const triggerReply = () => {
    onSwipeReply?.();
  };

  const openMenu = () => {
    setShowMenu(true);
    onLongPress?.();
  };

  const panGesture = useMemo(
    () =>
      Gesture.Pan()
        .activeOffsetX([-15, 15])
        .failOffsetY([-10, 10])
        .onUpdate((e) => {
          if (e.translationX < 0) {
            translateX.value = Math.max(e.translationX * 0.6, -100);
          } else {
            translateX.value = Math.min(e.translationX * 0.3, 40);
          }
        })
        .onEnd(() => {
          if (translateX.value <= SWIPE_THRESHOLD) {
            runOnJS(triggerReply)();
          }
          translateX.value = withSpring(0, { damping: 18, stiffness: 200 });
        }),
    [onSwipeReply]
  );

  const animatedStyle = useAnimatedStyle(() => ({
    transform: [{ translateX: translateX.value }],
    opacity: opacity.value,
  }));

  const isImage = message.media_type === 'image';
  const isAudio = message.media_type === 'audio';
  const isVideo = message.media_type === 'video';
  const isFile = message.media_type === 'file';
  const hasText = !!message.content && !message.is_deleted;
  const isDeleted = !!message.is_deleted;
  const reactions = message.reactions ?? [];
  const groupedReactions = groupReactions(reactions);

  const handleDeletePress = () => {
    setShowMenu(false);
    onDelete?.();
  };

  const handleCopyPress = () => {
    setShowMenu(false);
    onCopy?.();
  };

  const handleEditPress = () => {
    setShowMenu(false);
    onEdit?.();
  };

  const handleReactPress = (emoji: string) => {
    setShowMenu(false);
    onReact?.(emoji);
  };

  const bubbleStyle = isMine
    ? {
        backgroundColor: colors.bubbleMe,
        borderBottomRightRadius: 4,
        ...(isDarkMode
          ? {}
          : {
              borderRightWidth: 3,
              borderRightColor: colors.bubbleMeBorder,
              borderBottomWidth: 2,
              borderBottomColor: colors.bubbleMeBorder,
              shadowColor: colors.bubbleMeBorder,
              shadowOffset: { width: 0, height: 2 } as const,
              shadowOpacity: 0.18,
              shadowRadius: 6,
              elevation: 3,
            }),
      }
    : {
        backgroundColor: colors.surface,
        borderBottomLeftRadius: 4,
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 2 } as const,
        shadowOpacity: 0.05,
        shadowRadius: 4,
        elevation: 2,
      };

  const avatarBg = isDarkMode ? '#2A1B20' : '#F5F5F5';

  return (
    <GestureDetector gesture={panGesture}>
      <Animated.View
        style={[
          styles.row,
          isMine ? styles.rowMine : styles.rowTheirs,
          animatedStyle,
        ]}
      >
        {!isMine && (
          <View style={[styles.avatar, { backgroundColor: avatarBg }]}>
            <Text style={styles.avatarIcon}>👤</Text>
          </View>
        )}

        <Pressable
          onLongPress={openMenu}
          delayLongPress={350}
          style={[styles.bubble, bubbleStyle, isDeleted && styles.bubbleDeleted]}
        >
          {replyToMessage && (
            <View
              style={[
                styles.replyBox,
                isMine ? styles.replyBoxMine : styles.replyBoxTheirs,
                {
                  backgroundColor: isMine
                    ? isDarkMode
                      ? 'rgba(255,255,255,0.06)'
                      : 'rgba(229,45,124,0.08)'
                    : isDarkMode
                    ? 'rgba(255,255,255,0.04)'
                    : 'rgba(0,0,0,0.04)',
                  borderLeftColor: isDarkMode
                    ? colors.primary
                    : isMine
                    ? colors.bubbleMeBorder
                    : colors.primary,
                },
              ]}
            >
              <Text style={[styles.replyAuthor, { color: colors.primary }]}>
                {replyToMessage.sender_id === message.sender_id
                  ? 'Respondiendo a ti'
                  : `Respondiendo a ${senderName || 'pareja'}`}
              </Text>
              <Text
                style={[styles.replySnippet, { color: colors.textSecondary }]}
                numberOfLines={1}
              >
                {replyToMessage.content ||
                  (replyToMessage.media_type
                    ? `[${
                        replyToMessage.media_type === 'image'
                          ? 'Foto'
                          : replyToMessage.media_type === 'video'
                          ? 'Video'
                          : replyToMessage.media_type === 'audio'
                          ? 'Audio'
                          : 'archivo'
                      }]`
                    : '...')}
              </Text>
            </View>
          )}

          {isDeleted ? (
            <Text
              style={[
                styles.text,
                { color: colors.textSecondary, fontStyle: 'italic' },
              ]}
            >
              🗑️ Mensaje eliminado
            </Text>
          ) : (
            <>
              {isImage && message.media_url && (
                <Image
                  source={{ uri: message.media_url }}
                  style={styles.imageAttachment}
                  resizeMode="cover"
                />
              )}

              {isVideo && message.media_url && (
                <View style={styles.videoPlaceholder}>
                  <Text style={styles.videoIcon}>▶️</Text>
                  <Text style={[styles.videoLabel, { color: colors.text }]} numberOfLines={1}>
                    Video
                  </Text>
                </View>
              )}

              {isAudio && (
                <View style={styles.audioRow}>
                  <Text style={styles.audioIcon}>🎤</Text>
                  <Text style={[styles.audioLabel, { color: colors.text }]}>
                    Nota de voz
                  </Text>
                </View>
              )}

              {isFile && (
                <View style={styles.fileRow}>
                  <Text style={styles.fileIcon}>📎</Text>
                  <Text
                    style={[styles.fileLabel, { color: colors.text }]}
                    numberOfLines={1}
                  >
                    {getFileName(message.media_url)}
                  </Text>
                </View>
              )}

              {hasText && (
                <Text style={[styles.text, { color: colors.text }]}>
                  {message.content}
                </Text>
              )}

              <View style={styles.metaRow}>
                <Text style={[styles.time, { color: colors.textSecondary }]}>
                  {formatTime(message.created_at)}
                </Text>
                {message.is_edited && !isDeleted && (
                  <Text style={[styles.editedTag, { color: colors.textSecondary }]}>
                    editado
                  </Text>
                )}
                {isMine && message.status === 'sending' && (
                  <ActivityIndicator
                    size="small"
                    color={colors.textSecondary}
                    style={styles.spinner}
                  />
                )}
                {isMine && message.status === 'error' && (
                  <Text style={styles.errorIcon}>⚠️</Text>
                )}
              </View>
            </>
          )}

          {!isDeleted && groupedReactions.length > 0 && (
            <View
              style={[
                styles.reactionsRow,
                {
                  backgroundColor: isDarkMode
                    ? 'rgba(255,255,255,0.08)'
                    : 'rgba(0,0,0,0.04)',
                },
              ]}
            >
              {groupedReactions.map((r) => (
                <Pressable
                  key={r.emoji}
                  onPress={() => onReact?.(r.emoji)}
                  style={styles.reactionBadge}
                  hitSlop={4}
                >
                  <Text style={styles.reactionEmoji}>{r.emoji}</Text>
                  {r.count > 1 && (
                    <Text
                      style={[
                        styles.reactionCount,
                        { color: colors.textSecondary },
                      ]}
                    >
                      {r.count}
                    </Text>
                  )}
                </Pressable>
              ))}
            </View>
          )}
        </Pressable>

        <Modal
          transparent
          visible={showMenu}
          animationType="fade"
          onRequestClose={() => setShowMenu(false)}
        >
          <Pressable
            style={styles.menuOverlay}
            onPress={() => setShowMenu(false)}
          >
            <Pressable
              onPress={(e) => e.stopPropagation()}
              style={[
                styles.menuContainer,
                { backgroundColor: colors.surface, borderColor: colors.border },
              ]}
            >
              <View
                style={[
                  styles.reactionsBar,
                  { borderBottomColor: colors.border },
                ]}
              >
                {QUICK_REACTIONS.map((emoji) => (
                  <Pressable
                    key={emoji}
                    onPress={() => handleReactPress(emoji)}
                    style={styles.reactionOption}
                    hitSlop={6}
                  >
                    <Text style={styles.reactionOptionEmoji}>{emoji}</Text>
                  </Pressable>
                ))}
              </View>

              {isMine && !isDeleted && onEdit && (
                <Pressable
                  onPress={handleEditPress}
                  style={[styles.menuItem, { borderBottomColor: colors.border }]}
                >
                  <Text style={styles.menuIcon}>✏️</Text>
                  <Text style={[styles.menuText, { color: colors.text }]}>
                    Editar
                  </Text>
                </Pressable>
              )}

              {!isDeleted && onCopy && hasText && (
                <Pressable
                  onPress={handleCopyPress}
                  style={[styles.menuItem, { borderBottomColor: colors.border }]}
                >
                  <Text style={styles.menuIcon}>📋</Text>
                  <Text style={[styles.menuText, { color: colors.text }]}>
                    Copiar
                  </Text>
                </Pressable>
              )}

              {isMine && onDelete && (
                <Pressable
                  onPress={handleDeletePress}
                  style={[styles.menuItem, { borderBottomColor: colors.border }]}
                >
                  <Text style={styles.menuIcon}>🗑️</Text>
                  <Text
                    style={[
                      styles.menuText,
                      { color: '#FF4444', fontWeight: '600' },
                    ]}
                  >
                    Eliminar
                  </Text>
                </Pressable>
              )}
            </Pressable>
          </Pressable>
        </Modal>
      </Animated.View>
    </GestureDetector>
  );
}

const styles = StyleSheet.create({
  row: {
    flexDirection: 'row',
    alignItems: 'flex-end',
    marginVertical: 4,
    paddingHorizontal: 10,
    gap: 6,
  },
  rowMine: {
    justifyContent: 'flex-end',
  },
  rowTheirs: {
    justifyContent: 'flex-start',
  },
  avatar: {
    width: 32,
    height: 32,
    borderRadius: 16,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 2,
  },
  avatarIcon: {
    fontSize: 18,
    opacity: 0.6,
  },
  bubble: {
    maxWidth: '78%',
    paddingHorizontal: 14,
    paddingVertical: 9,
    borderRadius: 16,
  },
  bubbleDeleted: {
    opacity: 0.65,
  },
  text: {
    fontSize: 16,
    lineHeight: 21,
  },
  metaRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'flex-end',
    marginTop: 4,
    gap: 4,
  },
  time: {
    fontSize: 11,
  },
  editedTag: {
    fontSize: 10,
    fontStyle: 'italic',
  },
  spinner: {
    marginLeft: 2,
  },
  errorIcon: {
    fontSize: 11,
  },
  imageAttachment: {
    width: 220,
    height: 220,
    borderRadius: 12,
    marginBottom: 4,
  },
  videoPlaceholder: {
    width: 220,
    height: 140,
    backgroundColor: 'rgba(0,0,0,0.12)',
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 4,
  },
  videoIcon: {
    fontSize: 32,
  },
  videoLabel: {
    fontWeight: '600',
  },
  audioRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    paddingVertical: 4,
  },
  audioIcon: {
    fontSize: 22,
  },
  audioLabel: {
    fontSize: 14,
    fontWeight: '500',
  },
  fileRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    paddingVertical: 4,
  },
  fileIcon: {
    fontSize: 22,
  },
  fileLabel: {
    fontSize: 14,
    fontWeight: '500',
  },
  replyBox: {
    borderLeftWidth: 3,
    paddingLeft: 8,
    marginBottom: 6,
    paddingVertical: 4,
    borderRadius: 4,
  },
  replyBoxMine: {},
  replyBoxTheirs: {},
  replyAuthor: {
    fontSize: 11,
    fontWeight: '700',
    marginBottom: 2,
  },
  replySnippet: {
    fontSize: 12,
  },
  reactionsRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    alignItems: 'center',
    gap: 4,
    marginTop: 6,
    paddingHorizontal: 6,
    paddingVertical: 3,
    borderRadius: 10,
    alignSelf: 'flex-start',
  },
  reactionBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 2,
    paddingHorizontal: 4,
    paddingVertical: 2,
  },
  reactionEmoji: {
    fontSize: 14,
  },
  reactionCount: {
    fontSize: 11,
    fontWeight: '600',
  },
  menuOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.45)',
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 32,
  },
  menuContainer: {
    width: '100%',
    maxWidth: 320,
    borderRadius: 16,
    borderWidth: 1,
    overflow: 'hidden',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 8 } as const,
    shadowOpacity: 0.3,
    shadowRadius: 16,
    elevation: 12,
  },
  reactionsBar: {
    flexDirection: 'row',
    justifyContent: 'space-around',
    alignItems: 'center',
    paddingVertical: 12,
    paddingHorizontal: 8,
    borderBottomWidth: 1,
  },
  reactionOption: {
    padding: 6,
  },
  reactionOptionEmoji: {
    fontSize: 26,
  },
  menuItem: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 14,
    paddingHorizontal: 16,
    gap: 12,
    borderBottomWidth: 1,
  },
  menuIcon: {
    fontSize: 18,
  },
  menuText: {
    fontSize: 15,
    fontWeight: '500',
  },
});

export default ChatBubble;
