import { View, Text, StyleSheet, FlatList, Dimensions, TouchableOpacity, ActivityIndicator, Alert, Pressable, TextInput, Modal, Image } from 'react-native';
import { useState, useEffect, useRef, useCallback } from 'react';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { VideoPlayer, useVideoPlayer, VideoView } from 'expo-video';
import Slider from '@react-native-community/slider';
import * as ImagePicker from 'expo-image-picker';
import { getInfoAsync } from 'expo-file-system/legacy';
import { collection, addDoc, onSnapshot, deleteDoc, doc, query, orderBy, updateDoc } from 'firebase/firestore';
import { db, uploadFile, deleteFile } from '../../lib/firebase';

const { width, height } = Dimensions.get('window');

interface VideoItem {
  id: string;
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
}: { 
  item: VideoItem; 
  isVisible: boolean;
  optionsId: string | null;
  setOptionsId: (id: string | null) => void;
  setEditingVideoId: (id: string | null) => void;
  setEditingCaption: (caption: string) => void;
}) {
  const player = useVideoPlayer(item.url);
  
  const [isPaused, setIsPaused] = useState(false);
  const [showControls, setShowControls] = useState(false);
  const [showSlider, setShowSlider] = useState(false);
  const [currentTime, setCurrentTime] = useState(0);
  const [duration, setDuration] = useState(0);
  const hideTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const sliderTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const formatTime = (seconds: number) => {
    if (seconds === null || seconds === undefined || isNaN(seconds)) {
      return '00:00';
    }
    const mins = Math.floor(seconds / 60);
    const secs = Math.floor(seconds % 60);
    return `${mins}:${secs.toString().padStart(2, '0')}`;
  };

  const hideControlsAfterDelay = useCallback(() => {
    if (hideTimeoutRef.current) {
      clearTimeout(hideTimeoutRef.current);
    }
    hideTimeoutRef.current = setTimeout(() => {
      setShowControls(false);
    }, 1000);
  }, []);

  const togglePlayPause = useCallback(() => {
    if (isPaused) {
      player.play();
      setIsPaused(false);
    } else {
      player.pause();
      setIsPaused(true);
    }
    setShowControls(true);
    hideControlsAfterDelay();
  }, [isPaused, player, hideControlsAfterDelay]);

  const showSliderWithTimeout = useCallback(() => {
    setShowSlider(true);
    if (sliderTimeoutRef.current) {
      clearTimeout(sliderTimeoutRef.current);
    }
    sliderTimeoutRef.current = setTimeout(() => {
      setShowSlider(false);
    }, 1000);
  }, []);

  useEffect(() => {
    if (isVisible) {
      player.loop = true;
      player.play();
      setIsPaused(false);
      setShowControls(false);
      setShowSlider(false);
    } else {
      player.pause();
      setShowControls(false);
      setShowSlider(false);
    }
  }, [isVisible, player]);

  

  useEffect(() => {
    if (!player) return;
    
    player.timeUpdateEventInterval = 1;
    
    const timer = setTimeout(() => {
      if (player.duration > 0) {
        setDuration(player.duration);
      }
    }, 300);
    
    const subscription = player.addListener('timeUpdate', (event: any) => {
      setCurrentTime(event.currentTime);
      if (player.duration > 0) {
        setDuration(player.duration);
      }
    });

    return () => {
      clearTimeout(timer);
      subscription.remove();
    };
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
    <Pressable style={styles.videoContainer}>
      <View style={styles.videoHeader}>
        <View style={styles.headerLeft}>
          <View style={styles.avatar} />
          <View style={styles.userInfo}>
            <Text style={styles.username}>RebeDari</Text>
            <Text style={styles.timeAgo}>{getTimeAgo(item.created_at)}</Text>
          </View>
        </View>
        <TouchableOpacity onPress={() => setOptionsId(optionsId === item.id ? null : item.id)}>
          <Text style={styles.moreOptions}>⋮</Text>
        </TouchableOpacity>
        {optionsId === item.id && (
          <Pressable style={styles.optionsMenuContainer} onPress={(e) => e.stopPropagation()}>
            <Pressable 
              style={styles.optionButton} 
              onPress={() => {
                setOptionsId(null);
                setEditingVideoId(item.id);
                setEditingCaption(item.caption || 'Recuerdos');
              }}
            >
              <Text style={styles.optionText}>Editar título</Text>
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
                          await deleteDoc(doc(db, 'videos', item.id));
                        } catch (error) {
                          console.error('Error deleting video:', error);
                        }
                      },
                    },
                  ]
                );
              }}
            >
              <Text style={[styles.optionText, styles.optionDeleteText]}>Eliminar video</Text>
            </Pressable>
          </Pressable>
        )}
      </View>
      {isVisible ? (
        <View style={styles.videoWrapper}>
          <VideoView
            player={player}
            style={styles.videoPlayer}
            contentFit="cover"
            nativeControls={false}
          />
          <Pressable 
            onPress={togglePlayPause} 
            style={styles.videoTouchOverlay}
          />
          {showControls && (
            <View style={styles.playPauseOverlay}>
              <Image 
                source={require('../../assets/pasue.png')}
                style={styles.pauseIconImage}
              />
            </View>
          )}
          {showSlider && (
            <View style={styles.videoControls}>
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
              <Text style={styles.timeText}>
                {formatTime(currentTime)} / {formatTime(duration)}
              </Text>
            </View>
          )}
          <Pressable 
            onPress={showSliderWithTimeout}
            style={styles.sliderZone}
          />
        </View>
      ) : (
        <View style={styles.videoPlaceholder}>
          <Text style={styles.placeholderText}>🎬</Text>
          <Text style={styles.placeholderSubtext}>Video</Text>
        </View>
      )}
      <View style={styles.videoOverlay}>
        <Text style={styles.caption}>{item.caption || 'Recuerdos'}</Text>
      </View>
    </Pressable>
  );
}

export default function ReelsScreen() {
  const insets = useSafeAreaInsets();
  const [videos, setVideos] = useState<VideoItem[]>([]);
  const [uploading, setUploading] = useState(false);
  const [currentIndex, setCurrentIndex] = useState(0);
  const [videoRef, setVideoRef] = useState<VideoView | null>(null);
  const [videoOptionsId, setVideoOptionsId] = useState<string | null>(null);
  const [editingVideoId, setEditingVideoId] = useState<string | null>(null);
  const [editingCaption, setEditingCaption] = useState('');
  const [actionModalVisible, setActionModalVisible] = useState(false);

  useEffect(() => {
    const videosQuery = query(collection(db, 'videos'), orderBy('created_at', 'desc'));
    const unsubscribe = onSnapshot(videosQuery, (snapshot) => {
      const videosData = snapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data()
      })) as VideoItem[];
      setVideos(videosData);
    });

    return () => unsubscribe();
  }, []);

  const pickVideo = async () => {
    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ['videos'],
      allowsEditing: false,
      quality: ImagePicker.UIImagePickerControllerQualityType.Low,
      videoMaxDuration: 300,
    });

    if (!result.canceled && result.assets[0]) {
      const videoAsset = result.assets[0];
      if (videoAsset.duration && videoAsset.duration > 300000) {
        alert('El video no puede superar los 5 minutos');
        return;
      }
      
      setUploading(true);
      const tempUri = videoAsset.uri;
      
      let fileSize = 0;
      try {
        const fileInfo = await getInfoAsync(tempUri);
        if (fileInfo.exists && 'size' in fileInfo) {
          fileSize = (fileInfo as { size: number }).size;
        }
      } catch (fileError) {
        console.warn('No se pudo verificar el tamaño del archivo');
      }

      if (fileSize > 100 * 1024 * 1024) {
        alert('El video es demasiado pesado (máx 100MB)');
        setUploading(false);
        return;
      }
      
      try {
        const timestamp = Date.now();
        const path = `videos/${timestamp}.mp4`;
        const url = await uploadFile(tempUri, path);
        
        await addDoc(collection(db, 'videos'), {
          url,
          path,
          caption: 'Recuerdos',
          created_at: new Date().toISOString(),
        });
        
        alert('Video subido correctamente');
      } catch (error) {
        alert('Error al subir el video');
        console.error(error);
      } finally {
        setUploading(false);
      }
    }
  };

  const shuffleVideos = () => {
    const shuffled = [...videos].sort(() => Math.random() - 0.5);
    setVideos(shuffled);
  };

  const openActionModal = () => setActionModalVisible(true);
  const closeActionModal = () => setActionModalVisible(false);
  const handleVideoAction = (action: () => void) => {
    closeActionModal();
    action();
  };

  const deleteVideo = async (video: VideoItem) => {
    Alert.alert(
      'Eliminar Video',
      '¿Estás seguro?',
      [
        { text: 'Cancelar', style: 'cancel' },
        { 
          text: 'Eliminar', 
          style: 'destructive',
          onPress: async () => {
            try {
              await deleteFile(video.path);
              await deleteDoc(doc(db, 'videos', video.id));
            } catch (error) {
              console.error('Error deleting video:', error);
            }
          }
        },
      ]
    );
  };

  const renderVideo = ({ item, index }: { item: VideoItem; index: number }) => (
    <VideoListItem 
      item={item} 
      isVisible={index === currentIndex}
      optionsId={videoOptionsId === item.id ? videoOptionsId : null}
      setOptionsId={setVideoOptionsId}
      setEditingVideoId={setEditingVideoId}
      setEditingCaption={setEditingCaption}
    />
  );

  const viewabilityConfig = {
    itemVisiblePercentThreshold: 50,
  };

  const handleViewabilityChange = ({ viewableItems }: any) => {
    if (viewableItems.length > 0) {
      setCurrentIndex(viewableItems[0].index);
    }
  };

  return (
    <View style={styles.container}>
      {uploading && (
        <View style={styles.loadingOverlay}>
          <ActivityIndicator size="large" color="#FF6B9D" />
          <Text style={styles.loadingText}>Subiendo video...</Text>
        </View>
      )}
      
      <View style={[styles.header, { paddingTop: 5 }]}>
        <Text style={styles.title}>Reels</Text>
      </View>
      <FlatList
        data={videos}
        renderItem={renderVideo}
        keyExtractor={(item) => item.id}
        pagingEnabled
        showsVerticalScrollIndicator={false}
        snapToInterval={height * 0.6}
        snapToAlignment="start"
        decelerationRate="fast"
        onViewableItemsChanged={handleViewabilityChange}
        viewabilityConfig={viewabilityConfig}
        ListEmptyComponent={
          <View style={styles.emptyContainer}>
            <Text style={styles.emptyText}>Sin videos aún</Text>
            <Text style={styles.emptySubtext}>Toca + para subir un video</Text>
          </View>
        }
        removeClippedSubviews={true}
        maxToRenderPerBatch={1}
        windowSize={3}
        initialNumToRender={1}
      />
      
      <TouchableOpacity style={styles.floatingButton} onPress={openActionModal}>
        <Text style={styles.floatingButtonText}>+</Text>
      </TouchableOpacity>

      <Modal
        visible={editingVideoId !== null}
        transparent
        animationType="fade"
        onRequestClose={() => setEditingVideoId(null)}
      >
        <Pressable style={styles.modalOverlay} onPress={() => setEditingVideoId(null)}>
          <Pressable style={styles.modalCard} onPress={(e) => e.stopPropagation()}>
            <Text style={styles.modalTitle}>Editar título</Text>
            <TextInput
              style={styles.editCaptionInput}
              value={editingCaption}
              onChangeText={setEditingCaption}
              placeholder="Título del video"
              placeholderTextColor="#8E8E93"
            />
            <View style={styles.editModalButtons}>
              <Pressable style={styles.cancelButton} onPress={() => setEditingVideoId(null)}>
                <Text style={styles.cancelButtonText}>Cancelar</Text>
              </Pressable>
              <Pressable
                style={styles.saveButton}
                onPress={async () => {
                  if (editingVideoId) {
                    try {
                      await updateDoc(doc(db, 'videos', editingVideoId), { caption: editingCaption });
                      setEditingVideoId(null);
                    } catch (error) {
                      console.error('Error updating caption:', error);
                    }
                  }
                }}
              >
                <Text style={styles.saveButtonText}>Guardar</Text>
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
          <Pressable style={styles.actionModalCard} onPress={(e) => e.stopPropagation()}>
            <Text style={styles.actionModalTitle}>Agregar contenido</Text>
            <Pressable style={styles.actionButton} onPress={() => handleVideoAction(pickVideo)}>
              <Text style={styles.actionButtonText}>🎬 Subir video</Text>
            </Pressable>
            <Pressable style={styles.actionButton} onPress={() => handleVideoAction(shuffleVideos)}>
              <Text style={styles.actionButtonText}>🔀 Mezclar contenido</Text>
            </Pressable>
            <Pressable style={styles.actionCancelButton} onPress={closeActionModal}>
              <Text style={styles.actionCancelText}>Cancelar</Text>
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
    backgroundColor: 'rgba(255, 245, 248, 0.95)',
  },
  header: {
    paddingBottom: 10,
    paddingHorizontal: 15,
  },
  title: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#FF6B9D',
  },
  videoContainer: {
    marginHorizontal: 12,
    marginBottom: 16,
    marginTop: 8,
    backgroundColor: '#FFFFFF',
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
    color: '#8E8E93',
  },
  emptySubtext: {
    fontSize: 14,
    color: '#8E8E93',
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
    backgroundColor: 'rgba(255,255,255,0.9)',
    alignItems: 'center',
    justifyContent: 'center',
    zIndex: 100,
  },
  loadingText: {
    marginTop: 10,
    fontSize: 16,
    color: '#FF6B9D',
  },
  videoHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 12,
    paddingVertical: 10,
    backgroundColor: '#FFFFFF',
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
    backgroundColor: '#FF6B9D',
    marginRight: 10,
  },
  userInfo: {
    justifyContent: 'center',
  },
  username: {
    fontSize: 14,
    fontWeight: 'bold',
    color: '#000000',
  },
  timeAgo: {
    fontSize: 11,
    color: '#8E8E93',
    marginTop: 1,
  },
  moreOptions: {
    fontSize: 18,
    color: '#8E8E93',
    paddingHorizontal: 4,
  },
  optionsMenuContainer: {
    position: 'absolute',
    right: 12,
    top: 50,
    backgroundColor: '#FFFFFF',
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
    color: '#FF6B9D',
  },
  optionDeleteText: {
    color: '#FF3B30',
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    justifyContent: 'center',
    alignItems: 'center',
    zIndex: 200,
  },
  modalCard: {
    width: width - 50,
    backgroundColor: '#FFFFFF',
    borderRadius: 20,
    padding: 20,
  },
  modalTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#FF6B9D',
    marginBottom: 15,
    textAlign: 'center',
  },
  editCaptionInput: {
    width: '100%',
    backgroundColor: '#F5F5F5',
    borderRadius: 12,
    padding: 15,
    fontSize: 16,
    color: '#333333',
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
    backgroundColor: 'rgba(255, 255, 255, 0.9)',
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
    color: '#666666',
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
    backgroundColor: 'rgba(255, 255, 255, 0.98)',
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
    color: '#FF6B9D',
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
    color: '#666666',
  },
});