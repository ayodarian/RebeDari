import React, { useState, useEffect } from 'react';
import {
  View,
  TextInput,
  Pressable,
  Text,
  StyleSheet,
  ActivityIndicator,
  ActionSheetIOS,
  Platform,
  Alert,
  Image,
  ScrollView,
} from 'react-native';
import * as ImagePicker from 'expo-image-picker';
import * as DocumentPicker from 'expo-document-picker';
import { useThemeStore } from '../../store/useThemeStore';
import { getColors } from '../../constants/Colors';
import type { ChatMessage } from '../../store/useChatStore';

export interface PendingAttachment {
  uri: string;
  fileName: string;
  mimeType: string;
  mediaType: 'image' | 'video' | 'file';
}

interface ChatInputProps {
  onSendText: (text: string) => void;
  onSendMedia: (attachment: PendingAttachment) => void | Promise<void>;
  isSending: boolean;
  editingMessage?: ChatMessage | null;
  onCancelEdit?: () => void;
  onEditSend?: (newContent: string) => void;
}

export default function ChatInput({
  onSendText,
  onSendMedia,
  isSending,
  editingMessage,
  onCancelEdit,
  onEditSend,
}: ChatInputProps) {
  const isDarkMode = useThemeStore((s) => s.isDarkMode);
  const colors = getColors(isDarkMode);
  const [text, setText] = useState('');
  const [pending, setPending] = useState<PendingAttachment[]>([]);
  const [pickerOpen, setPickerOpen] = useState(false);

  const isEditing = !!editingMessage;

  useEffect(() => {
    if (isEditing && editingMessage) {
      setText(editingMessage.content ?? '');
    } else if (!isEditing) {
      setText('');
    }
  }, [editingMessage, isEditing]);

  const showAttachMenu = () => {
    if (isEditing) return;
    if (Platform.OS === 'ios') {
      ActionSheetIOS.showActionSheetWithOptions(
        { options: ['Cancelar', 'Foto o Video', 'Archivo'], cancelButtonIndex: 0 },
        (i) => {
          if (i === 1) pickImageOrVideo();
          if (i === 2) pickDocument();
        }
      );
    } else {
      Alert.alert('Adjuntar', 'Selecciona una opción', [
        { text: 'Foto o Video', onPress: pickImageOrVideo },
        { text: 'Archivo', onPress: pickDocument },
        { text: 'Cancelar', style: 'cancel' },
      ]);
    }
  };

  const pickImageOrVideo = async () => {
    setPickerOpen(true);
    try {
      const res = await ImagePicker.launchImageLibraryAsync({
        mediaTypes: ImagePicker.MediaTypeOptions.All,
        quality: 0.85,
        allowsMultipleSelection: true,
      });
      if (res.canceled) return;
      for (const a of res.assets) {
        const isVideo = a.type === 'video';
        setPending((p) => [
          ...p,
          {
            uri: a.uri,
            fileName: a.fileName || `media_${Date.now()}.${isVideo ? 'mp4' : 'jpg'}`,
            mimeType: isVideo ? 'video/mp4' : 'image/jpeg',
            mediaType: isVideo ? 'video' : 'image',
          },
        ]);
      }
    } catch (e) {
      console.error('[chat] pickImageOrVideo error:', e);
    } finally {
      setPickerOpen(false);
    }
  };

  const pickDocument = async () => {
    setPickerOpen(true);
    try {
      const res = await DocumentPicker.getDocumentAsync({
        multiple: false,
        copyToCacheDirectory: true,
      });
      if (res.canceled || !res.assets?.[0]) return;
      const a = res.assets[0];
      setPending((p) => [
        ...p,
        {
          uri: a.uri,
          fileName: a.name,
          mimeType: a.mimeType || 'application/octet-stream',
          mediaType: 'file',
        },
      ]);
    } catch (e) {
      console.error('[chat] pickDocument error:', e);
    } finally {
      setPickerOpen(false);
    }
  };

  const removePending = (i: number) => {
    setPending((p) => p.filter((_, idx) => idx !== i));
  };

  const handleSend = async () => {
    if (isEditing) {
      if (text.trim() && onEditSend) {
        onEditSend(text.trim());
        setText('');
      }
      return;
    }
    if (text.trim()) {
      onSendText(text.trim());
      setText('');
    }
    if (pending.length > 0) {
      for (const att of pending) {
        await onSendMedia(att);
      }
      setPending([]);
    }
  };

  const canSend = !!text.trim() || (pending.length > 0 && !isEditing);
  const sendDisabledBg = isDarkMode ? 'rgba(255,75,139,0.35)' : '#F0B0C8';
  const sendActiveBg = isEditing ? colors.primary : '#E52D7C';

  return (
    <View style={[styles.container, { backgroundColor: colors.background }]}>
      {isEditing && editingMessage && (
        <View
          style={[
            styles.editBar,
            {
              backgroundColor: colors.surface,
              borderTopColor: colors.inputBorder,
            },
          ]}
        >
          <View style={[styles.editIndicator, { backgroundColor: colors.primary }]} />
          <View style={styles.editContent}>
            <Text style={[styles.editLabel, { color: colors.primary }]}>
              Editando mensaje
            </Text>
            <Text
              style={[styles.editSnippet, { color: colors.textSecondary }]}
              numberOfLines={1}
            >
              {editingMessage.content}
            </Text>
          </View>
          <Pressable
            onPress={onCancelEdit}
            style={styles.editCancel}
            hitSlop={8}
          >
            <Text style={[styles.editCancelIcon, { color: colors.textSecondary }]}>
              ✕
            </Text>
          </Pressable>
        </View>
      )}

      {pending.length > 0 && !isEditing && (
        <ScrollView
          horizontal
          style={[styles.previewRow, { borderTopColor: colors.inputBorder }]}
          contentContainerStyle={styles.previewContent}
        >
          {pending.map((att, i) => (
            <View key={i} style={styles.previewItem}>
              {att.mediaType === 'image' ? (
                <Image source={{ uri: att.uri }} style={styles.previewImage} />
              ) : (
                <View
                  style={[
                    styles.previewFile,
                    { backgroundColor: colors.surface, borderColor: colors.inputBorder },
                  ]}
                >
                  <Text style={styles.previewFileIcon}>
                    {att.mediaType === 'video' ? '🎬' : '📎'}
                  </Text>
                  <Text
                    style={[styles.previewFileName, { color: colors.textSecondary }]}
                    numberOfLines={1}
                  >
                    {att.fileName}
                  </Text>
                </View>
              )}
              <Pressable
                onPress={() => removePending(i)}
                style={styles.previewRemove}
                hitSlop={8}
              >
                <Text style={styles.previewRemoveIcon}>✕</Text>
              </Pressable>
            </View>
          ))}
        </ScrollView>
      )}

      <View style={styles.inputRow}>
        {!isEditing && (
          <Pressable onPress={showAttachMenu} style={styles.attachButton} hitSlop={8}>
            <Text
              style={[
                styles.attachIcon,
                { color: colors.textSecondary },
                pickerOpen && { opacity: 0.5 },
              ]}
            >
              {pickerOpen ? '⏳' : '📎'}
            </Text>
          </Pressable>
        )}

        <View
          style={[
            styles.inputWrapper,
            { backgroundColor: colors.surface, borderColor: colors.inputBorder },
            isEditing && { borderColor: colors.primary, borderWidth: 1.5 },
          ]}
        >
          <TextInput
            style={[styles.textInput, { color: colors.text }]}
            placeholder={isEditing ? 'Editar mensaje...' : 'Mensaje...'}
            placeholderTextColor={colors.textSecondary}
            value={text}
            onChangeText={setText}
            multiline
            maxLength={2000}
          />
        </View>

        <Pressable
          onPress={handleSend}
          disabled={!canSend || isSending}
          style={[
            styles.sendButton,
            { backgroundColor: canSend ? sendActiveBg : sendDisabledBg },
            !canSend && { shadowOpacity: 0, elevation: 0 },
          ]}
          hitSlop={8}
        >
          {isSending ? (
            <ActivityIndicator color="#fff" size="small" />
          ) : isEditing ? (
            <Text style={styles.sendIcon}>✓</Text>
          ) : (
            <Text style={styles.sendIcon}>➤</Text>
          )}
        </Pressable>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    paddingBottom: 6,
    paddingTop: 6,
  },
  inputRow: {
    flexDirection: 'row',
    alignItems: 'flex-end',
    paddingHorizontal: 10,
    gap: 8,
  },
  attachButton: {
    width: 40,
    height: 40,
    borderRadius: 20,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: 'transparent',
    marginBottom: 2,
  },
  attachIcon: {
    fontSize: 22,
  },
  inputWrapper: {
    flex: 1,
    borderRadius: 25,
    borderWidth: 1,
    paddingHorizontal: 4,
  },
  textInput: {
    minHeight: 40,
    maxHeight: 120,
    paddingHorizontal: 14,
    paddingVertical: 9,
    fontSize: 16,
  },
  sendButton: {
    width: 42,
    height: 42,
    borderRadius: 21,
    backgroundColor: '#E52D7C',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 1,
    shadowColor: '#E52D7C',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.3,
    shadowRadius: 4,
    elevation: 3,
  },
  sendIcon: {
    fontSize: 18,
    color: '#fff',
    fontWeight: '700',
    marginLeft: 2,
  },
  previewRow: {
    maxHeight: 90,
    borderTopWidth: 1,
    marginBottom: 6,
  },
  previewContent: {
    paddingHorizontal: 10,
    paddingVertical: 8,
    gap: 8,
  },
  previewItem: {
    position: 'relative',
    marginRight: 8,
  },
  previewImage: {
    width: 64,
    height: 64,
    borderRadius: 8,
  },
  previewFile: {
    width: 120,
    height: 64,
    borderRadius: 8,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 8,
    borderWidth: 1,
  },
  previewFileIcon: {
    fontSize: 22,
  },
  previewFileName: {
    fontSize: 10,
    marginTop: 2,
    maxWidth: 110,
  },
  previewRemove: {
    position: 'absolute',
    top: -6,
    right: -6,
    width: 22,
    height: 22,
    borderRadius: 11,
    backgroundColor: 'rgba(0,0,0,0.6)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  previewRemoveIcon: {
    color: '#fff',
    fontSize: 12,
    fontWeight: '700',
  },
  editBar: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 12,
    paddingVertical: 10,
    borderTopWidth: 1,
    marginBottom: 6,
    gap: 10,
  },
  editIndicator: {
    width: 3,
    height: 32,
    borderRadius: 2,
  },
  editContent: {
    flex: 1,
  },
  editLabel: {
    fontSize: 12,
    fontWeight: '700',
    marginBottom: 2,
  },
  editSnippet: {
    fontSize: 13,
  },
  editCancel: {
    width: 28,
    height: 28,
    alignItems: 'center',
    justifyContent: 'center',
  },
  editCancelIcon: {
    fontSize: 16,
    fontWeight: '700',
  },
});
