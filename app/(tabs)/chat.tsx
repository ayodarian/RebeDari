import React, { useState, useEffect, useRef, useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  FlatList,
  TextInput,
  Pressable,
  Image,
  TouchableOpacity,
  Modal,
  Alert,
  Keyboard,
  Platform,
  ActivityIndicator,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { PanGestureHandler, PanGestureHandlerGestureEvent } from 'react-native-gesture-handler';
import { Animated } from 'react-native';
import * as ImagePicker from 'expo-image-picker';
import * as DocumentPicker from 'expo-document-picker';
import {
  useAudioRecorder,
  AudioModule,
  setAudioModeAsync,
  createAudioPlayer,
  AudioPlayer,
  AudioQuality,
} from 'expo-audio';
import { VideoView, createVideoPlayer, type VideoPlayer } from 'expo-video';
import * as FileSystem from 'expo-file-system/legacy';
import * as Sharing from 'expo-sharing';
import { useAppStore } from '../../store/index';
import { useTheme } from '../components/ThemeProvider';
import {
  Message,
  ReplyTo,
  getMessages,
  sendMessage,
  sendImageMessage,
  sendVideoMessage,
  sendAudioMessage,
  sendFileMessage,
  markMessagesAsRead,
  subscribeToMessages,
  loadMoreMessages,
  searchMessages,
  editMessage,
  deleteMessage,
  publishTyping,
  subscribeToTyping,
} from '../../lib/chat';
import { markAllNotificationsAsRead } from '../../lib/notifications';
import { getAccessToken } from '../../lib/insforge';

const ICON_PLAY = require('../../assets/icon-play.png');
const ICON_FILE = require('../../assets/icon-file.png');
const ICON_ATTACH = require('../../assets/icon-attach.png');
const ICON_SEND = require('../../assets/icon-send.png');
const ICON_MIC = require('../../assets/icon-mic.png');
const ICON_IMAGE = require('../../assets/icon-image.png');
const ICON_VIDEO = require('../../assets/icon-video.png');

const RECORDING_OPTIONS = {
  isMeteringEnabled: true,
  extension: '.m4a',
  sampleRate: 22050,
  numberOfChannels: 1,
  bitRate: 64000,
  android: {
    extension: '.m4a',
    outputFormat: 'mpeg4' as const,
    audioEncoder: 'aac' as const,
    sampleRate: 22050,
    numberOfChannels: 1,
    bitRate: 64000,
  },
  ios: {
    extension: '.m4a',
    outputFormat: 'aac ',
    audioQuality: AudioQuality.MAX,
    sampleRate: 22050,
    numberOfChannels: 1,
    bitRate: 64000,
    linearPCMBitDepth: 16,
    linearPCMIsBigEndian: false,
    linearPCMIsFloat: false,
  },
  web: {
    mimeType: 'audio/webm',
    bitsPerSecond: 64000,
  },
};

const SWIPE_THRESHOLD = 80;

function SwipeableMessage({
  children,
  onSwipeRight,
  isMe,
  theme,
}: {
  children: React.ReactNode;
  onSwipeRight: () => void;
  isMe: boolean;
  theme: any;
}) {
  const translateX = React.useRef(new Animated.Value(0)).current;
  const iconOpacity = React.useRef(new Animated.Value(0)).current;

  const handleEnd = (event: PanGestureHandlerGestureEvent) => {
    const x = event.nativeEvent.translationX;
    if (x > SWIPE_THRESHOLD) {
      onSwipeRight();
    }
    Animated.parallel([
      Animated.spring(translateX, { toValue: 0, friction: 6, tension: 40, useNativeDriver: true }),
      Animated.spring(iconOpacity, { toValue: 0, friction: 6, tension: 40, useNativeDriver: true }),
    ]).start();
  };

  const onGestureEvent = (e: PanGestureHandlerGestureEvent) => {
    const x = Math.max(0, Math.min(e.nativeEvent.translationX, 120));
    translateX.setValue(x);
    iconOpacity.setValue(Math.min(1, x / SWIPE_THRESHOLD));
  };

  return (
    <View style={styles.swipeContainer}>
      <Animated.View style={[styles.swipeReplyIcon, { opacity: iconOpacity }]}>
        <Text style={{ fontSize: 20, color: theme.primary }}>↩</Text>
      </Animated.View>
      <PanGestureHandler
        onGestureEvent={onGestureEvent}
        onHandlerStateChange={handleEnd}
      >
        <Animated.View style={{ transform: [{ translateX }] }}>{children}</Animated.View>
      </PanGestureHandler>
    </View>
  );
}

export default function ChatScreen() {
  const insets = useSafeAreaInsets();
  const { theme } = useTheme();
  const sessionId = useAppStore((s) => s.sessionId);
  const userId = useAppStore((s) => s.user?.id);
  const [messages, setMessages] = useState<Message[]>([]);
  const [inputText, setInputText] = useState('');
  const [sending, setSending] = useState(false);
  const [showAttachMenu, setShowAttachMenu] = useState(false);
  const audioRecorder = useAudioRecorder(RECORDING_OPTIONS);
  const [isRecording, setIsRecording] = useState(false);
  const [recordingDuration, setRecordingDuration] = useState(0);
  const [waveform, setWaveform] = useState<number[]>([]);
  const [playingAudio, setPlayingAudio] = useState<{
    player: AudioPlayer | null;
    id: number | null;
  }>({ player: null, id: null });
  const flatListRef = useRef<FlatList>(null);
  const recordingInterval = useRef<ReturnType<typeof setInterval> | null>(null);
  const recorderPrepared = useRef(false);
  const videoPlayers = useRef<Map<number, VideoPlayer>>(new Map());
  const [selectedMessage, setSelectedMessage] = useState<Message | null>(null);
  const [showMessageMenu, setShowMessageMenu] = useState(false);
  const [isEditing, setIsEditing] = useState(false);
  const [editContent, setEditContent] = useState('');
  const [replyTo, setReplyTo] = useState<ReplyTo | null>(null);
  const [hasMore, setHasMore] = useState(false);
  const [loadingMore, setLoadingMore] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [showSearch, setShowSearch] = useState(false);
  const [partnerTyping, setPartnerTyping] = useState(false);
  const [keyboardHeight, setKeyboardHeight] = useState(0);
  const typingTimeout = useRef<ReturnType<typeof setTimeout> | null>(null);
  const isTypingRef = useRef(false);

  useEffect(() => {
    if (!sessionId) return;

    const unsubscribe = subscribeToMessages(
      sessionId,
      (msgs) => {
        setMessages((prev) => {
          const byId = new Map(prev.map((m) => [m.id, m]));
          for (const m of msgs) byId.set(m.id, m);
          return Array.from(byId.values());
        });
      },
      (more) => setHasMore(more)
    );

    if (userId) {
      markMessagesAsRead(sessionId, userId);
      markAllNotificationsAsRead(sessionId);
    }

    return () => unsubscribe();
  }, [sessionId, userId]);

  useEffect(() => {
    if (!sessionId || !userId) return;
    const unsub = subscribeToTyping(sessionId, userId, setPartnerTyping);
    return () => unsub();
  }, [sessionId, userId]);

  useEffect(() => {
    if (messages.length > 0) {
      setTimeout(() => {
        flatListRef.current?.scrollToEnd({ animated: true });
      }, 100);
    }
  }, [messages]);

  useEffect(() => {
    const showSub = Keyboard.addListener('keyboardDidShow', (e) => {
      setKeyboardHeight(e.endCoordinates.height);
    });
    const hideSub = Keyboard.addListener('keyboardDidHide', () => {
      setKeyboardHeight(0);
    });
    return () => {
      showSub.remove();
      hideSub.remove();
    };
  }, []);

  useEffect(() => {
    return () => {
      if (typingTimeout.current) {
        clearTimeout(typingTimeout.current);
        typingTimeout.current = null;
      }
      if (isTypingRef.current && sessionId && userId) {
        isTypingRef.current = false;
        publishTyping(sessionId, userId, false);
      }
      if (playingAudio.player) {
        playingAudio.player.remove();
      }
      videoPlayers.current.forEach((player) => player.release());
      videoPlayers.current.clear();
    };
  }, [sessionId, userId]);

  const handleTyping = useCallback(
    (text: string) => {
      if (!sessionId || !userId) return;
      setInputText(text);

      if (text.trim() && !isTypingRef.current) {
        isTypingRef.current = true;
        publishTyping(sessionId, userId, true);
      }

      if (typingTimeout.current) clearTimeout(typingTimeout.current);
      typingTimeout.current = setTimeout(() => {
        isTypingRef.current = false;
        publishTyping(sessionId, userId, false);
      }, 3000);
    },
    [sessionId, userId]
  );

  const handleSendText = async () => {
    if (!inputText.trim() || !sessionId || sending) return;
    setSending(true);
    try {
      const newMsg = await sendMessage(sessionId, 'text', inputText.trim(), {
        replyTo: replyTo ?? undefined,
      });
      setMessages((prev) => {
        const byId = new Map(prev.map((m) => [m.id, m]));
        byId.set(newMsg.id, newMsg);
        return Array.from(byId.values());
      });
      setInputText('');
      setReplyTo(null);
      if (typingTimeout.current) clearTimeout(typingTimeout.current);
      isTypingRef.current = false;
      publishTyping(sessionId, userId!, false);
    } catch {
      Alert.alert('Error', 'No se pudo enviar el mensaje');
    } finally {
      setSending(false);
    }
  };

  const handleSendImage = async () => {
    const permission = await ImagePicker.requestMediaLibraryPermissionsAsync();
    if (permission.status !== 'granted') {
      Alert.alert('Permiso requerido', 'Se necesita acceso a la galería');
      return;
    }
    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ['images'],
      quality: 0.8,
    });
    if (!result.canceled && result.assets[0] && sessionId) {
      setSending(true);
      try {
        const newMsg = await sendImageMessage(sessionId, result.assets[0].uri, replyTo ?? undefined);
        setMessages((prev) => {
          const byId = new Map(prev.map((m) => [m.id, m]));
          byId.set(newMsg.id, newMsg);
          return Array.from(byId.values());
        });
        setReplyTo(null);
      } catch {
        Alert.alert('Error', 'No se pudo enviar la imagen');
      } finally {
        setSending(false);
        setShowAttachMenu(false);
      }
    }
  };

  const handleSendVideo = async () => {
    const permission = await ImagePicker.requestMediaLibraryPermissionsAsync();
    if (permission.status !== 'granted') {
      Alert.alert('Permiso requerido', 'Se necesita acceso a la galería');
      return;
    }
    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ['videos'],
    });
    if (!result.canceled && result.assets[0] && sessionId) {
      setSending(true);
      try {
        const newMsg = await sendVideoMessage(sessionId, result.assets[0].uri, replyTo ?? undefined);
        setMessages((prev) => {
          const byId = new Map(prev.map((m) => [m.id, m]));
          byId.set(newMsg.id, newMsg);
          return Array.from(byId.values());
        });
        setReplyTo(null);
      } catch {
        Alert.alert('Error', 'No se pudo enviar el video');
      } finally {
        setSending(false);
        setShowAttachMenu(false);
      }
    }
  };

  const handleSendFile = async () => {
    const result = await DocumentPicker.getDocumentAsync({});
    if (!result.canceled && result.assets[0] && sessionId) {
      setSending(true);
      try {
        const newMsg = await sendFileMessage(
          sessionId,
          result.assets[0].uri,
          result.assets[0].name,
          result.assets[0].size ?? 0,
          replyTo ?? undefined
        );
        setMessages((prev) => {
          const byId = new Map(prev.map((m) => [m.id, m]));
          byId.set(newMsg.id, newMsg);
          return Array.from(byId.values());
        });
        setReplyTo(null);
      } catch {
        Alert.alert('Error', 'No se pudo enviar el archivo');
      } finally {
        setSending(false);
        setShowAttachMenu(false);
      }
    }
  };

  const handlePlayAudio = async (item: Message) => {
    try {
      if (playingAudio.id === item.id && playingAudio.player) {
        playingAudio.player.pause();
        playingAudio.player.remove();
        setPlayingAudio({ player: null, id: null });
        return;
      }
      if (playingAudio.player) {
        playingAudio.player.remove();
      }
      const token = getAccessToken();
      const player = createAudioPlayer({
        uri: item.content,
        headers: token ? { Authorization: `Bearer ${token}` } : undefined,
      });
      const subscription = (player as unknown as {
        addListener: (
          event: string,
          listener: (status: { didJustFinish?: boolean }) => void
        ) => { remove: () => void };
      }).addListener('playbackStatusUpdate', (status) => {
        if (status.didJustFinish) {
          subscription.remove();
          player.remove();
          setPlayingAudio({ player: null, id: null });
        }
      });
      player.play();
      setPlayingAudio({ player, id: item.id });
    } catch {
      setPlayingAudio({ player: null, id: null });
    }
  };

  const handleDownloadFile = async (item: Message) => {
    try {
      const token = getAccessToken();
      const fileName = item.file_name || `file_${item.id}`;
      const cacheDir = FileSystem.cacheDirectory || FileSystem.documentDirectory || '';
      const localUri = `${cacheDir}chat_files/${fileName}`;

      // Ensure directory exists
      const dirInfo = await FileSystem.getInfoAsync(`${cacheDir}chat_files/`);
      if (!dirInfo.exists) {
        await FileSystem.makeDirectoryAsync(`${cacheDir}chat_files/`, { intermediates: true });
      }

      // Download file with auth headers
      await FileSystem.downloadAsync(item.content, localUri, {
        headers: token ? { Authorization: `Bearer ${token}` } : {},
      });

      // Open share sheet
      if (await Sharing.isAvailableAsync()) {
        await Sharing.shareAsync(localUri);
      } else {
        Alert.alert('Archivo descargado', `Guardado en: ${localUri}`);
      }
    } catch (err) {
      console.error('[chat] Error downloading file:', err);
      Alert.alert('Error', 'No se pudo descargar el archivo');
    }
  };

  const startRecording = async () => {
    try {
      const permission = await AudioModule.requestRecordingPermissionsAsync();
      if (!permission.granted) {
        Alert.alert('Permiso requerido', 'Se necesita acceso al micrófono');
        return;
      }
      await setAudioModeAsync({ allowsRecording: true, playsInSilentMode: true });
      if (!recorderPrepared.current) {
        await audioRecorder.prepareToRecordAsync();
        recorderPrepared.current = true;
      }
      audioRecorder.record();
      setIsRecording(true);
      setRecordingDuration(0);
      setWaveform([]);
      recordingInterval.current = setInterval(() => {
        setRecordingDuration((prev) => prev + 0.2);
        const status = audioRecorder.getStatus();
        if (status && typeof status.metering === 'number') {
          const normalized = Math.max(0, Math.min(1, (status.metering + 60) / 60));
          setWaveform((prev) => [...prev, normalized]);
        } else {
          setWaveform((prev) => [...prev, 0.5]);
        }
      }, 200);
    } catch {
      // Recording error
    }
  };

  const stopRecording = async () => {
    if (!isRecording || !sessionId) return;
    setSending(true);
    setIsRecording(false);
    if (recordingInterval.current) {
      clearInterval(recordingInterval.current);
      recordingInterval.current = null;
    }
    try {
      await audioRecorder.stop();
      const uri = audioRecorder.uri;
      await setAudioModeAsync({ allowsRecording: false });
      if (uri) {
        const newMsg = await sendAudioMessage(
          sessionId,
          uri,
          recordingDuration,
          waveform.length > 0 ? waveform : [0.5],
          replyTo ?? undefined
        );
        setMessages((prev) => {
          const byId = new Map(prev.map((m) => [m.id, m]));
          byId.set(newMsg.id, newMsg);
          return Array.from(byId.values());
        });
        setReplyTo(null);
      }
    } catch {
      // Error stopping recording
    } finally {
      setSending(false);
      setShowAttachMenu(false);
    }
  };

  const stopRecordingAndDiscard = async () => {
    if (!isRecording) return;
    setIsRecording(false);
    if (recordingInterval.current) {
      clearInterval(recordingInterval.current);
      recordingInterval.current = null;
    }
    try {
      await audioRecorder.stop();
      await setAudioModeAsync({ allowsRecording: false });
    } catch {
      // Ignore discard errors
    }
  };

  const formatDuration = (seconds: number) => {
    const mins = Math.floor(seconds / 60);
    const secs = Math.floor(seconds % 60);
    return `${mins}:${secs.toString().padStart(2, '0')}`;
  };

  const handleMessageLongPress = (message: Message) => {
    if (message.sender_id !== userId) return;
    setSelectedMessage(message);
    setShowMessageMenu(true);
  };

  const handleEditMessage = async () => {
    if (!selectedMessage || !editContent.trim()) return;
    try {
      await editMessage(selectedMessage.id, editContent.trim());
      setMessages((prev) =>
        prev.map((m) =>
          m.id === selectedMessage.id ? { ...m, content: editContent.trim() } : m
        )
      );
      setShowMessageMenu(false);
      setSelectedMessage(null);
      setIsEditing(false);
      setEditContent('');
    } catch {
      Alert.alert('Error', 'No se pudo editar el mensaje');
    }
  };

  const handleDeleteMessage = async () => {
    if (!selectedMessage) return;
    const idToDelete = selectedMessage.id;
    Alert.alert('Eliminar mensaje', '¿Estás seguro de que quieres eliminar este mensaje?', [
      { text: 'Cancelar', style: 'cancel' },
      {
        text: 'Eliminar',
        style: 'destructive',
        onPress: async () => {
          try {
            await deleteMessage(idToDelete);
            const player = videoPlayers.current.get(idToDelete);
            if (player) {
              player.release();
              videoPlayers.current.delete(idToDelete);
            }
            setMessages((prev) => prev.filter((m) => m.id !== idToDelete));
            setShowMessageMenu(false);
            setSelectedMessage(null);
          } catch {
            Alert.alert('Error', 'No se pudo eliminar el mensaje');
          }
        },
      },
    ]);
  };

  const handleReplyTo = () => {
    if (!selectedMessage) return;
    setReplyTo({
      id: selectedMessage.id,
      sender_name: selectedMessage.sender_name,
      type: selectedMessage.type,
      content:
        selectedMessage.type === 'text'
          ? selectedMessage.content
          : `[${selectedMessage.type}]`,
    });
    setShowMessageMenu(false);
    setSelectedMessage(null);
  };

  const startEdit = () => {
    if (selectedMessage) {
      setEditContent(selectedMessage.content);
      setIsEditing(true);
    }
  };

  const handleLoadMore = async () => {
    if (!sessionId || loadingMore || !hasMore || messages.length === 0) return;
    setLoadingMore(true);
    try {
      const oldest = messages[0].created_at;
      const result = await loadMoreMessages(sessionId, oldest);
      if (result.messages.length > 0) {
        setMessages((prev) => {
          const byId = new Map(prev.map((m) => [m.id, m]));
          for (const m of result.messages) byId.set(m.id, m);
          return Array.from(byId.values());
        });
        setHasMore(result.hasMore);
      } else {
        setHasMore(false);
      }
    } catch {
      // Error loading more
    } finally {
      setLoadingMore(false);
    }
  };

  const getTimeAgo = (dateStr: string) => {
    const date = new Date(dateStr);
    const now = new Date();
    const diff = now.getTime() - date.getTime();
    const minutes = Math.floor(diff / 60000);
    const hours = Math.floor(diff / 3600000);
    const days = Math.floor(diff / 86400000);
    if (days > 0) return `Hace ${days} día${days > 1 ? 's' : ''}`;
    if (hours > 0) return `Hace ${hours} hora${hours > 1 ? 's' : ''}`;
    if (minutes > 0) return `Hace ${minutes} min${minutes > 1 ? 's' : ''}`;
    return 'Ahora';
  };

  const renderReplyPreview = (msg: Message) => {
    if (!msg.reply_to) return null;
    const rt = msg.reply_to;
    return (
      <View style={[styles.replyPreview, { borderLeftColor: theme.primary }]}>
        <Text style={[styles.replyName, { color: theme.primary }]}>{rt.sender_name}</Text>
        <Text style={[styles.replyContent, { color: theme.textSecondary }]} numberOfLines={1}>
          {rt.type === 'text' ? rt.content : `[${rt.type}]`}
        </Text>
      </View>
    );
  };

  const renderMessage = ({ item }: { item: Message }) => {
    const isMe = item.sender_id === userId;

    const handleSwipeReply = () => {
      setReplyTo({
        id: item.id,
        sender_name: item.sender_name,
        type: item.type,
        content: item.type === 'text' ? item.content : `[${item.type}]`,
      });
    };

    return (
      <View style={[styles.messageContainer, isMe && styles.messageContainerMe]}>
        {!isMe && (
          <View style={styles.avatar}>
            {item.sender_avatar ? (
              <Image source={{ uri: item.sender_avatar }} style={styles.avatarImage} />
            ) : (
              <View style={[styles.avatarPlaceholder, { backgroundColor: theme.primary }]}>
                <Text style={styles.avatarText}>
                  {item.sender_name.charAt(0).toUpperCase()}
                </Text>
              </View>
            )}
          </View>
        )}

        <SwipeableMessage onSwipeRight={handleSwipeReply} isMe={isMe} theme={theme}>
        <TouchableOpacity
          style={[
            styles.messageBubble,
            isMe
              ? [styles.messageBubbleMe, { backgroundColor: theme.primary }]
              : [styles.messageBubbleOther, { backgroundColor: theme.surfaceSecondary }],
          ]}
          onLongPress={() => handleMessageLongPress(item)}
          activeOpacity={0.8}
        >
          {!isMe && (
            <Text style={[styles.senderName, { color: theme.primary }]}>{item.sender_name}</Text>
          )}

          {renderReplyPreview(item)}

          {item.type === 'text' && (
            <Text style={[styles.messageText, { color: isMe ? '#FFFFFF' : theme.text }]}>
              {item.content}
            </Text>
          )}

          {item.type === 'image' && (
            <Image source={{ uri: item.content }} style={styles.messageImage} />
          )}

          {item.type === 'video' &&
            (() => {
              if (!videoPlayers.current.has(item.id)) {
                videoPlayers.current.set(item.id, createVideoPlayer(item.content));
              }
              const player = videoPlayers.current.get(item.id)!;
              return (
                <VideoView player={player} style={styles.messageVideo} contentFit="contain" nativeControls />
              );
            })()}

          {item.type === 'audio' && (
            <View style={styles.audioContainer}>
              <TouchableOpacity
                style={[
                  styles.playButton,
                  { backgroundColor: isMe ? 'rgba(255,255,255,0.3)' : 'rgba(255,107,157,0.2)' },
                ]}
                onPress={() => handlePlayAudio(item)}
              >
                <Image
                  source={ICON_PLAY}
                  style={[styles.playIcon, { tintColor: isMe ? '#FFFFFF' : theme.primary }]}
                />
              </TouchableOpacity>
              <View style={styles.waveformContainer}>
                {item.waveform?.map((value, index) => (
                  <View
                    key={index}
                    style={[
                      styles.waveformBar,
                      {
                        height: value * 30 + 5,
                        backgroundColor: isMe ? '#FFFFFF' : theme.primary,
                      },
                    ]}
                  />
                ))}
              </View>
              <Text style={[styles.durationText, { color: isMe ? '#FFFFFF' : theme.textSecondary }]}>
                {formatDuration(item.duration || 0)}
              </Text>
            </View>
          )}

          {item.type === 'file' && (
            <TouchableOpacity style={styles.fileContainer} onPress={() => handleDownloadFile(item)} activeOpacity={0.7}>
              <Image
                source={ICON_FILE}
                style={[styles.fileIcon, { tintColor: isMe ? '#FFFFFF' : theme.primary }]}
              />
              <View style={styles.fileInfo}>
                <Text style={[styles.fileName, { color: isMe ? '#FFFFFF' : theme.text }]}>
                  {item.file_name}
                </Text>
                <Text style={[styles.fileSize, { color: isMe ? '#FFFFFF' : theme.textSecondary }]}>
                  {item.file_size ? `${(item.file_size / 1024).toFixed(1)} KB` : 'Archivo'}
                </Text>
              </View>
            </TouchableOpacity>
          )}

          <Text style={[styles.timestamp, { color: isMe ? 'rgba(255,255,255,0.7)' : theme.textTertiary }]}>
            {getTimeAgo(item.created_at)}
          </Text>
        </TouchableOpacity>
        </SwipeableMessage>
      </View>
    );
  };

  const displayMessages = searchQuery.trim()
    ? searchMessages(messages, searchQuery)
    : messages;

  return (
    <View
      style={[styles.container, { backgroundColor: theme.background, paddingBottom: keyboardHeight }]}
    >
      <TouchableOpacity
        style={[styles.searchToggleButton, { backgroundColor: theme.surface }]}
        onPress={() => {
          setShowSearch((prev) => !prev);
          if (showSearch) setSearchQuery('');
        }}
      >
        <Text style={{ fontSize: 16, color: theme.primary }}>{showSearch ? '✕' : '🔍'}</Text>
      </TouchableOpacity>
      {showSearch && (
        <View style={[styles.searchBar, { backgroundColor: theme.surface, borderBottomColor: theme.border }]}>
          <TextInput
            style={[styles.searchInput, { backgroundColor: theme.input, color: theme.inputText }]}
            value={searchQuery}
            onChangeText={setSearchQuery}
            placeholder="Buscar mensajes..."
            placeholderTextColor={theme.placeholder}
            autoFocus
          />
          <TouchableOpacity
            onPress={() => {
              setShowSearch(false);
              setSearchQuery('');
            }}
            style={styles.searchClose}
          >
            <Text style={[styles.searchCloseText, { color: theme.primary }]}>Cancelar</Text>
          </TouchableOpacity>
        </View>
      )}

      {searchQuery.trim() && (
        <View style={[styles.searchResultBar, { backgroundColor: theme.primaryLight }]}>
          <Text style={[styles.searchResultText, { color: theme.primary }]}>
            {displayMessages.length} resultado{displayMessages.length !== 1 ? 's' : ''}
          </Text>
        </View>
      )}

      <FlatList
        ref={flatListRef}
        data={displayMessages}
        renderItem={renderMessage}
        keyExtractor={(item) => item.id.toString()}
        style={{ flex: 1 }}
        contentContainerStyle={styles.messagesList}
        onContentSizeChange={() => flatListRef.current?.scrollToEnd({ animated: false })}
        ListHeaderComponent={
          hasMore && !searchQuery.trim() ? (
            <TouchableOpacity
              style={[styles.loadMoreButton, { backgroundColor: theme.primaryLight }]}
              onPress={handleLoadMore}
              disabled={loadingMore}
            >
              {loadingMore ? (
                <ActivityIndicator size="small" color={theme.primary} />
              ) : (
                <Text style={[styles.loadMoreText, { color: theme.primary }]}>Cargar más</Text>
              )}
            </TouchableOpacity>
          ) : null
        }
      />

      {partnerTyping && !searchQuery.trim() && (
        <View style={[styles.typingIndicator, { backgroundColor: theme.surfaceSecondary }]}>
          <Text style={[styles.typingText, { color: theme.textSecondary }]}>
            escribiendo
            <Text style={styles.typingDots}>...</Text>
          </Text>
        </View>
      )}

      {isRecording && (
        <View style={[styles.recordingOverlay, { backgroundColor: theme.surface }]}>
          <View style={styles.recordingContent}>
            <View style={styles.recordingIndicator}>
              <View style={styles.recordingDot} />
              <Text style={[styles.recordingText, { color: theme.text }]}>
                Grabando... {formatDuration(recordingDuration)}
              </Text>
            </View>
            <View style={styles.waveformPreview}>
              {waveform.map((value, index) => (
                <View
                  key={index}
                  style={[
                    styles.waveformBar,
                    { height: value * 40 + 5, backgroundColor: theme.primary },
                  ]}
                />
              ))}
            </View>
            <View style={styles.recordingButtons}>
              <TouchableOpacity
                style={[styles.stopButton, { backgroundColor: theme.surfaceSecondary }]}
                onPress={stopRecordingAndDiscard}
              >
                <Text style={[styles.stopButtonText, { color: theme.text }]}>Detener</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={[styles.stopButton, { backgroundColor: theme.primary }]}
                onPress={stopRecording}
              >
                <Text style={[styles.stopButtonText, { color: '#FFFFFF' }]}>Enviar</Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      )}

      {replyTo && (
        <View style={[styles.replyBar, { backgroundColor: theme.surface, borderLeftColor: theme.primary }]}>
          <View style={styles.replyBarContent}>
            <Text style={[styles.replyBarName, { color: theme.primary }]}>{replyTo.sender_name}</Text>
            <Text style={[styles.replyBarText, { color: theme.textSecondary }]} numberOfLines={1}>
              {replyTo.type === 'text' ? replyTo.content : `[${replyTo.type}]`}
            </Text>
          </View>
          <TouchableOpacity onPress={() => setReplyTo(null)}>
            <Text style={[styles.replyBarClose, { color: theme.textTertiary }]}>✕</Text>
          </TouchableOpacity>
        </View>
      )}

      <View style={[styles.composerWrapper, { backgroundColor: theme.background }]}>
        <View
          style={[
            styles.inputContainer,
            { backgroundColor: theme.surface },
          ]}
        >
        <TouchableOpacity
          style={[styles.attachButton, { backgroundColor: theme.primaryLight }]}
          onPress={() => setShowAttachMenu(!showAttachMenu)}
        >
          <Image source={ICON_ATTACH} style={[styles.attachIcon, { tintColor: theme.primary }]} />
        </TouchableOpacity>

        <TextInput
          style={[styles.textInput, { backgroundColor: theme.input, color: theme.inputText }]}
          value={inputText}
          onChangeText={handleTyping}
          placeholder="Escribe un mensaje..."
          placeholderTextColor={theme.placeholder}
          multiline
          maxLength={1000}
        />

        {inputText.trim() ? (
          <TouchableOpacity
            style={[styles.sendButton, { backgroundColor: theme.primary }]}
            onPress={handleSendText}
            disabled={sending}
          >
            <Image source={ICON_SEND} style={styles.sendIcon} />
          </TouchableOpacity>
        ) : (
          <TouchableOpacity
            style={[styles.sendButton, { backgroundColor: theme.primary }]}
            onPress={startRecording}
            disabled={sending}
          >
            <Image source={ICON_MIC} style={styles.sendIcon} />
          </TouchableOpacity>
        )}
      </View>
      </View>

      <Modal
        visible={showAttachMenu}
        transparent
        animationType="fade"
        onRequestClose={() => setShowAttachMenu(false)}
      >
        <Pressable style={styles.attachMenuOverlay} onPress={() => setShowAttachMenu(false)}>
          <View style={[styles.attachMenu, { backgroundColor: theme.surface }]}>
            <TouchableOpacity style={styles.attachMenuItem} onPress={handleSendImage}>
              <Image source={ICON_IMAGE} style={[styles.menuIcon, { tintColor: theme.primary }]} />
              <Text style={[styles.attachMenuText, { color: theme.text }]}>Imagen</Text>
            </TouchableOpacity>
            <TouchableOpacity style={styles.attachMenuItem} onPress={handleSendVideo}>
              <Image source={ICON_VIDEO} style={[styles.menuIcon, { tintColor: theme.primary }]} />
              <Text style={[styles.attachMenuText, { color: theme.text }]}>Video</Text>
            </TouchableOpacity>
            <TouchableOpacity style={styles.attachMenuItem} onPress={handleSendFile}>
              <Image source={ICON_FILE} style={[styles.menuIcon, { tintColor: theme.primary }]} />
              <Text style={[styles.attachMenuText, { color: theme.text }]}>Archivo</Text>
            </TouchableOpacity>
          </View>
        </Pressable>
      </Modal>

      <Modal
        visible={showMessageMenu}
        transparent
        animationType="fade"
        onRequestClose={() => {
          setShowMessageMenu(false);
          setIsEditing(false);
          setSelectedMessage(null);
        }}
      >
        <Pressable
          style={styles.attachMenuOverlay}
          onPress={() => {
            setShowMessageMenu(false);
            setIsEditing(false);
            setSelectedMessage(null);
          }}
        >
          <View style={[styles.attachMenu, { backgroundColor: theme.surface }]}>
            {isEditing ? (
              <>
                <Text style={[styles.editLabel, { color: theme.text }]}>Editar mensaje</Text>
                <TextInput
                  style={[
                    styles.editInput,
                    {
                      backgroundColor: theme.input,
                      color: theme.inputText,
                      borderColor: theme.border,
                    },
                  ]}
                  value={editContent}
                  onChangeText={setEditContent}
                  multiline
                  autoFocus
                />
                <View style={styles.editActions}>
                  <TouchableOpacity
                    style={[styles.editButton, { backgroundColor: theme.surfaceSecondary }]}
                    onPress={() => {
                      setIsEditing(false);
                      setEditContent('');
                    }}
                  >
                    <Text style={[styles.editButtonText, { color: theme.text }]}>Cancelar</Text>
                  </TouchableOpacity>
                  <TouchableOpacity
                    style={[styles.editButton, { backgroundColor: theme.primary }]}
                    onPress={handleEditMessage}
                  >
                    <Text style={[styles.editButtonText, { color: '#FFFFFF' }]}>Guardar</Text>
                  </TouchableOpacity>
                </View>
              </>
            ) : (
              <>
                <TouchableOpacity style={styles.attachMenuItem} onPress={startEdit}>
                  <Text style={[styles.attachMenuText, { color: theme.text }]}>Editar</Text>
                </TouchableOpacity>
                <TouchableOpacity style={styles.attachMenuItem} onPress={handleDeleteMessage}>
                  <Text style={[styles.attachMenuText, { color: theme.error }]}>Eliminar</Text>
                </TouchableOpacity>
              </>
            )}
          </View>
        </Pressable>
      </Modal>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  searchToggleButton: {
    position: 'absolute',
    top: 8,
    right: 16,
    zIndex: 10,
    width: 36,
    height: 36,
    borderRadius: 18,
    justifyContent: 'center',
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.2,
    shadowRadius: 2,
    elevation: 3,
  },
  searchBar: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 8,
    paddingHorizontal: 12,
    borderBottomWidth: 1,
  },
  searchInput: {
    flex: 1,
    borderRadius: 10,
    paddingHorizontal: 12,
    paddingVertical: 8,
    fontSize: 14,
  },
  searchClose: {
    marginLeft: 10,
    padding: 6,
  },
  searchCloseText: {
    fontSize: 14,
    fontWeight: '600',
  },
  searchResultBar: {
    paddingHorizontal: 16,
    paddingVertical: 6,
  },
  searchResultText: {
    fontSize: 12,
    fontWeight: '600',
  },
  messagesList: {
    padding: 16,
    paddingBottom: 80,
  },
  loadMoreButton: {
    alignSelf: 'center',
    paddingHorizontal: 20,
    paddingVertical: 10,
    borderRadius: 16,
    marginBottom: 12,
  },
  loadMoreText: {
    fontSize: 14,
    fontWeight: '600',
  },
  messageContainer: {
    flexDirection: 'row',
    marginBottom: 12,
    alignItems: 'flex-end',
  },
  messageContainerMe: {
    justifyContent: 'flex-end',
  },
  swipeContainer: {
    maxWidth: '75%',
  },
  swipeReplyIcon: {
    position: 'absolute',
    left: -36,
    top: '50%',
    marginTop: -16,
    justifyContent: 'center',
    alignItems: 'center',
    width: 32,
    height: 32,
  },
  avatar: {
    marginRight: 8,
  },
  avatarImage: {
    width: 32,
    height: 32,
    borderRadius: 16,
  },
  avatarPlaceholder: {
    width: 32,
    height: 32,
    borderRadius: 16,
    justifyContent: 'center',
    alignItems: 'center',
  },
  avatarText: {
    color: '#FFFFFF',
    fontSize: 14,
    fontWeight: 'bold',
  },
  messageBubble: {
    padding: 12,
    borderRadius: 18,
  },
  messageBubbleMe: {
    borderBottomRightRadius: 4,
  },
  messageBubbleOther: {
    borderBottomLeftRadius: 4,
  },
  senderName: {
    fontSize: 12,
    fontWeight: '600',
    marginBottom: 4,
  },
  replyPreview: {
    borderLeftWidth: 3,
    paddingLeft: 8,
    marginBottom: 6,
    paddingVertical: 4,
  },
  replyName: {
    fontSize: 11,
    fontWeight: '700',
    marginBottom: 2,
  },
  replyContent: {
    fontSize: 12,
  },
  messageText: {
    fontSize: 15,
    lineHeight: 20,
  },
  messageImage: {
    width: 200,
    height: 200,
    borderRadius: 12,
  },
  messageVideo: {
    width: 200,
    height: 200,
    borderRadius: 12,
  },
  audioContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    minWidth: 200,
  },
  playButton: {
    width: 36,
    height: 36,
    borderRadius: 18,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 8,
  },
  playIcon: {
    width: 18,
    height: 18,
  },
  waveformContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
    marginRight: 8,
  },
  waveformBar: {
    width: 3,
    marginHorizontal: 1,
    borderRadius: 1.5,
  },
  durationText: {
    fontSize: 12,
  },
  fileContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    minWidth: 200,
  },
  fileIcon: {
    width: 24,
    height: 24,
    marginRight: 8,
  },
  fileInfo: {
    flex: 1,
  },
  fileName: {
    fontSize: 14,
    fontWeight: '600',
  },
  fileSize: {
    fontSize: 12,
  },
  timestamp: {
    fontSize: 11,
    marginTop: 4,
    alignSelf: 'flex-end',
  },
  typingIndicator: {
    paddingHorizontal: 16,
    paddingVertical: 4,
    marginHorizontal: 16,
    marginBottom: 4,
    borderRadius: 12,
    alignSelf: 'flex-start',
  },
  typingText: {
    fontSize: 13,
    fontStyle: 'italic',
  },
  typingDots: {
    fontWeight: '700',
  },
  recordingOverlay: {
    position: 'absolute',
    bottom: 80,
    left: 16,
    right: 16,
    borderRadius: 20,
    padding: 20,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.25,
    shadowRadius: 4,
    elevation: 5,
  },
  recordingContent: {
    alignItems: 'center',
  },
  recordingIndicator: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 16,
  },
  recordingDot: {
    width: 12,
    height: 12,
    borderRadius: 6,
    backgroundColor: '#FF3B30',
    marginRight: 8,
  },
  recordingText: {
    fontSize: 16,
    fontWeight: '600',
  },
  waveformPreview: {
    flexDirection: 'row',
    alignItems: 'center',
    height: 50,
    marginBottom: 16,
  },
  stopButton: {
    paddingHorizontal: 24,
    paddingVertical: 12,
    borderRadius: 20,
  },
  stopButtonText: {
    color: '#FFFFFF',
    fontSize: 16,
    fontWeight: '600',
  },
  recordingButtons: {
    flexDirection: 'row',
    gap: 12,
  },
  replyBar: {
    flexDirection: 'row',
    alignItems: 'center',
    borderLeftWidth: 3,
    paddingHorizontal: 12,
    paddingVertical: 8,
    marginHorizontal: 12,
    marginBottom: 4,
    borderRadius: 8,
  },
  replyBarContent: {
    flex: 1,
  },
  replyBarName: {
    fontSize: 12,
    fontWeight: '700',
    marginBottom: 2,
  },
  replyBarText: {
    fontSize: 12,
  },
  replyBarClose: {
    fontSize: 16,
    marginLeft: 8,
    padding: 4,
  },
  composerWrapper: {
    paddingHorizontal: 12,
    paddingBottom: 8,
    paddingTop: 4,
  },
  inputContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 8,
    borderRadius: 24,
  },
  attachButton: {
    width: 40,
    height: 40,
    borderRadius: 20,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 8,
  },
  attachIcon: {
    width: 22,
    height: 22,
  },
  textInput: {
    flex: 1,
    borderRadius: 12,
    paddingHorizontal: 16,
    paddingVertical: 10,
    fontSize: 15,
    maxHeight: 100,
  },
  sendButton: {
    width: 40,
    height: 40,
    borderRadius: 20,
    justifyContent: 'center',
    alignItems: 'center',
    marginLeft: 8,
  },
  sendIcon: {
    width: 20,
    height: 20,
    tintColor: '#FFFFFF',
  },
  attachMenuOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.5)',
    justifyContent: 'flex-end',
  },
  attachMenu: {
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
    padding: 20,
    paddingBottom: 40,
  },
  attachMenuItem: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 16,
  },
  menuIcon: {
    width: 24,
    height: 24,
    marginRight: 16,
  },
  attachMenuText: {
    fontSize: 16,
  },
  editLabel: {
    fontSize: 16,
    fontWeight: '600',
    marginBottom: 12,
  },
  editInput: {
    borderRadius: 12,
    padding: 12,
    fontSize: 15,
    minHeight: 80,
    maxHeight: 150,
    borderWidth: 1,
    marginBottom: 12,
    textAlignVertical: 'top',
  },
  editActions: {
    flexDirection: 'row',
    justifyContent: 'flex-end',
    gap: 8,
  },
  editButton: {
    paddingHorizontal: 20,
    paddingVertical: 10,
    borderRadius: 16,
  },
  editButtonText: {
    fontSize: 14,
    fontWeight: '600',
  },
});
