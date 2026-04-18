import { View, Text, StyleSheet, FlatList, Pressable, ScrollView, Modal, Alert, Dimensions } from 'react-native';
import { useState } from 'react';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

const { width } = Dimensions.get('window');

interface Photo {
  id: string;
  url: string;
  caption: string;
  created_at: string;
}

type ModalType = 'capsula' | 'abrlo' | 'bitacora' | null;

const TRIPS = [
  { date: '15/08/2024', place: 'Playa del Carmen', desc: 'Atardecer en el mar' },
  { date: '22/10/2024', place: 'CDMX', desc: 'Cita en el Centro' },
  { date: '05/01/2025', place: 'Monterrey', desc: 'Noche de pizzas' },
];

export default function FeedScreen() {
  const insets = useSafeAreaInsets();
  const [photos] = useState<Photo[]>([
    { id: '1', url: '', caption: 'Fotos de ustedes', created_at: new Date().toISOString() },
    { id: '2', url: '', caption: 'Más fotos', created_at: new Date().toISOString() },
  ]);
  
  const [modalVisible, setModalVisible] = useState(false);
  const [modalType, setModalType] = useState<ModalType>(null);

  const openModal = (type: ModalType) => {
    setModalType(type);
    setModalVisible(true);
  };

  const closeModal = () => {
    setModalVisible(false);
    setModalType(null);
  };

  const showCartaMensaje = (carta: string) => {
    const mensajes: Record<string, string> = {
      '...estés triste': 'Mi amor, recuerda que siempre estaré aquí para ti. Te quiero ❤️',
      '...no puedas dormir': 'Cuenta conmigo,杯奶茶 o una película. Todo pasará 💕',
      '...estés enoja': 'Respira profundo. Te quiero mucho, lo nuestro vale más que cualquiereno 💗',
      '...me extrañes': 'También te extraño cada segundo. Pronto nos vemos 😘',
    };
    Alert.alert('Para ti 💕', mensajes[carta]);
  };

  const CardButton = ({ title, onPress }: { title: string; onPress: () => void }) => (
    <Pressable style={styles.cardButton} onPress={onPress}>
      <Text style={styles.cardButtonText}>{title}</Text>
    </Pressable>
  );

  const renderModalContent = () => {
    if (modalType === 'capsula') {
      return (
        <View style={styles.modalContent}>
          <Text style={styles.modalIcon}>🔒</Text>
          <Text style={styles.modalTitle}>Se abre en nuestro Aniversario</Text>
          <Text style={styles.counterText}>Faltan: 238 días, 14 horas</Text>
        </View>
      );
    }
    
    if (modalType === 'abrlo') {
      return (
        <View style={styles.modalContent}>
          <Text style={styles.modalTitle}>Cartas de Emergencia</Text>
          <Pressable style={styles.cartaButton} onPress={() => showCartaMensaje('...estés triste')}>
            <Text style={styles.cartaButtonText}>...estés triste</Text>
          </Pressable>
          <Pressable style={styles.cartaButton} onPress={() => showCartaMensaje('...no puedas dormir')}>
            <Text style={styles.cartaButtonText}>...no puedas dormir</Text>
          </Pressable>
          <Pressable style={styles.cartaButton} onPress={() => showCartaMensaje('...estés enojada')}>
            <Text style={styles.cartaButtonText}>...estés enojada</Text>
          </Pressable>
          <Pressable style={styles.cartaButton} onPress={() => showCartaMensaje('...me extrañes')}>
            <Text style={styles.cartaButtonText}>...me extrañes</Text>
          </Pressable>
        </View>
      );
    }
    
    if (modalType === 'bitacora') {
      return (
        <View style={styles.modalContent}>
          <Text style={styles.modalTitle}>Bitácora</Text>
          {TRIPS.map((trip, index) => (
            <View key={index} style={styles.tripItem}>
              <Text style={styles.tripDate}>{trip.date}</Text>
              <Text style={styles.tripPlace}>{trip.place}</Text>
              <Text style={styles.tripDesc}>{trip.desc}</Text>
            </View>
          ))}
        </View>
      );
    }
    
    return null;
  };

  const renderPhoto = ({ item }: { item: Photo }) => (
    <View style={styles.photoContainer}>
      <View style={styles.photoHeader}>
        <View style={styles.avatar} />
        <Text style={styles.username}>RebeDari</Text>
      </View>
      <View style={styles.photoPlaceholder}>
        <Text style={styles.placeholderText}>📷</Text>
        <Text style={styles.placeholderSubtext}>Tu foto aquí</Text>
      </View>
      <View style={styles.photoFooter}>
        <Text style={styles.caption}>{item.caption}</Text>
      </View>
    </View>
  );

  return (
    <View style={[styles.container, { paddingTop: insets.top }]}>
      <View style={styles.header}>
        <Text style={styles.title}>RebeDari</Text>
      </View>

      <ScrollView 
        horizontal 
        showsHorizontalScrollIndicator={false}
        style={styles.panelScroll}
        contentContainerStyle={styles.panelContent}
      >
        <CardButton title="1. Cápsula del Tiempo" onPress={() => openModal('capsula')} />
        <CardButton title="2. Ábrelo cuando..." onPress={() => openModal('abrlo')} />
        <CardButton title="3. Bitácora" onPress={() => openModal('bitacora')} />
      </ScrollView>

      <FlatList
        data={photos}
        renderItem={renderPhoto}
        keyExtractor={(item) => item.id}
        showsVerticalScrollIndicator={false}
        contentContainerStyle={styles.feedContent}
      />

      <Modal
        visible={modalVisible}
        transparent
        animationType="fade"
        onRequestClose={closeModal}
      >
        <Pressable style={styles.modalOverlay} onPress={closeModal}>
          <Pressable style={styles.modalCard} onPress={(e) => e.stopPropagation()}>
            {renderModalContent()}
            <Pressable style={styles.closeButton} onPress={closeModal}>
              <Text style={styles.closeButtonText}>Cerrar</Text>
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
    paddingBottom: 15,
    paddingHorizontal: 15,
  },
  title: {
    fontSize: 28,
    fontWeight: 'bold',
    color: '#FF6B9D',
  },
  panelScroll: {
    maxHeight: 100,
    marginBottom: 10,
  },
  panelContent: {
    paddingHorizontal: 15,
    gap: 12,
    paddingVertical: 10,
  },
  cardButton: {
    width: 160,
    paddingVertical: 15,
    paddingHorizontal: 20,
    backgroundColor: 'rgba(255, 182, 193, 0.4)',
    borderRadius: 15,
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.5)',
    flexShrink: 0,
  },
  cardButtonText: {
    fontSize: 13,
    fontWeight: '600',
    color: '#333333',
    textAlign: 'center',
  },
  feedContent: {
    paddingBottom: 110,
  },
  photoContainer: {
    marginBottom: 15,
    backgroundColor: '#FFFFFF',
  },
  photoHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 15,
    paddingVertical: 10,
  },
  avatar: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: '#FF6B9D',
    marginRight: 10,
  },
  username: {
    fontSize: 14,
    fontWeight: '600',
    color: '#000000',
  },
  photoPlaceholder: {
    width: width,
    height: width,
    backgroundColor: '#F5F5F5',
    alignItems: 'center',
    justifyContent: 'center',
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
  photoFooter: {
    paddingHorizontal: 15,
    paddingVertical: 10,
  },
  caption: {
    fontSize: 14,
    color: '#000000',
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  modalCard: {
    width: width - 50,
    backgroundColor: 'rgba(255, 255, 255, 0.95)',
    borderRadius: 25,
    padding: 25,
    alignItems: 'center',
  },
  modalContent: {
    alignItems: 'center',
    width: '100%',
  },
  modalIcon: {
    fontSize: 40,
    marginBottom: 10,
  },
  modalTitle: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#FF6B9D',
    marginBottom: 20,
    textAlign: 'center',
  },
  counterText: {
    fontSize: 28,
    fontWeight: 'bold',
    color: '#333333',
  },
  cartaButton: {
    width: '100%',
    paddingVertical: 14,
    paddingHorizontal: 20,
    backgroundColor: 'rgba(255, 182, 193, 0.3)',
    borderRadius: 12,
    marginBottom: 10,
  },
  cartaButtonText: {
    fontSize: 15,
    color: '#333333',
    textAlign: 'center',
  },
  tripItem: {
    width: '100%',
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: 'rgba(0,0,0,0.1)',
  },
  tripDate: {
    fontSize: 12,
    color: '#FF6B9D',
    fontWeight: 'bold',
  },
  tripPlace: {
    fontSize: 16,
    fontWeight: '600',
    color: '#333333',
  },
  tripDesc: {
    fontSize: 14,
    color: '#666666',
  },
  closeButton: {
    marginTop: 20,
    paddingVertical: 12,
    paddingHorizontal: 40,
    backgroundColor: '#FF6B9D',
    borderRadius: 20,
  },
  closeButtonText: {
    color: '#FFFFFF',
    fontSize: 16,
    fontWeight: '600',
  },
});