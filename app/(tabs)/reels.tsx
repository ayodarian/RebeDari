import { View, Text, StyleSheet, FlatList, Dimensions, TouchableOpacity, ActivityIndicator, Alert, Pressable, TextInput, Modal, Image } from 'react-native';
import { useState, useEffect, useRef, useCallback, useMemo } from 'react';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { VideoPlayer, useVideoPlayer, VideoView } from 'expo-video';
import Slider from '@react-native-community/slider';
import * as ImagePicker from 'expo-image-picker';
import { getInfoAsync } from 'expo-file-system/legacy';
import { getClient } from '../../lib/insforge';
import { uploadFile, deleteFile } from '../../lib/storage';
import { useAppStore } from '../../store/index';
import { useThemeStore } from '../../store/useThemeStore';
import { getColors } from '../../constants/Colors';

const { width, height } = Dimensions.get('window');

interface VideoItem {
  id: number;
  url: string;
  path: string;
  caption: string;
  created_at: string;
}

function VideoListItem({
  item,
  isVisible,
  optionsId,
  setOptionsId,
  setEditingVideoId,
  setEditingCaption,
  colors,
}: {
  item: VideoItem;
  isVisible: boolean;
  optionsId: number | null;
  setOptionsId: (id: number | null) => void;
  setEditingVideoId: (id: number | null) => void;
  setEditingCaption: (caption: string) => void;
  colors: ReturnType<typeof getColors>;
}) {
  const { theme } = useTheme();
  const player = useVideoPlayer(item.url);
  
  const [isPaused, setIsPaused] = useState(false);
  const [showControls, setShowControls] = useState(false);
  const [showSlider, setShowSlider] = useState(false);
  const [currentTime, setCurrentTime] = useState(0);
  const [duration, setDuration] = useState(0);
  const hideTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const sliderTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const formatTime = (seconds: number) => {
    if (seconds === null || seconds === undefined || isNaN(seconds)) return '00:00';
    const mins = Math.floor(seconds / 60);
    const secs = Math.floor(seconds % 60);
    return `${mins}:${secs.toString().padStart(2, '0')}`;
  };

  const hideControlsAfterDelay = useCallback(() => {
    if (hideTimeoutRef.current) clearTimeout(hideTimeoutRef.current);
    hideTimeoutRef.current = setTimeout(() => setShowControls(false), 1000);
  }, []);

  const togglePlayPause = useCallback(() => {
    if (isPaused) { player.play(); setIsPaused(false); }
    else { player.pause(); setIsPaused(true); }
    setShowControls(true);
    hideControlsAfterDelay();
  }, [isPaused, player, hideControlsAfterDelay]);

  const showSliderWithTimeout = useCallback(() => {
    setShowSlider(true);
    if (sliderTimeoutRef.current) clearTimeout(sliderTimeoutRef.current);
    sliderTimeoutRef.current = setTimeout(() => setShowSlider(false), 1000);
  }, []);

  useEffect(() => {
    if (isVisible) {
      player.loop = true; player.play(); setIsPaused(false); setShowControls(false); setShowSlider(false);
    } else {
      player.pause(); setShowControls(false); setShowSlider(false);
    }
  }, [isVisible, player]);

  useEffect(() => {
    if (!player) return;
    player.timeUpdateEventInterval = 1;
    const timer = setTimeout(() => { if (player.duration > 0) setDuration(player.duration); }, 300);
    const subscription = player.addListener('timeUpdate', (event: any) => {
      setCurrentTime(event.currentTime);
      if (player.duration > 0) setDuration(player.duration);
    });
    return () => { clearTimeout(timer); subscription.remove(); };
  }, [player]);

  const getTimeAgo = (dateStr: string) => {
    const date = new Date(dateStr);
    const now = new Date();
    const diff = now.getTime() - date.getTime();
    const hours = Math.floor(diff / (1000 * 60 * 60));
    const days = Math.floor(hours / 24);
    if (days > 0) return `Hace ${days} día${days > 1 ? 's' : ''}`;
    if (hours > 0) return `Hace ${hours} hora${hours > 1 ? 's' : ''}`;
    return 'Hace un momento';
  };
  
  return (
    <Pressable style={[styles.videoContainer, { backgroundColor: colors.surface }]}>
      <View style={[styles.videoHeader, { backgroundColor: colors.surface }]}>
        <View style={styles.headerLeft}>
          <View style={[styles.avatar, { backgroundColor: colors.primary }]} />
          <View style={styles.userInfo}>
            <Text style={[styles.username, { color: colors.text }]}>RebeDari</Text>
            <Text style={[styles.timeAgo, { color: colors.textSecondary }]}>{getTimeAgo(item.created_at)}</Text>
          </View>
        </View>
        <TouchableOpacity onPress={() => setOptionsId(optionsId === item.id ? null : item.id)}>
          <Text style={[styles.moreOptions, { color: colors.textSecondary }]}>⋮</Text>
        </TouchableOpacity>
        {optionsId === item.id && (
          <Pressable style={[styles.optionsMenuContainer, { backgroundColor: colors.surface }]} onPress={(e) => e.stopPropagation()}>
            <Pressable 
              style={styles.optionButton} 
              onPress={() => {
                setOptionsId(null);
                setEditingVideoId(item.id);
                setEditingCaption(item.caption || 'Recuerdos');
              }}
            >
              <Text style={[styles.optionText, { color: colors.primary }]}>Editar título</Text>
            </Pressable>
            <Pressable 
              style={styles.optionButton} 
              onPress={() => {
                setOptionsId(null);
                Alert.alert(
                  '¿Seguro que quieres eliminar este video?',
                  'Esta acción no se puede deshacer.',
                  [
                    { text: 'Cancelar', style: 'cancel' },
                    { 
                      text: 'Eliminar', 
                      style: 'destructive',
                      onPress: async () => {
                        try {
                          await deleteFile(item.path);
                          await insforge.database.from('videos').delete().eq('id', item.id);
                        } catch (error) {
                          console.error('Error deleting video:', error);
                        }
                      },
                    },
                  ]
                );
              }}
            >
              <Text style={[styles.optionText, { color: '#FF3B30' }]}>Eliminar video</Text>
            </Pressable>
          </Pressable>
        )}
      </View>
      {isVisible ? (
        <View style={styles.videoWrapper}>
          <VideoView player={player} style={styles.videoPlayer} contentFit="cover" nativeControls={false} />
          <Pressable onPress={togglePlayPause} style={styles.videoTouchOverlay} />
          {showControls && (
            <View style={styles.playPauseOverlay}>
              <Image source={require('../../assets/pause.png')} style={styles.pauseIconImage} />
            </View>
          )}
          {showSlider && (
            <View style={[styles.videoControls, { backgroundColor: colors.surface }]}>
              <Slider
                style={styles.slider}
minimumValue={0}
              maximumValue={duration > 0 ? duration : 1}
                value={currentTime}
                onSlidingComplete={(value) => {
                  player.currentTime = value;
                  setCurrentTime(value);
                  hideControlsAfterDelay();
                }}
                minimumTrackTintColor="#FF6B9D"
                maximumTrackTintColor="#E0E0E0"
                thumbTintColor="#FF6B9D"
              />
              <Text style={[styles.timeText, { color: colors.textSecondary }]}>
                {formatTime(currentTime)} / {formatTime(duration)}
              </Text>
            </View>
          )}
          <Pressable onPress={showSliderWithTimeout} style={styles.sliderZone} />
        </View>
      ) : (
        <View style={[styles.videoPlaceholder, { backgroundColor: theme.shadow }]}>
          <Text style={styles.placeholderText}>🎬</Text>
          <Text style={[styles.placeholderSubtext, { color: theme.textTertiary }]}>Video</Text>
        </View>
      )}
      <View style={styles.videoOverlay}>
        <Text style={[styles.caption, { color: theme.text }]}>{item.caption || 'Recuerdos'}</Text>
      </View>
    </Pressable>
  );
}

export default function ReelsScreen() {
  const insets = useSafeAreaInsets();
  const isDarkMode = useThemeStore((s) => s.isDarkMode);
  const colors = getColors(isDarkMode);
  const [videos, setVideos] = useState<VideoItem[]>([]);
  const [uploading, setUploading] = useState(false);
  const [currentIndex, setCurrentIndex] = useState(0);
  const [videoRef, setVideoRef] = useState<VideoView | null>(null);
  const [videoOptionsId, setVideoOptionsId] = useState<number | null>(null);
  const [editingVideoId, setEditingVideoId] = useState<number | null>(null);
  const [editingCaption, setEditingCaption] = useState('');
  const [actionModalVisible, setActionModalVisible] = useState(false);
  const [hasMore, setHasMore] = useState(true);
  const PAGE_SIZE = 10;

  useEffect(() => {
    const sessionId = useAppStore.getState().sessionId;
    if (!sessionId) return;
    const loadVideos = async () => {
      try {
        const { data } = await getClient().database.from('videos').select('*').order('created_at', { ascending: false }).limit(PAGE_SIZE);
        if (data) { setVideos(data as VideoItem[]); setHasMore(data.length === PAGE_SIZE); }
      } catch (e) { console.error('Error cargando videos', e); }
    };
    loadVideos();
    const unsub = subscribeToTable(
      `videos:${sessionId}`,
      'videos_changed',
      loadVideos
    );
    return () => unsub();
  }, []);

  const pickVideo = async () => {
    const result = await ImagePicker.launchImageLibraryAsync({ mediaTypes: ['videos'], allowsMultipleSelection: true, selectionLimit: 0, quality: 0.7, videoMaxDuration: 300 });
    if (!result.canceled && result.assets.length > 0) {
      setUploading(true);
      try {
        const timestamp = Date.now();
        const totalAssets = result.assets.length;
        let successCount = 0;
        for (let i = 0; i < result.assets.length; i++) {
          const videoAsset = result.assets[i];
          if (videoAsset.duration && videoAsset.duration > 300000) continue;
          const tempUri = videoAsset.uri;
          let fileSize = 0;
          try { const fileInfo = await getInfoAsync(tempUri); if (fileInfo.exists && 'size' in fileInfo) fileSize = (fileInfo as { size: number }).size; } catch (fileError) { console.warn('No se pudo verificar el tamaño del archivo'); }
          if (fileSize > 100 * 1024 * 1024) continue;
          const path = `videos/${timestamp}_${i}.mp4`;
          const url = await uploadFile(tempUri, path);
          await getClient().database.from('videos').insert({ url, path, caption: 'Recuerdos', created_at: new Date().toISOString(), session_id: useAppStore.getState().sessionId, user_id: useAppStore.getState().user?.id });
          successCount++;
        }
        const state = useAppStore.getState();
        if (state.sessionId) {
          publishTableEvent(`videos:${state.sessionId}`, 'videos_changed');
          if (state.user) {
            await createNotification(state.sessionId, state.user.id, state.user.nombre, 'video', 'Nuevo video', `${state.user.nombre} compartió ${successCount} video${successCount > 1 ? 's' : ''}`);
          }
        }
        alert(`${successCount} de ${totalAssets} videos subidos correctamente`);
      } catch (error) { alert('No se pudieron subir todos los videos'); console.error(error); } finally { setUploading(false); }
    }
  };

  const shuffleVideos = () => { setVideos([...videos].sort(() => Math.random() - 0.5)); };
  const openActionModal = () => setActionModalVisible(true);
  const closeActionModal = () => setActionModalVisible(false);
  const handleVideoAction = (action: () => void) => { closeActionModal(); action(); };

  const renderVideo = ({ item, index }: { item: VideoItem; index: number }) => (
    <VideoListItem
      item={item}
      isVisible={index === currentIndex}
      optionsId={videoOptionsId === item.id ? videoOptionsId : null}
      setOptionsId={setVideoOptionsId}
      setEditingVideoId={setEditingVideoId}
      setEditingCaption={setEditingCaption}
      colors={colors}
    />
  );

  const viewabilityConfig = useMemo(() => ({
    itemVisiblePercentThreshold: 50,
  }), []);

  const handleViewabilityChange = useCallback(({ viewableItems }: any) => {
    if (viewableItems.length > 0) {
      setCurrentIndex(viewableItems[0].index);
    }
  }, []);

  return (
    <View style={[styles.container, { backgroundColor: colors.background }]}>
      {uploading && (
        <View style={[styles.loadingOverlay, { backgroundColor: `${theme.surface}E6` }]}>
          <ActivityIndicator size="large" color={theme.primary} />
          <Text style={[styles.loadingText, { color: theme.primary }]}>Subiendo video...</Text>
        </View>
      )}
      
      <View style={[styles.header, { paddingTop: 5 }]}>
        <Text style={[styles.title, { color: colors.primary }]}>Reels</Text>
      </View>
      <FlatList data={videos} renderItem={renderVideo} keyExtractor={(item) => String(item.id)} pagingEnabled showsVerticalScrollIndicator={false}
        snapToInterval={height * 0.6} snapToAlignment="start" decelerationRate="fast"
        onViewableItemsChanged={handleViewabilityChange} viewabilityConfig={viewabilityConfig}
        ListEmptyComponent={
          <View style={styles.emptyContainer}>
            <Text style={[styles.emptyText, { color: colors.textSecondary }]}>Sin videos aún</Text>
            <Text style={[styles.emptySubtext, { color: colors.textSecondary }]}>Toca + para subir un video</Text>
          </View>
        }
        removeClippedSubviews={true} maxToRenderPerBatch={1} windowSize={3} initialNumToRender={1} />
      
      <TouchableOpacity style={[styles.floatingButton, { backgroundColor: theme.primary }]} onPress={openActionModal}>
        <Text style={[styles.floatingButtonText, { color: theme.text }]}>+</Text>
      </TouchableOpacity>

      <Modal
        visible={editingVideoId !== null}
        transparent
        animationType="fade"
        onRequestClose={() => setEditingVideoId(null)}
      >
        <Pressable style={styles.modalOverlay} onPress={() => setEditingVideoId(null)}>
          <Pressable style={[styles.modalCard, { backgroundColor: colors.surface }]} onPress={(e) => e.stopPropagation()}>
            <Text style={[styles.modalTitle, { color: colors.primary }]}>Editar título</Text>
            <TextInput
              style={[styles.editCaptionInput, { backgroundColor: colors.surfaceSecondary, color: colors.text }]}
              value={editingCaption}
              onChangeText={setEditingCaption}
              placeholder="Título del video"
              placeholderTextColor="#8E8E93"
            />
            <View style={styles.editModalButtons}>
              <Pressable style={[styles.cancelButton, { borderColor: theme.primary }]} onPress={() => setEditingVideoId(null)}>
                <Text style={[styles.cancelButtonText, { color: theme.primary }]}>Cancelar</Text>
              </Pressable>
              <Pressable style={[styles.saveButton, { backgroundColor: theme.primary }]} onPress={async () => {
                if (editingVideoId) {
                  try { await getClient().database.from('videos').update({ caption: editingCaption }).eq('id', editingVideoId); setEditingVideoId(null); } catch (error) { console.error('Error updating caption:', error); }
                }
              }}>
                <Text style={[styles.saveButtonText, { color: theme.text }]}>Guardar</Text>
              </Pressable>
            </View>
          </Pressable>
        </Pressable>
      </Modal>

      <Modal
        visible={actionModalVisible}
        transparent
        animationType="slide"
        onRequestClose={closeActionModal}
      >
        <Pressable style={styles.actionModalOverlay} onPress={closeActionModal}>
          <Pressable style={[styles.actionModalCard, { backgroundColor: colors.surface }]} onPress={(e) => e.stopPropagation()}>
            <Text style={styles.actionModalTitle}>Agregar contenido</Text>
            <Pressable style={styles.actionButton} onPress={() => handleVideoAction(pickVideo)}>
              <Text style={styles.actionButtonText}>🎬 Subir video</Text>
            </Pressable>
            <Pressable style={[styles.actionButton, { backgroundColor: theme.primary }]} onPress={() => handleVideoAction(shuffleVideos)}>
              <Text style={[styles.actionButtonText, { color: theme.text }]}>🔀 Mezclar contenido</Text>
            </Pressable>
            <Pressable style={styles.actionCancelButton} onPress={closeActionModal}>
              <Text style={[styles.actionCancelText, { color: colors.textSecondary }]}>Cancelar</Text>
            </Pressable>
          </Pressable>
        </Pressable>
      </Modal>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  header: {
    paddingBottom: 10,
    paddingHorizontal: 15,
  },
  title: {
    fontSize: 24,
    fontWeight: 'bold',
  },
  videoContainer: {
    marginHorizontal: 12,
    marginBottom: 16,
    marginTop: 8,
    borderRadius: 16,
    overflow: 'hidden',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  videoWrapper: {
    width: '100%',
    aspectRatio: 9 / 16,
    position: 'relative',
  },
  videoPlayer: {
    width: '100%',
    height: '100%',
  },
  videoPlaceholder: {
    width: '100%',
    aspectRatio: 9 / 16,
    backgroundColor: '#1A1A1A',
    alignItems: 'center',
    justifyContent: 'center',
  },
  videoTouchOverlay: {
    ...StyleSheet.absoluteFillObject,
    zIndex: 10,
  },
  placeholderText: {
    fontSize: 60,
    color: '#FFFFFF',
  },
  placeholderSubtext: {
    fontSize: 16,
    color: '#8E8E93',
    marginTop: 10,
  },
  videoOverlay: {
    position: 'absolute',
    bottom: 20,
    left: 15,
    right: 15,
  },
  caption: {
    fontSize: 14,
    color: '#FFFFFF',
    fontWeight: '500',
    textShadowColor: 'rgba(0,0,0,0.5)',
    textShadowOffset: { width: 1, height: 1 },
    textShadowRadius: 3,
  },
  emptyContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    height: height * 0.6,
  },
  emptyText: {
    fontSize: 18,
    fontWeight: '600',
  },
  emptySubtext: {
    fontSize: 14,
    marginTop: 5,
  },
  floatingButton: {
    position: 'absolute',
    right: 20,
    bottom: 85,
    width: 56,
    height: 56,
    borderRadius: 28,
    backgroundColor: '#FF6B9D',
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.25,
    shadowRadius: 4,
    elevation: 5,
    zIndex: 10,
  },
  floatingButtonText: {
    fontSize: 30,
    color: '#FFFFFF',
    fontWeight: '300',
  },
  loadingOverlay: {
    ...StyleSheet.absoluteFillObject,
    alignItems: 'center',
    justifyContent: 'center',
    zIndex: 100,
  },
  loadingText: {
    marginTop: 10,
    fontSize: 16,
  },
  videoHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 12,
    paddingVertical: 10,
    borderTopLeftRadius: 16,
    borderTopRightRadius: 16,
  },
  headerLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
  },
  avatar: {
    width: 32,
    height: 32,
    borderRadius: 16,
    marginRight: 10,
  },
  userInfo: {
    justifyContent: 'center',
  },
  username: {
    fontSize: 14,
    fontWeight: 'bold',
  },
  timeAgo: {
    fontSize: 11,
    marginTop: 1,
  },
  moreOptions: {
    fontSize: 18,
    paddingHorizontal: 4,
  },
  optionsMenuContainer: {
    position: 'absolute',
    right: 12,
    top: 50,
    borderRadius: 16,
    paddingVertical: 8,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.15,
    shadowRadius: 8,
    elevation: 4,
    minWidth: 140,
    zIndex: 100,
  },
  optionButton: {
    paddingVertical: 12,
    paddingHorizontal: 16,
  },
  optionText: {
    fontSize: 14,
    fontWeight: '600',
  },
  optionDeleteText: {},
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    justifyContent: 'center',
    alignItems: 'center',
    zIndex: 200,
  },
  modalCard: {
    width: width - 50,
    borderRadius: 20,
    padding: 20,
  },
  modalTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    marginBottom: 15,
    textAlign: 'center',
  },
  editCaptionInput: {
    width: '100%',
    borderRadius: 12,
    padding: 15,
    fontSize: 16,
    marginBottom: 20,
  },
  editModalButtons: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    width: '100%',
    gap: 12,
  },
  cancelButton: {
    flex: 1,
    paddingVertical: 12,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#FF6B9D',
    alignItems: 'center',
  },
  cancelButtonText: {
    color: '#FF6B9D',
    fontSize: 14,
    fontWeight: '600',
  },
  saveButton: {
    flex: 1,
    paddingVertical: 12,
    borderRadius: 12,
    backgroundColor: '#FF6B9D',
    alignItems: 'center',
  },
  saveButtonText: {
    color: '#FFFFFF',
    fontSize: 14,
    fontWeight: '600',
  },
  playPauseOverlay: {
    ...StyleSheet.absoluteFillObject,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: 'rgba(0, 0, 0, 0.15)',
  },
  playPauseIcon: {
    fontSize: 60,
  },
  videoControls: {
    position: 'absolute',
    bottom: 50,
    left: 12,
    right: 12,
    borderRadius: 10,
    paddingHorizontal: 12,
    paddingVertical: 8,
    zIndex: 20,
  },
  slider: {
    width: '100%',
    height: 40,
  },
  timeText: {
    fontSize: 12,
    textAlign: 'center',
    marginTop: -5,
  },
  pauseIconImage: {
    width: 60,
    height: 60,
    resizeMode: 'contain',
    opacity: 0.9,
  },
  sliderZone: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    height: 80,
    zIndex: 15,
  },
  actionModalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    justifyContent: 'flex-end',
  },
  actionModalCard: {
    borderTopLeftRadius: 30,
    borderTopRightRadius: 30,
    borderBottomLeftRadius: 30,
    borderBottomRightRadius: 30,
    padding: 25,
    paddingBottom: 40,
  },
  actionModalTitle: {
    fontSize: 20,
    fontWeight: 'bold',
    textAlign: 'center',
    marginBottom: 20,
  },
  actionButton: {
    backgroundColor: '#FF6B9D',
    paddingVertical: 16,
    borderRadius: 16,
    marginBottom: 12,
    alignItems: 'center',
  },
  actionButtonText: {
    fontSize: 16,
    fontWeight: '600',
    color: '#FFFFFF',
  },
  actionCancelButton: {
    paddingVertical: 16,
    borderRadius: 16,
    marginTop: 8,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: '#E0E0E0',
  },
  actionCancelText: {
    fontSize: 16,
  },
});
