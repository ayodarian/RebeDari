import { View, Text, StyleSheet, FlatList, Pressable, ScrollView, Modal, Alert, Dimensions, TextInput } from 'react-native';
import { useState, useEffect } from 'react';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

const { width } = Dimensions.get('window');

interface Photo {
  id: string;
  url: string;
  caption: string;
  created_at: string;
}

interface Trip {
  id: string;
  date: string;
  place: string;
  desc: string;
}

type ModalType = 'capsula' | 'abrlo' | 'bitacora' | null;


const mensajesTriste = Array.from({ length: 15 }, (_, i) => `Mensaje Personalizado ${i + 1}`);
const mensajesSueno = Array.from({ length: 15 }, (_, i) => `Mensaje Personalizado ${i + 1}`);
const mensajesEnojada = Array.from({ length: 15 }, (_, i) => `Mensaje Personalizado ${i + 1}`);
const mensajesExtrano = Array.from({ length: 15 }, (_, i) => `Mensaje Personalizado ${i + 1}`);

function calculateTimeDiff(start: Date, end: Date): { years: number; months: number; days: number; hours: number; minutes: number; seconds: number } {
  let years = end.getFullYear() - start.getFullYear();
  let months = end.getMonth() - start.getMonth();
  let days = end.getDate() - start.getDate();
  let hours = end.getHours() - start.getHours();
  let minutes = end.getMinutes() - start.getMinutes();
  let seconds = end.getSeconds() - start.getSeconds();

  if (seconds < 0) { seconds += 60; minutes--; }
  if (minutes < 0) { minutes += 60; hours--; }
  if (hours < 0) { hours += 24; days--; }
  if (days < 0) { 
    const prevMonth = new Date(end.getFullYear(), end.getMonth(), 0);
    days += prevMonth.getDate(); months--; 
  }
  if (months < 0) { months += 12; years--; }

  return { years: Math.abs(years), months: Math.abs(months), days: Math.abs(days), hours: Math.abs(hours), minutes: Math.abs(minutes), seconds: Math.abs(seconds) };
}

const getMensajeAleatorio = (categoria: string): string => {
  let mensajes: string[] = [];
  switch (categoria) {
    case 'triste': mensajes = mensajesTriste; break;
    case 'sueno': mensajes = mensajesSueno; break;
    case 'enojada': mensajes = mensajesEnojada; break;
    case 'extrano': mensajes = mensajesExtrano; break;
  }
  const indice = Math.floor(Math.random() * 15);
  return mensajes[indice];
};

export default function FeedScreen() {
  const insets = useSafeAreaInsets();
  const [photos] = useState<Photo[]>([
    { id: '1', url: '', caption: 'Fotos de ustedes', created_at: new Date().toISOString() },
    { id: '2', url: '', caption: 'Más fotos', created_at: new Date().toISOString() },
  ]);
  
  const [modalVisible, setModalVisible] = useState(false);
  const [modalType, setModalType] = useState<ModalType>(null);
  
  const [countdown, setCountdown] = useState('');
  
  const [trips, setTrips] = useState<Trip[]>([]);
  const [newTrip, setNewTrip] = useState({ date: '', place: '', desc: '' });

  useEffect(() => {
    const TARGET_CAPSULA = new Date(2027, 0, 22, 0, 0, 0);
    
    const updateCounters = () => {
      const now = new Date();
      
      if (now < TARGET_CAPSULA) {
        const targetDiff = calculateTimeDiff(now, TARGET_CAPSULA);
        const targetParts: string[] = [];
        if (targetDiff.years > 0) targetParts.push(`${targetDiff.years} año${targetDiff.years > 1 ? 's' : ''}`);
        if (targetDiff.months > 0) targetParts.push(`${targetDiff.months} mes${targetDiff.months > 1 ? 'es' : ''}`);
        if (targetDiff.days > 0) targetParts.push(`${targetDiff.days} día${targetDiff.days > 1 ? 's' : ''}`);
        if (targetParts.length === 0 || targetDiff.hours > 0) targetParts.push(`${targetDiff.hours} hora${targetDiff.hours > 1 ? 's' : ''}`);
        if (targetParts.length === 0 || targetDiff.minutes > 0) targetParts.push(`${targetDiff.minutes} minuto${targetDiff.minutes > 1 ? 's' : ''}`);
        targetParts.push(`${targetDiff.seconds} segundo${targetDiff.seconds !== 1 ? 's' : ''}`);
        setCountdown(`Faltan: ${targetParts.join(', ')}`);
      } else {
        setCountdown('¡Ya se puede abrir! 🎉');
      }
    };
    
    updateCounters();
    const interval = setInterval(updateCounters, 1000);
    return () => clearInterval(interval);
  }, []);

  const openModal = (type: ModalType) => {
    setModalType(type);
    setModalVisible(true);
  };

  const closeModal = () => {
    setModalVisible(false);
    setModalType(null);
  };

  const showCartaMensaje = (categoria: string) => {
    const mensaje = getMensajeAleatorio(categoria);
    Alert.alert('Para ti 💕', mensaje);
  };

  const agregarTrip = () => {
    if (!newTrip.date || !newTrip.place || !newTrip.desc) {
      Alert.alert('Error', 'Por favor completa todos los campos');
      return;
    }
    const trip: Trip = {
      id: Date.now().toString(),
      date: newTrip.date,
      place: newTrip.place,
      desc: newTrip.desc,
    };
    setTrips([trip, ...trips]);
    setNewTrip({ date: '', place: '', desc: '' });
  };

  const eliminarTrip = (id: string) => {
    Alert.alert(
      'Eliminar Aventura',
      '¿Estás seguro de eliminar esta aventura?',
      [
        { text: 'Cancelar', style: 'cancel' },
        { text: 'Eliminar', style: 'destructive', onPress: () => setTrips(trips.filter(t => t.id !== id)) },
      ]
    );
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
          <Text style={styles.counterText}>{countdown}</Text>
          <View style={styles.mensajeSecretoBox}>
            <Text style={styles.mensajeSecretoLabel}>Mensaje Secreto:</Text>
            <Text style={styles.mensajeSecretoText}>**********</Text>
            <Text style={styles.mensajeSecretoHint}>(Se revelará el 22/01/2027)</Text>
          </View>
        </View>
      );
    }
    
    if (modalType === 'abrlo') {
      return (
        <View style={styles.modalContent}>
          <Text style={styles.modalTitle}>Cartas de Emergencia</Text>
          <Pressable style={styles.cartaButton} onPress={() => showCartaMensaje('triste')}>
            <Text style={styles.cartaButtonText}>...estés triste</Text>
          </Pressable>
          <Pressable style={styles.cartaButton} onPress={() => showCartaMensaje('sueno')}>
            <Text style={styles.cartaButtonText}>...no puedas dormir</Text>
          </Pressable>
          <Pressable style={styles.cartaButton} onPress={() => showCartaMensaje('enojada')}>
            <Text style={styles.cartaButtonText}>...estés enojada</Text>
          </Pressable>
          <Pressable style={styles.cartaButton} onPress={() => showCartaMensaje('extrano')}>
            <Text style={styles.cartaButtonText}>...me extrañes</Text>
          </Pressable>
        </View>
      );
    }
    
    if (modalType === 'bitacora') {
      return (
        <View style={styles.modalContent}>
          <Text style={styles.modalTitle}>Bitácora</Text>
          
          <View style={styles.formContainer}>
            <TextInput
              style={styles.input}
              placeholder="Fecha (dd/mm/aaaa)"
              placeholderTextColor="#8E8E93"
              value={newTrip.date}
              onChangeText={(text) => setNewTrip({ ...newTrip, date: text })}
            />
            <TextInput
              style={styles.input}
              placeholder="Lugar"
              placeholderTextColor="#8E8E93"
              value={newTrip.place}
              onChangeText={(text) => setNewTrip({ ...newTrip, place: text })}
            />
            <TextInput
              style={[styles.input, styles.inputMultiline]}
              placeholder="Descripción"
              placeholderTextColor="#8E8E93"
              value={newTrip.desc}
              onChangeText={(text) => setNewTrip({ ...newTrip, desc: text })}
              multiline
            />
            <Pressable style={styles.agregarButton} onPress={agregarTrip}>
              <Text style={styles.agregarButtonText}>Agregar Aventura</Text>
            </Pressable>
          </View>
          
          <ScrollView style={styles.tripsList}>
            {trips.length === 0 ? (
              <Text style={styles.sinAventuras}>Sin aventuras registradas</Text>
            ) : (
              trips.map((trip) => (
                <View key={trip.id} style={styles.tripItem}>
                  <View style={styles.tripInfo}>
                    <Text style={styles.tripDate}>{trip.date}</Text>
                    <Text style={styles.tripPlace}>{trip.place}</Text>
                    <Text style={styles.tripDesc}>{trip.desc}</Text>
                  </View>
                  <Pressable style={styles.eliminarButton} onPress={() => eliminarTrip(trip.id)}>
                    <Text style={styles.eliminarButtonText}>🗑️</Text>
                  </Pressable>
                </View>
              ))
            )}
          </ScrollView>
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
    <View style={styles.container}>
      <ScrollView 
        horizontal 
        showsHorizontalScrollIndicator={false}
        style={styles.panelScroll}
        contentContainerStyle={styles.panelContent}
      >
        <CardButton title="1. Cápsula del\ntiempo" onPress={() => openModal('capsula')} />
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
  timeContainer: {
    marginTop: 8,
  },
  timeCounter: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#333333',
    lineHeight: 22,
  },
  panelScroll: {
    maxHeight: 70,
    marginBottom: 5,
  },
  panelContent: {
    paddingHorizontal: 15,
    gap: 10,
    paddingVertical: 5,
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
    maxHeight: '70%',
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
    fontSize: 14,
    fontWeight: '600',
    color: '#333333',
    textAlign: 'center',
    marginBottom: 20,
  },
  mensajeSecretoBox: {
    width: '100%',
    padding: 15,
    backgroundColor: 'rgba(255, 182, 193, 0.2)',
    borderRadius: 12,
    alignItems: 'center',
  },
  mensajeSecretoLabel: {
    fontSize: 12,
    color: '#666666',
    marginBottom: 5,
  },
  mensajeSecretoText: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#333333',
    letterSpacing: 3,
  },
  mensajeSecretoHint: {
    fontSize: 10,
    color: '#8E8E93',
    marginTop: 5,
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
  formContainer: {
    width: '100%',
    marginBottom: 15,
  },
  input: {
    width: '100%',
    backgroundColor: 'rgba(255, 255, 255, 0.8)',
    borderRadius: 10,
    paddingHorizontal: 15,
    paddingVertical: 12,
    fontSize: 14,
    marginBottom: 10,
    borderWidth: 1,
    borderColor: 'rgba(255, 107, 157, 0.3)',
  },
  inputMultiline: {
    minHeight: 60,
    textAlignVertical: 'top',
  },
  agregarButton: {
    width: '100%',
    paddingVertical: 14,
    backgroundColor: '#FF6B9D',
    borderRadius: 10,
    alignItems: 'center',
    marginTop: 5,
  },
  agregarButtonText: {
    color: '#FFFFFF',
    fontSize: 14,
    fontWeight: 'bold',
  },
  tripsList: {
    width: '100%',
    maxHeight: 200,
  },
  sinAventuras: {
    textAlign: 'center',
    color: '#8E8E93',
    fontSize: 14,
    paddingVertical: 20,
  },
  tripItem: {
    flexDirection: 'row',
    alignItems: 'center',
    width: '100%',
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: 'rgba(0,0,0,0.1)',
  },
  tripInfo: {
    flex: 1,
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
  eliminarButton: {
    padding: 8,
  },
  eliminarButtonText: {
    fontSize: 18,
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