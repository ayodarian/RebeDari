import { View, Text, StyleSheet, FlatList, Dimensions, TouchableOpacity, ActivityIndicator, Alert, Pressable, TextInput, Modal } from 'react-native';
import { useState, useEffect, useRef } from 'react';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { VideoPlayer, useVideoPlayer, VideoView } from 'expo-video';
import * as ImagePicker from 'expo-image-picker';
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
  
  useEffect(() => {
    if (isVisible) {
      player.loop = true;
      player.play();
    } else {
      player.pause();
    }
  }, [isVisible, player]);

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
        <VideoView
          player={player}
          style={styles.videoPlayer}
          resizeMode="cover"
          isLooping
          shouldPlay
        />
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
      allowsEditing: true,
      quality: ImagePicker.UIImagePickerControllerQualityType.Low,
      videoMaxDuration: 60,
    });

    if (!result.canceled && result.assets[0]) {
      setUploading(true);
      const tempUri = result.assets[0].uri;
      
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

  const deleteVideo = async (video: VideoItem) => {
    alert(
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
      
      <TouchableOpacity style={styles.floatingButton} onPress={pickVideo}>
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
  videoPlayer: {
    width: '100%',
    aspectRatio: 1,
  },
  videoPlaceholder: {
    width: '100%',
    aspectRatio: 1,
    backgroundColor: '#1A1A1A',
    alignItems: 'center',
    justifyContent: 'center',
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
});