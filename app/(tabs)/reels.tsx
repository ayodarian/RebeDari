import { View, Text, StyleSheet, FlatList, Dimensions } from 'react-native';
import { useState, useEffect } from 'react';

const { width, height } = Dimensions.get('window');

interface Video {
  id: string;
  url: string;
  caption: string;
  created_at: string;
}

export default function ReelsScreen() {
  const [videos, setVideos] = useState<Video[]>([]);
  const [currentIndex, setCurrentIndex] = useState(0);

  useEffect(() => {
    setVideos([
      { id: '1', url: '', caption: 'Videos de ustedes', created_at: new Date().toISOString() },
      { id: '2', url: '', caption: 'Más videos', created_at: new Date().toISOString() },
    ]);
  }, []);

  const renderVideo = ({ item, index }: { item: Video; index: number }) => (
    <View style={styles.videoContainer}>
      <View style={styles.videoPlaceholder}>
        <Text style={styles.placeholderText}>🎬</Text>
        <Text style={styles.placeholderSubtext}>Video {index + 1}</Text>
      </View>
      <View style={styles.videoOverlay}>
        <Text style={styles.caption}>{item.caption}</Text>
      </View>
    </View>
  );

  const viewabilityConfig = {
    itemVisiblePercentThreshold: 50,
  };

  return (
    <View style={styles.container}>
      <View style={styles.header}>
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
        onViewableItemsChanged={({ viewableItems }: any) => {
          if (viewableItems.length > 0) {
            setCurrentIndex(viewableItems[0].index);
          }
        }}
        viewabilityConfig={viewabilityConfig}
        ListEmptyComponent={
          <View style={styles.emptyContainer}>
            <Text style={styles.emptyText}>Sin videos todavía</Text>
            <Text style={styles.emptySubtext}>Subí el primer video</Text>
          </View>
        }
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: 'rgba(255, 245, 248, 0.95)',
  },
  header: {
    paddingTop: 5,
    paddingBottom: 15,
    paddingHorizontal: 15,
  },
  title: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#FF6B9D',
  },
  videoContainer: {
    width: width,
    height: height * 0.55,
    justifyContent: 'center',
  },
  videoPlaceholder: {
    width: width - 30,
    height: width - 30,
    backgroundColor: '#1A1A1A',
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: 15,
    marginHorizontal: 15,
  },
  placeholderText: {
    fontSize: 60,
    opacity: 0.3,
  },
  placeholderSubtext: {
    fontSize: 14,
    color: '#8E8E93',
    marginTop: 10,
  },
  videoOverlay: {
    position: 'absolute',
    bottom: 80,
    left: 15,
  },
  caption: {
    fontSize: 14,
    color: '#FFFFFF',
    fontWeight: '500',
  },
  emptyContainer: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingTop: 100,
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
});