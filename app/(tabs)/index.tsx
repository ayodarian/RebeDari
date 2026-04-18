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

// Fecha de inicio de novios: 22 de enero de 2024 a las 18:35
const START_DATE = new Date(2024, 0, 22, 18, 35, 0);
// Fecha objetivo cápsula: 22 de enero de 2027 a las 00:00
const TARGET_CAPSULA = new Date(2027, 0, 22, 0, 0, 0);

// 4 listas × 15 mensajes cada una
const MENSAJES: Record<string, string[]> = {
  triste: Array.from({ length: 15 }, (_, i) => `Mensaje triste ${i + 1}`),
  dormir: Array.from({ length: 15 }, (_, i) => `Mensaje ${i + 1}`),
  enojada: Array.from({ length: 15 }, (_, i) => `Mensaje ${i + 1}`),
  extranes: Array.from({ length: 15 }, (_, i) => `Mensaje ${i + 1}`),
};

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

function formatTimeDifference(time: { years: number; months: number; days: number; hours: number; minutes: number; seconds: number }): string {
  const parts = [];
  if (time.years > 0) parts.push(`${time.years} año${time.years > 1 ? 's' : ''}`);
  if (time.months > 0) parts.push(`${time.months} mes${time.months > 1 ? 'es' : ''}`);
  if (time.days > 0) parts.push(`${time.days} día${time.days > 1 ? 's' : ''}`);
  if (time.hours > 0) parts.push(`${time.hours} hora${time.hours > 1 ? 's' : ''}`);
  if (time.minutes > 0) parts.push(`${time.minutes} minuto${time.minutes > 1 ? 's' : ''}`);
  parts.push(`${time.seconds} segundo${time.seconds !== 1 ? 's' : ''}`);
  return parts.join(', ');
}

export default function FeedScreen() {
  const insets = useSafeAreaInsets();
  const [photos] = useState<Photo[]>([
    { id: '1', url: '', caption: 'Fotos de ustedes', created_at: new Date().toISOString() },
    { id: '2', url: '', caption: 'Más fotos', created_at: new Date().toISOString() },
  ]);
  
  const [modalVisible, setModalVisible] = useState(false);
  const [modalType, setModalType] = useState<ModalType>(null);
  
  // Estados para contadores en tiempo real
  const [timeTogether, setTimeTogether] = useState('');
  const [countdown, setCountdown] = useState('');
  
  // Estados bitácora
  const [trips, setTrips] = useState<Trip[]>([
    { id: '1', date: '15/08/2024', place: 'Playa del Carmen', desc: 'Atardecer en el mar' },
    { id: '2', date: '22/10/2024', place: 'CDMX', desc: 'Cita en el Centro' },
    { id: '3', date: '05/01/2025', place: 'Monterrey', desc: 'Noche de pizzas' },
  ]);
  const [newTrip, setNewTrip] = useState({ date: '', place: '', desc: '' });

  // Efecto para contadores en tiempo real
  useEffect(() => {
    const updateCounters = () => {
      const now = new Date();
      
      // Tiempo juntos (desde 22/01/2024 18:35)
      const timeDiff = calculateTimeDiff(START_DATE, now);
      setTimeTogether(formatTimeDifference(timeDiff));
      
      // Cuenta regresiva cápsula (hasta 22/01/2027)
      if (now < TARGET_CAPSULA) {
        const targetDiff = calculateTimeDiff(now, TARGET_CAPSULA);
        const targetStr = [];
        if (targetDiff.years > 0) targetStr.push(`${targetDiff.years} año${targetDiff.years > 1 ? 's' : ''}`);
        if (targetDiff.months > 0) targetStr.push(`${targetDiff.months} mes${targetDiff.months > 1 ? 'es' : ''}`);
        if (targetDiff.days > 0) targetStr.push(`${targetDiff.days} día${targetDiff.days > 1 ? 's' : ''}`);
        if (targetStr.length === 0 || targetDiff.hours > 0) targetStr.push(`${targetDiff.hours} hora${targetDiff.hours > 1 ? 's' : ''}`);
        if (targetStr.length === 0 || targetDiff.minutes > 0) targetStr.push(`${targetDiff.minutes} minuto${targetDiff.minutes > 1 ? 's' : ''}`);
        targetStr.push(`${targetDiff.seconds} segundo${targetDiff.seconds !== 1 ? 's' : ''}`);
        setCountdown(`Faltan: ${targetStr.join(', ')}`);
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
    const mensajes = MENSAJES[categoria];
    const randomIndex = Math.floor(Math.random() * mensajes.length);
    const mensajeAleatorio = mensajes[randomIndex];
    Alert.alert('Para ti 💕', mensajeAleatorio);
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
          <Pressable style={styles.cartaButton} onPress={() => showCartaMensaje('dormir')}>
            <Text style={styles.cartaButtonText}>...no puedas dormir</Text>
          </Pressable>
          <Pressable style={styles.cartaButton} onPress={() => showCartaMensaje('enojada')}>
            <Text style={styles.cartaButtonText}>...estés enojada</Text>
          </Pressable>
          <Pressable style={styles.cartaButton} onPress={() => showCartaMensaje('extranes')}>
            <Text style={styles.cartaButtonText}>...me extrañes</Text>
          </Pressable>
        </View>
      );
    }
    
    if (modalType === 'bitacora') {
      return (
        <View style={styles.modalContent}>
          <Text style={styles.modalTitle}>Bitácora</Text>
          
          {/* Formulario para agregar */}
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
          
          {/* Lista de aventuras */}
          <ScrollView style={styles.tripsList}>
            {trips.map((trip) => (
              <View key={trip.id} style={styles.tripItem}>
                <Text style={styles.tripDate}>{trip.date}</Text>
                <Text style={styles.tripPlace}>{trip.place}</Text>
                <Text style={styles.tripDesc}>{trip.desc}</Text>
              </View>
            ))}
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
    <View style={[styles.container, { paddingTop: insets.top }]}>
      <View style={styles.header}>
        <Text style={styles.title}>RebeDari</Text>
        <Text style={styles.timeCounter}>❤️ {timeTogether}</Text>
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
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  title: {
    fontSize: 28,
    fontWeight: 'bold',
    color: '#FF6B9D',
  },
  timeCounter: {
    fontSize: 10,
    color: '#666666',
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