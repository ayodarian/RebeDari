import { View, Text, StyleSheet, FlatList, Pressable, ScrollView, Modal, Alert, Dimensions, TextInput, Image, ActivityIndicator, TouchableOpacity } from 'react-native';
import { useState, useEffect, useCallback } from 'react';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import * as ImagePicker from 'expo-image-picker';
import { collection, addDoc, onSnapshot, deleteDoc, doc, query, orderBy, updateDoc, getDocs, limit, startAfter } from 'firebase/firestore';
import { db, uploadFile, deleteFile } from '../../lib/firebase';

const { width } = Dimensions.get('window');

interface Photo {
  id: string;
  url: string;
  path?: string;
  caption: string;
  created_at: string;
}

interface Trip {
  id: string;
  date: string;
  place: string;
  desc: string;
  imageUrl?: string;
  imagePath?: string;
}

type ModalType = 'capsula' | 'abrlo' | 'bitacora' | null;


const mensajesTriste = [
  "Hola mi amorcito, hoy capaz te fue mal o simplemente tuviste un bajom, pero recuerda que es completamente normal estos dias mi corazon de melon, no olvides que dariancito te ama con todo su corazon.",
  "Animo mi cielo, la vida se pone pesada en varias situaciones pero nuestra fuerza es lo que nos hace salir adelante, si un dia no puedes tu sola recuerda que siempre me tendras a mi, tu novio que te ama con todo el corazon.",
  "Llorar esta bien, no tienes que guardartelo todo amor, tampoco tienes que ser fuerte siempre, yo aqui estoy para ayudarte y sostenerte. Te amo con toda mi alma.",
  "Mi amors, eres la persona mas capaz y fuerte que conozco, este mal rato no define quien eres, Te amo con toda mi vida.",
  "Amor, cierra los ojos, ahora imagina que te estoy abrazando fuerte fuerte, este abrazo te lo doy cuando nos veamos, te lo prometo.",
  "Todo pasa por algo amor, este sentimiento no es para siempre, te sentiras mejor progresivamente y yo sere testigo de tu fortaleza.",
  "Te amo, asi de simple y asi de fuerte, no dejes que una mala racha te haga olvidar este sentimiento tan bonito que tenemos mutuamente los dos.",
  "No necesitas decir nada en caso de que no quieras, pero si necesitas desahogarte solo llamame. Prometo escucharte y acompañarte en todo lo que necesites amorcito.",
  "Me duele saber que estas pasando por un mal momento, pero te prometo que no es para siempre, te prometo ser felices por siepre mi amors.",
  "Haz librado batallas mas fuertes que esta, eres mucho mas valiente y fuerte de lo que crees, animo mi cielo que yo estoy para ti en todo lo que necesites.",
  "Intenta poner tu musica favorita, relajate amor, la musica muchas veces nos salva y nos hace sentir mucho muchote mejor.",
  "Piensa en nuestro proximo plan juntos, ya falta poco para vernos y no puedo esperar a sacarte una sonrisa de esa boca que tanto amo.",
  "Tomate un tiempo para ti amor, muchas veces el cuerpo solo necesita descansar y dejar de pensar un rato. Te amo rebequita linda.",
  "Eres mi prioridad en todo momento amor, no dudes en hablarme si sientes que todo se te viene abajo por que yo aqui estare para sostenerte la veces que hagan falta",
  "La vida es el mejor regalo que nos pudieron  haber hecho, disfrutala, este mal momento no tiene que ser para siempre ni para nunca, es parte de estar vivo sentir emociones que aonq sean feas para algo sirven. Te amo corazon"
];

const mensajesSueno = [
  "Amorcito, suelta el celular porque nomas te quemas los ojos, mañana te espera un dia increible y tienes que estar bien descansada para ir con todo el animo. Besitos, dulces sueños.",
  "Si de plano no tienes sueño o tu cabecita no para de dar vueltas, marcame, no importa la hora que sea yo estare ahi para ti.",
  "No olvides la musica amor, es el mejor metodo para dormir en paz y tranquila. Te deseo, buenas noches.",
  "Solo cierra los ojos bobissss,jijijijiji. TAMOOOOOOOOOO",
  "Eres la mujer mas amada por mi, daria todo por ti, por verte feliz y por verte crecer personalmente. Te amo con todo mi corazon, BESITOS TAMOOOOOOOO.",
  "Te aseguro que cualquier estres o preocupacion va a ser menos pesada mañana. Ahorita toca apagar tu cerebro y a momir.",
  "Intenta esto mi vida: respira profundo. inhala 4 segundos, aguantalo, y suelta el aire despacito. La respiracion es un paso fundamental a la hora de dormir. TAMO.",
  "Seguramente estoy en mi quinto sueño en este momento pero te aseguro que hasta mis sueños mas profundos tienen marcado tu nombre y apellido. Hermosa.",
  "Te acuerdas tu ultimo momento feliz conmigo?, quedate con eso amor y duerme con ese sentimiento para que sea una noche increible. TAMOOOOOO.",
  "Mañana va a ser un buen dia, solo que necesitas recargar energia bb, a dormir ser ha dicho.",
  "Si sientes que no puedes dejar de sobrepensar solo dimelo amor, yo no me voy a cansar de sobre explicar. ",
  "Mande a mi angelito de la guarda a cuidarte para que puedas dormir en paz y sin nada atormentandote esta noche. Dulces sueños amor",
  "Si nomas sigues dandote vueltas en la cama trata de tomar agua. Ñam ñam que rico un vasito de agua bien frio. TAMOOOOOO",
  "Te dejo este mensaje para que sea lo que leas antes de dormir. Te amo como no te haces una idea y te deseo con mas intensidad de la que vivo, eres mi vida entera y la mujer de mis sueños. Te amo rebequita hermosa.",
  "La que no se duerma es gay. JASKJASKJASKJSAKAS"
];

const mensajesEnojada = [
  "Si estas leyendo esto, seguro la regue o estemos en un mal momento. Tienes derecho de estar enojada. Solo quiero decirte que te amo y vamos a arreglarlo.",  
  "No me gusta nada que estemos peleados. Tomate tu espacio, respira y cuando estes lista marcame para solucionarlo. Eres lo más importante para mi mi corazon de melon.",
  "Perdoname si hice algo que te lastimo, quiero hacer las cosas bien contigo y soy un menso por hacerte sentir asi. Te amo Rebe.",
  "Quieres hablarlo para desahogarte, quieres un consejo o prefieres que te distraiga con otra cosa? Tú dime qué necesitas ahorita y yo lo hago, el enojo es momentaneo corazon, tu tranqui. ",
  "A veces el mundo parece que está en contra, lo entiendo perfecto. Tómate 10 minutos, respira profundo y a chsm todo un ratillo. Te amo cielito",
  "Entiendo perfecto que estés hasta la cola. Se vale estar asi. Solo acuerdate que al final del día me tienes a mi para apoyarte y que se te pase el mal rato.",
  "Si el estrés es por la escuela, tareas o cosas que no puedes controlar ahorita, suéltalo un momento. Relajata y respira amor, el enojo no lleva a nada.",
  "Te juro que si pudiera me pasaria tu enojo a mi para que no tuvieras que cargarlo tu. Te amo mi medio pepino.",
  "¿Vamos por algo de comer? A veces el coraje se baja con comida. Yo invito, tu solo avisame y arranco por ti.",
  "Hablemos tranquilos para que saques tu energia pesada y que tengas un dia mas tranquilo a mi lado",
  "Sea lo que sea que te hizo enojar, no vale la pena que le dediques tu paz mental. Eres demasiada mujer para estar lidiando con corajes.",
  " Te apoyo al cien por ciento. Si tu estas enojada con alguien o con algo, yo tambien. Somos un equipo contra el problema siempre.",
  "Cierra los ojos un momento y concentrate en tu respiracion. Cuando te sientas un poquito más relajada hacemos algo bby.",
  "Eres una persona super inteligente y capaz. Ningun problema, situacion o persona es mas grande que tu. Te admiro demasiado amor, no te haces idea de lo fuerte que eres.",
  "No te voy a decir que no te enojes, tienes derecho a sentirlo y a expresarlo, solo vengo a recordarte que tienes mi amor incondicional para cualquier cosa que necesites. TEAMOOOOOOOOO"
];

const mensajesExtrano = [
  "YO TE EXTRAÑO MAS AMORCITO :(",
  "Cada segundo que pasa es un segundo menos para vernos amorcito y pasar el mejor dia del mundo uno al lado del otro.",
  "Algun dia vamos a vivir juntos y vamos a ser los mas felices de este mundo. Te amo amorcito",
  "Voy y te robo de tu casa un ratito o que??? :0",
  "TEAMOOOOOOOOOO extrañarte es la peor parte de dejarte en tu casa",
  "mi momento favorito del fin de semana es cuando llego por ti a las 3pm.",
  "No esta chido extrañarte amor, siento que te necesito a mi lado por la eternidad.",
  "Yo siempre voy contigo en el corazon, estamos conectados al final de cuentas.",
  "Mira, cierra los ojos e imaginate que te estoy abrazando fuertemente, bueno, ya casi voy a dartelo. TAMOOOOOOOOOO",
  "Voy a buscarte lejos de cualquier lugar, vos marca el sendero, voy camino atras, ¿Qué veo cuando miro tu nombre en la ciudad?. Puedo sentirte cerca, hasta cuando no estás ",
  "Yo se que no nos podemos ver en este momento pero quiero recordarte que estas presente en mi corazon durante toda mi vida. Besitos amorcito.",
  "Que ganas de ir a llevarte la contraria, molestarte, hacerte reir un ratito, estar contigo en general. Solo un ratito. Bueno, me gustaria un ratito mas",
  "Amor, yo tambien ando contando los dias para volver a verte y no puedo esperar mas. Vivir lejos de ti es la peor tortura que la vida nos pudo poner",
  "Eres mi primer pensamiento antes de despertar y el ultimo antes de ir a dormir. Te extraño muchisimo hoy y siempre.",
  "Si lees este mensaje mandame un Te extraño con mi alma, para poder saber que los dos nos estamos extrañando demasiado muchote."
];

const TARGET_CAPSULA = new Date(2027, 0, 22, 0, 0, 0);

const mensajeSecreto = ' Muchas Gracias por estos 2 años increibles a tu lado, hoy mismo es dia 22 de abril 2026 y quiero decirte que te amo con todo mi corazon, bueno, un poquito mas. He sido el mas feliz en este año 3 meses y estoy 100% seguro que seguire siendo el mas feliz en el momento en que abras esto, eres la novia perfecta ayer, hoy y cuando leas este mensaje, gracias por ser tu y solo tu. TE AMO';

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
  const [photos, setPhotos] = useState<Photo[]>([]);
  const [uploading, setUploading] = useState(false);
  
  const [modalVisible, setModalVisible] = useState(false);
  const [modalType, setModalType] = useState<ModalType>(null);
  
  const [countdown, setCountdown] = useState('');
  const [capsulaAbierta, setCapsulaAbierta] = useState(false);
  
  const [trips, setTrips] = useState<Trip[]>([]);
  const [newTrip, setNewTrip] = useState({ date: '', place: '', desc: '' });
  const [tripImage, setTripImage] = useState<string | null>(null);
  const [uploadingTrip, setUploadingTrip] = useState(false);
  
  const [selectedPhoto, setSelectedPhoto] = useState<string | null>(null);
  const [editingPhotoId, setEditingPhotoId] = useState<string | null>(null);
  const [editingCaption, setEditingCaption] = useState('');
  const [photoOptionsId, setPhotoOptionsId] = useState<string | null>(null);
  const [actionModalVisible, setActionModalVisible] = useState(false);

  useEffect(() => {
    const photosQuery = query(collection(db, 'fotos'), orderBy('created_at', 'desc'), limit(PHOTOS_PAGE));
    const unsubscribePhotos = onSnapshot(photosQuery, (snapshot) => {
      const photosData = snapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data()
      })) as Photo[];
      setPhotos(photosData);
      if (snapshot.docs.length > 0) {
        setLastVisiblePhotos(snapshot.docs[snapshot.docs.length - 1]);
        setHasMorePhotos(snapshot.docs.length === PHOTOS_PAGE);
      } else setHasMorePhotos(false);
    });

    const tripsQuery = query(collection(db, 'bitacora'), orderBy('date', 'desc'));
    const unsubscribeTrips = onSnapshot(tripsQuery, (snapshot) => {
      const tripsData = snapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data()
      })) as Trip[];
      setTrips(tripsData);
    });

    return () => {
      unsubscribePhotos();
      unsubscribeTrips();
    };
  }, []);

  const loadMorePhotos = async () => {
    if (!hasMorePhotos || moreLoadingPhotos || !lastVisiblePhotos) return;
    setMoreLoadingPhotos(true);
    try {
      const moreQuery = query(collection(db, 'fotos'), orderBy('created_at', 'desc'), startAfter(lastVisiblePhotos), limit(PHOTOS_PAGE));
      const snap = await getDocs(moreQuery);
      const newPhotos = snap.docs.map(doc => ({ id: doc.id, ...doc.data() })) as Photo[];
      if (newPhotos.length > 0) {
        setPhotos(prev => [...prev, ...newPhotos]);
        setLastVisiblePhotos(snap.docs[snap.docs.length - 1]);
      }
      if (newPhotos.length < PHOTOS_PAGE) setHasMorePhotos(false);
    } catch (e) {
      console.error('Error cargando más fotos', e);
    } finally {
      setMoreLoadingPhotos(false);
    }
  };

  useEffect(() => {
    const updateCounters = () => {
      const now = new Date();
      const isAbierta = now >= TARGET_CAPSULA;
      setCapsulaAbierta(isAbierta);
      
      if (!isAbierta) {
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

  const pickImage = async () => {
    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ['images'],
      allowsEditing: true,
      quality: 0.8,
    });

    if (!result.canceled && result.assets[0]) {
      setUploading(true);
      try {
        const timestamp = Date.now();
        const path = `fotos/${timestamp}.jpg`;
        const url = await uploadFile(result.assets[0].uri, path);
        
        await addDoc(collection(db, 'fotos'), {
          url,
          path,
          caption: 'Recuerdos',
          created_at: new Date().toISOString(),
        });
        
        Alert.alert('Éxito', 'Foto subida correctamente');
      } catch (error) {
        Alert.alert('Error', 'No se pudo subir la foto');
        console.error(error);
      } finally {
        setUploading(false);
      }
    }
  };

  const shufflePhotos = () => {
    const shuffled = [...photos].sort(() => Math.random() - 0.5);
    setPhotos(shuffled);
  };

  const openActionModal = () => setActionModalVisible(true);
  const closeActionModal = () => setActionModalVisible(false);
  const handlePhotoAction = (action: () => void) => {
    closeActionModal();
    action();
  };

  const takePhoto = async () => {
    const { status } = await ImagePicker.requestCameraPermissionsAsync();
    if (status !== 'granted') {
      Alert.alert('Permiso requerido', 'Se necesita acceso a la cámara');
      return;
    }

    const result = await ImagePicker.launchCameraAsync({
      allowsEditing: true,
      quality: 0.8,
    });

    if (!result.canceled && result.assets[0]) {
      setTripImage(result.assets[0].uri);
    }
  };

  const agregarTrip = async () => {
    if (!newTrip.date || !newTrip.place || !newTrip.desc) {
      Alert.alert('Error', 'Por favor completa todos los campos');
      return;
    }
    
    setUploadingTrip(true);
    try {
      let imageUrl = '';
      let imagePath = '';
      
      if (tripImage) {
        const timestamp = Date.now();
        imagePath = `bitacora/${timestamp}.jpg`;
        imageUrl = await uploadFile(tripImage, imagePath);
      }
      
      const tripRef = await addDoc(collection(db, 'bitacora'), {
        date: newTrip.date,
        place: newTrip.place,
        desc: newTrip.desc,
        imageUrl,
        imagePath,
        created_at: new Date().toISOString(),
      });
      
      setNewTrip({ date: '', place: '', desc: '' });
      setTripImage(null);
    } catch (error) {
      Alert.alert('Error', 'No se pudo guardar la aventura');
      console.error(error);
    } finally {
      setUploadingTrip(false);
    }
  };

  const eliminarTrip = async (trip: Trip) => {
    Alert.alert(
      'Eliminar Aventura',
      '¿Estás seguro de eliminar esta aventura?',
      [
        { text: 'Cancelar', style: 'cancel' },
        { 
          text: 'Eliminar', 
          style: 'destructive', 
          onPress: async () => {
            try {
              if (trip.imagePath) {
                await deleteFile(trip.imagePath);
              }
              await deleteDoc(doc(db, 'bitacora', trip.id));
            } catch (error) {
              console.error('Error deleting trip:', error);
            }
          }
        },
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
      if (capsulaAbierta) {
        return (
          <View style={styles.modalContent}>
            <Text style={styles.modalIcon}>💖</Text>
            <Text style={styles.modalTitle}>¡Es momento de abrirla!</Text>
            <ScrollView style={styles.mensajeReveladoContainer} showsVerticalScrollIndicator={false}>
              <Text style={styles.mensajeReveladoText}>{mensajeSecreto}</Text>
            </ScrollView>
          </View>
        );
      }
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
            
            <View style={styles.cameraRow}>
              <Pressable style={styles.cameraButton} onPress={takePhoto}>
                <Text style={styles.cameraButtonText}>📷 Cámara</Text>
              </Pressable>
              {tripImage && (
                <Image source={{ uri: tripImage }} style={styles.thumbnailPreview} />
              )}
            </View>
            
            <Pressable 
              style={[styles.agregarButton, uploadingTrip && styles.agregarButtonDisabled]} 
              onPress={agregarTrip}
              disabled={uploadingTrip}
            >
              {uploadingTrip ? (
                <ActivityIndicator color="#FFFFFF" />
              ) : (
                <Text style={styles.agregarButtonText}>Agregar Aventura</Text>
              )}
            </Pressable>
          </View>
          
          <ScrollView style={styles.tripsList}>
            {trips.length === 0 ? (
              <Text style={styles.sinAventuras}>Sin aventuras registradas</Text>
            ) : (
              trips.map((trip) => (
                <View key={trip.id} style={styles.tripItem}>
                  {trip.imageUrl && (
                    <TouchableOpacity onPress={() => setSelectedPhoto(trip.imageUrl!)}>
                      <Image source={{ uri: trip.imageUrl }} style={styles.tripThumbnail} />
                    </TouchableOpacity>
                  )}
                  <View style={styles.tripInfo}>
                    <Text style={styles.tripDate}>{trip.date}</Text>
                    <Text style={styles.tripPlace}>{trip.place}</Text>
                    <Text style={styles.tripDesc}>{trip.desc}</Text>
                  </View>
                  <Pressable style={styles.eliminarButton} onPress={() => eliminarTrip(trip)}>
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

  const renderPhoto = ({ item }: { item: Photo }) => {
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
      <Pressable style={styles.photoContainer}>
        <View style={styles.photoHeader}>
          <View style={styles.headerLeft}>
            <View style={styles.avatar} />
            <View style={styles.userInfo}>
              <Text style={styles.username}>RebeDari</Text>
              <Text style={styles.timeAgo}>{getTimeAgo(item.created_at)}</Text>
            </View>
          </View>
          <TouchableOpacity onPress={() => setPhotoOptionsId(photoOptionsId === item.id ? null : item.id)}>
            <Text style={styles.moreOptions}>⋮</Text>
          </TouchableOpacity>
          {photoOptionsId === item.id && (
            <Pressable style={styles.optionsMenuContainer} onPress={(e) => e.stopPropagation()}>
              <Pressable 
                style={styles.optionButton} 
                onPress={() => {
                  setPhotoOptionsId(null);
                  setEditingPhotoId(item.id);
                  setEditingCaption(item.caption || 'Recuerdos');
                  setModalVisible(true);
                }}
              >
                <Text style={styles.optionText}>Editar título</Text>
              </Pressable>
              <Pressable 
                style={styles.optionButton} 
                onPress={() => {
                  setPhotoOptionsId(null);
                  Alert.alert(
                    '¿Seguro que quieres eliminar esta foto?',
                    'Esta acción no se puede deshacer.',
                    [
                      { text: 'Cancelar', style: 'cancel' },
                      { 
                        text: 'Eliminar', 
                        style: 'destructive',
                        onPress: async () => {
                          try {
                            await deleteFile(item.path || '');
                            await deleteDoc(doc(db, 'fotos', item.id));
                          } catch (error) {
                            console.error('Error deleting photo:', error);
                          }
                        }
                      },
                    ]
                  );
                }}
              >
                <Text style={[styles.optionText, styles.optionDeleteText]}>Eliminar foto</Text>
              </Pressable>
            </Pressable>
          )}
        </View>
        {item.url ? (
          <TouchableOpacity onPress={() => setSelectedPhoto(item.url)}>
            <Image source={{ uri: item.url }} style={styles.photoImage} />
          </TouchableOpacity>
        ) : (
          <View style={styles.photoPlaceholder}>
            <Text style={styles.placeholderText}>📷</Text>
            <Text style={styles.placeholderSubtext}>Tu foto aquí</Text>
          </View>
        )}
        <View style={styles.photoFooter}>
          <Text style={styles.caption}>{item.caption || 'Fotos de ustedes'}</Text>
        </View>
      </Pressable>
    );
  };

  return (
    <View style={styles.container}>
      {uploading && (
        <View style={styles.loadingOverlay}>
          <ActivityIndicator size="large" color="#FF6B9D" />
          <Text style={styles.loadingText}>Subiendo foto...</Text>
        </View>
      )}
      
      <View style={styles.buttonRow}>
        <CardButton title="2 años..." onPress={() => openModal('capsula')} />
        <CardButton title="2. Ábrelo cuando..." onPress={() => openModal('abrlo')} />
        <CardButton title="3. Bitácora" onPress={() => openModal('bitacora')} />
      </View>

      <FlatList
        data={photos}
        renderItem={renderPhoto}
        keyExtractor={(item) => item.id}
        showsVerticalScrollIndicator={false}
        contentContainerStyle={styles.feedContent}
        onScrollBeginDrag={() => setPhotoOptionsId(null)}
      />
      
      <TouchableOpacity style={styles.floatingButton} onPress={openActionModal}>
        <Text style={styles.floatingButtonText}>+</Text>
      </TouchableOpacity>

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
      
      <Modal
        visible={!!selectedPhoto}
        transparent
        animationType="fade"
        onRequestClose={() => setSelectedPhoto(null)}
      >
        <Pressable style={styles.fullImageOverlay} onPress={() => setSelectedPhoto(null)}>
          <Image source={{ uri: selectedPhoto! }} style={styles.fullImage} resizeMode="contain" />
          <Pressable style={styles.closeFullImageButton} onPress={() => setSelectedPhoto(null)}>
            <Text style={styles.closeFullImageText}>✕</Text>
          </Pressable>
        </Pressable>
      </Modal>

      <Modal
        visible={editingPhotoId !== null}
        transparent
        animationType="fade"
        onRequestClose={() => setEditingPhotoId(null)}
      >
        <Pressable style={styles.modalOverlay} onPress={() => setEditingPhotoId(null)}>
          <Pressable style={styles.modalCard} onPress={(e) => e.stopPropagation()}>
            <Text style={styles.modalTitle}>Editar título</Text>
            <TextInput
              style={styles.editCaptionInput}
              value={editingCaption}
              onChangeText={setEditingCaption}
              placeholder="Título de la foto"
              placeholderTextColor="#8E8E93"
            />
            <View style={styles.editModalButtons}>
              <Pressable style={styles.cancelButton} onPress={() => setEditingPhotoId(null)}>
                <Text style={styles.cancelButtonText}>Cancelar</Text>
              </Pressable>
              <Pressable
                style={styles.saveButton}
                onPress={async () => {
                  if (editingPhotoId) {
                    try {
                      await updateDoc(doc(db, 'fotos', editingPhotoId), { caption: editingCaption });
                      setEditingPhotoId(null);
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
            <Pressable style={styles.actionButton} onPress={() => handlePhotoAction(pickImage)}>
              <Text style={styles.actionButtonText}>📷 Subir foto</Text>
            </Pressable>
            <Pressable style={styles.actionButton} onPress={() => handlePhotoAction(shufflePhotos)}>
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
buttonRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 3,
    gap: 4,
  },
  cardButton: {
    flex: 1,
    minHeight: 42,
    paddingVertical: 6,
    paddingHorizontal: 8,
    backgroundColor: '#FFFFFF',
    borderRadius: 15,
    borderWidth: 1,
    borderColor: 'rgba(255, 107, 157, 0.3)',
    justifyContent: 'center',
    marginHorizontal: 2,
  },
  cardButtonText: {
    fontSize: 11,
    fontWeight: '600',
    color: '#333333',
    textAlign: 'center',
  },
  feedContent: {
    paddingBottom: 110,
  },
  photoContainer: {
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
  photoHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 12,
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
    fontWeight: 'bold',
    color: '#000000',
  },
  photoPlaceholder: {
    width: '100%',
    aspectRatio: 1,
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
  mensajeReveladoContainer: {
    width: '100%',
    maxHeight: 250,
    marginTop: 10,
  },
  mensajeReveladoText: {
    fontSize: 16,
    color: '#333333',
    lineHeight: 24,
    textAlign: 'center',
    paddingHorizontal: 5,
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
  photoImage: {
    width: '100%',
    aspectRatio: 1,
  },
  headerLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
  },
  userInfo: {
    justifyContent: 'center',
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
  cameraRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    marginBottom: 10,
  },
  cameraButton: {
    paddingVertical: 10,
    paddingHorizontal: 15,
    backgroundColor: 'rgba(255, 182, 193, 0.3)',
    borderRadius: 10,
  },
  cameraButtonText: {
    fontSize: 14,
    color: '#333333',
  },
  thumbnailPreview: {
    width: 50,
    height: 50,
    borderRadius: 8,
  },
  tripThumbnail: {
    width: 60,
    height: 60,
    borderRadius: 8,
    marginRight: 10,
  },
  agregarButtonDisabled: {
    opacity: 0.6,
  },
  fullImageOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.95)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  fullImage: {
    width: width,
    height: width,
  },
  closeFullImageButton: {
    position: 'absolute',
    top: 50,
    right: 20,
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: 'rgba(255,255,255,0.3)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  closeFullImageText: {
    fontSize: 20,
    color: '#FFFFFF',
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
  const [lastVisiblePhotos, setLastVisiblePhotos] = useState<any>(null);
  const [moreLoadingPhotos, setMoreLoadingPhotos] = useState(false);
  const [hasMorePhotos, setHasMorePhotos] = useState(true);
  const PHOTOS_PAGE = 12;
