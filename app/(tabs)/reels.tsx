import { View, Text, StyleSheet, FlatList, Dimensions, TouchableOpacity, ActivityIndicator, Alert, Pressable } from 'react-native';
import { useState, useEffect, useRef } from 'react';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { VideoPlayer, useVideoPlayer, VideoView } from 'expo-video';
import * as ImagePicker from 'expo-image-picker';
import { collection, addDoc, onSnapshot, deleteDoc, doc, query, orderBy } from 'firebase/firestore';
import { db, uploadFile, deleteFile } from '../../lib/firebase';

const { width, height } = Dimensions.get('window');

interface VideoItem {
  id: string;
  url: string;
  path: string;
  caption: string;
  created_at: string;
}

function VideoListItem({ item, isVisible }: { item: VideoItem; isVisible: boolean }) {
  const player = useVideoPlayer(item.url);
  
  useEffect(() => {
    if (isVisible) {
      player.loop = true;
      player.play();
    } else {
      player.pause();
    }
  }, [isVisible, player]);
  
  return (
    <Pressable 
      style={styles.videoContainer}
      onLongPress={() => {
        Alert.alert(
          '¿Eliminar archivo?',
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
              }
            },
          ]
        );
      }}
    >
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
        <Text style={styles.caption}>{item.caption || 'Videos de ustedes'}</Text>
      </View>
    </Pressable>
  );
}

export default function ReelsScreen() {
  const insets = useSafeAreaInsets();
  const [videos, setVideos] = useState<VideoItem[]>([]);
  const [uploading, setUploading] = useState(false);
  const [currentIndex, setCurrentIndex] = useState(0);
  const videoRef = useRef<VideoView>(null);

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
          caption: '',
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
    width: width,
    height: height * 0.6,
    justifyContent: 'center',
    alignItems: 'center',
  },
  videoPlayer: {
    width: width,
    height: height * 0.55,
  },
  videoPlaceholder: {
    width: width - 30,
    height: height * 0.5,
    backgroundColor: '#1A1A1A',
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: 15,
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
    bottom: 130,
    width: 60,
    height: 60,
    borderRadius: 30,
    backgroundColor: '#FF6B9D',
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.25,
    shadowRadius: 4,
    elevation: 5,
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
});