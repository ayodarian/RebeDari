import { View, Text, StyleSheet, FlatList, Pressable, ScrollView, Modal, Alert, Dimensions, TextInput, Image, ActivityIndicator, TouchableOpacity, KeyboardAvoidingView, Platform } from 'react-native';
import { useState, useEffect } from 'react';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import * as ImagePicker from 'expo-image-picker';
import { getClient } from '../../lib/insforge';
import { uploadFile, deleteFile } from '../../lib/storage';
import { useAppStore } from '../../store/index';
import { useTheme } from '../components/ThemeProvider';
import { createNotification } from '../../lib/notifications';
import { subscribeToTable, publishTableEvent } from '../../lib/realtime';

const { width } = Dimensions.get('window');

interface Photo { id: number; url: string; path?: string; caption: string; created_at: string; }
interface Trip { id: number; date: string; place: string; desc: string; image_url?: string; image_path?: string; imageUrl?: string; imagePath?: string; }
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
  if (days < 0) { const prevMonth = new Date(end.getFullYear(), end.getMonth(), 0); days += prevMonth.getDate(); months--; }
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
  return mensajes[Math.floor(Math.random() * mensajes.length)];
};

export default function FeedScreen() {
  const insets = useSafeAreaInsets();
  const { theme } = useTheme();
  const isAuthenticated = useAppStore((s) => s.isAuthenticated);
  const sessionId = useAppStore((s) => s.sessionId);
  const PAGE_SIZE = 20;

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
  const [bitacoraTab, setBitacoraTab] = useState<'crear' | 'ver'>('crear');
  const [selectedPhoto, setSelectedPhoto] = useState<string | null>(null);
  const [editingPhotoId, setEditingPhotoId] = useState<number | null>(null);
  const [editingCaption, setEditingCaption] = useState('');
  const [photoOptionsId, setPhotoOptionsId] = useState<number | null>(null);
  const [actionModalVisible, setActionModalVisible] = useState(false);
  const [lastId, setLastId] = useState<number | null>(null);
  const [loadingMore, setLoadingMore] = useState(false);
  const [hasMore, setHasMore] = useState(true);

  useEffect(() => {
    if (!isAuthenticated || !sessionId) return;
    const loadFirstPage = async () => {
      try {
        const { data: photosData } = await getClient().database.from('fotos').select('*').order('created_at', { ascending: false }).limit(PAGE_SIZE);
        if (photosData) { setPhotos(photosData as Photo[]); if (photosData.length > 0) setLastId(photosData[photosData.length - 1].id); setHasMore(photosData.length === PAGE_SIZE); }
      } catch (e) { console.error('[feed] Error cargando fotos', e); }
    };
    loadFirstPage();
    const unsubFotos = subscribeToTable(
      `fotos:${sessionId}`,
      'fotos_changed',
      loadFirstPage
    );
    return () => unsubFotos();
  }, [isAuthenticated, sessionId]);

  useEffect(() => {
    if (!isAuthenticated || !sessionId) return;
    const loadTrips = async () => {
      try {
        const { data } = await getClient().database.from('bitacora').select('*').order('date', { ascending: false });
        if (data) {
          const mapped = (data as any[]).map(t => ({
            ...t,
            imageUrl: t.image_url,
            imagePath: t.image_path,
          }));
          setTrips(mapped as Trip[]);
        }
      } catch (e) { console.error('[feed] Error cargando bitacora', e); }
    };
    loadTrips();
    const unsubBitacora = subscribeToTable(
      `bitacora:${sessionId}`,
      'bitacora_changed',
      loadTrips
    );
    return () => unsubBitacora();
  }, [isAuthenticated, sessionId]);

  const loadMore = async () => {
    if (!lastId || loadingMore || !hasMore) return;
    setLoadingMore(true);
    try {
      const { data: newPhotos } = await getClient().database.from('fotos').select('*').order('created_at', { ascending: false }).gt('id', lastId).limit(PAGE_SIZE);
      if (newPhotos) { setPhotos(prev => [...prev, ...newPhotos as Photo[]]); if (newPhotos.length > 0) setLastId(newPhotos[newPhotos.length - 1].id); setHasMore(newPhotos.length === PAGE_SIZE); }
    } catch (e) { console.error('[feed] Error cargando más fotos', e); } finally { setLoadingMore(false); }
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
      } else { setCountdown('¡Ya se puede abrir! 🎉'); }
    };
    updateCounters();
    const interval = setInterval(updateCounters, 1000);
    return () => clearInterval(interval);
  }, []);

  const openModal = (type: ModalType) => { setModalType(type); if (type === 'bitacora') setBitacoraTab('crear'); setModalVisible(true); };
  const closeModal = () => { setModalVisible(false); setModalType(null); setNewTrip({ date: '', place: '', desc: '' }); setTripImage(null); };
  const showCartaMensaje = (categoria: string) => Alert.alert('Para ti 💕', getMensajeAleatorio(categoria));

  const pickImage = async () => {
    const result = await ImagePicker.launchImageLibraryAsync({ mediaTypes: ['images'], allowsMultipleSelection: true, selectionLimit: 0, quality: 0.8 });
    if (!result.canceled && result.assets.length > 0) {
      setUploading(true);
      try {
        const timestamp = Date.now(); const totalAssets = result.assets.length; let successCount = 0;
        for (let i = 0; i < result.assets.length; i++) {
          const asset = result.assets[i]; const path = `fotos/${timestamp}_${i}.jpg`;
          const url = await uploadFile(asset.uri, path);
          await getClient().database.from('fotos').insert({ url, path, caption: 'Recuerdos', created_at: new Date().toISOString(), session_id: useAppStore.getState().sessionId, user_id: useAppStore.getState().user?.id });
          successCount++;
        }
        const { data: fotosData } = await getClient().database.from('fotos').select('*').order('created_at', { ascending: false }).limit(PAGE_SIZE);
        if (fotosData) { setPhotos(fotosData as Photo[]); if (fotosData.length > 0) setLastId(fotosData[fotosData.length - 1].id); }
        const state = useAppStore.getState();
        if (state.sessionId) {
          publishTableEvent(`fotos:${state.sessionId}`, 'fotos_changed');
          if (state.user) {
            await createNotification(state.sessionId, state.user.id, state.user.nombre, 'foto', 'Nueva foto', `${state.user.nombre} compartió ${successCount} foto${successCount > 1 ? 's' : ''}`);
          }
        }
        Alert.alert('Éxito', `${successCount} de ${totalAssets} fotos subidas correctamente`);
      } catch (error) { Alert.alert('Error', 'No se pudieron subir todas las fotos'); console.error(error); } finally { setUploading(false); }
    }
  };

  const shufflePhotos = () => setPhotos([...photos].sort(() => Math.random() - 0.5));
  const openActionModal = () => setActionModalVisible(true);
  const closeActionModal = () => setActionModalVisible(false);
  const handlePhotoAction = (action: () => void) => { closeActionModal(); action(); };

  const takePhoto = async () => {
    const { status } = await ImagePicker.requestCameraPermissionsAsync();
    if (status !== 'granted') { Alert.alert('Permiso requerido', 'Se necesita acceso a la cámara'); return; }
    const result = await ImagePicker.launchCameraAsync({ allowsEditing: true, quality: 0.8 });
    if (!result.canceled && result.assets[0]) setTripImage(result.assets[0].uri);
  };

  const agregarTrip = async () => {
    if (!newTrip.date || !newTrip.place || !newTrip.desc) { Alert.alert('Error', 'Por favor completa todos los campos'); return; }
    setUploadingTrip(true);
    try {
      let imageUrl = ''; let imagePath = '';
      if (tripImage) { const timestamp = Date.now(); imagePath = `bitacora/${timestamp}.jpg`; imageUrl = await uploadFile(tripImage, imagePath); }
      await getClient().database.from('bitacora').insert({ date: newTrip.date, place: newTrip.place, desc: newTrip.desc, image_url: imageUrl, image_path: imagePath, created_at: new Date().toISOString(), session_id: useAppStore.getState().sessionId, user_id: useAppStore.getState().user?.id });
      const state = useAppStore.getState();
      if (state.sessionId) {
        publishTableEvent(`bitacora:${state.sessionId}`, 'bitacora_changed');
        if (state.user) {
          await createNotification(state.sessionId, state.user.id, state.user.nombre, 'bitacora', 'Nueva aventura', `${state.user.nombre} agregó una aventura: ${newTrip.place}`);
        }
      }
      setNewTrip({ date: '', place: '', desc: '' }); setTripImage(null); setBitacoraTab('ver');
    } catch (error) { Alert.alert('Error', 'No se pudo guardar la aventura'); console.error(error); } finally { setUploadingTrip(false); }
  };

  const eliminarTrip = async (trip: Trip) => {
    Alert.alert('Eliminar Aventura', '¿Estás seguro de eliminar esta aventura?', [
      { text: 'Cancelar', style: 'cancel' },
      { text: 'Eliminar', style: 'destructive', onPress: async () => {
        try {
          if (trip.imagePath) await deleteFile(trip.imagePath);
          await getClient().database.from('bitacora').delete().eq('id', trip.id);
          const sid = useAppStore.getState().sessionId;
          if (sid) publishTableEvent(`bitacora:${sid}`, 'bitacora_changed');
        } catch (error) { console.error('Error deleting trip:', error); }
      } },
    ]);
  };

  const renderModalContent = () => {
    if (modalType === 'capsula') {
      if (capsulaAbierta) {
        return (
          <View style={styles.modalContent}>
            <Text style={styles.modalIcon}>💖</Text>
            <Text style={[styles.modalTitle, { color: theme.primary }]}>¡Es momento de abrirla!</Text>
            <ScrollView style={styles.mensajeReveladoContainer} showsVerticalScrollIndicator={false}>
              <Text style={[styles.mensajeReveladoText, { color: theme.text }]}>{mensajeSecreto}</Text>
            </ScrollView>
          </View>
        );
      }
      return (
        <View style={styles.modalContent}>
          <Text style={styles.modalIcon}>🔒</Text>
          <Text style={[styles.modalTitle, { color: theme.primary }]}>Se abre en nuestro Aniversario</Text>
          <Text style={[styles.counterText, { color: theme.text }]}>{countdown}</Text>
          <View style={[styles.mensajeSecretoBox, { backgroundColor: `${theme.primaryLight}33` }]}>
            <Text style={[styles.mensajeSecretoLabel, { color: theme.textSecondary }]}>Mensaje Secreto:</Text>
            <Text style={[styles.mensajeSecretoText, { color: theme.text }]}>**********</Text>
            <Text style={[styles.mensajeSecretoHint, { color: theme.textTertiary }]}>(Se revelará el 22/01/2027)</Text>
          </View>
        </View>
      );
    }
    
    if (modalType === 'abrlo') {
      return (
        <View style={styles.modalContent}>
          <Text style={[styles.modalTitle, { color: theme.primary }]}>Cartas de Emergencia</Text>
          {['triste', 'sueno', 'enojada', 'extrano'].map((cat, idx) => (
            <Pressable key={cat} style={[styles.cartaButton, { backgroundColor: `${theme.primaryLight}4D` }]} onPress={() => showCartaMensaje(cat)}>
              <Text style={[styles.cartaButtonText, { color: theme.text }]}>...{['estés triste', 'no puedas dormir', 'estés enojada', 'me extrañes'][idx]}</Text>
            </Pressable>
          ))}
        </View>
      );
    }
    
    if (modalType === 'bitacora') {
      return (
        <View style={[styles.modalContent, styles.bitacoraContent]}>
          <View style={styles.bitacoraTabs}>
            {(['crear', 'ver'] as const).map(tab => (
              <Pressable key={tab} style={[styles.bitacoraTab, { backgroundColor: bitacoraTab === tab ? theme.surface : `${theme.primary}14` }]} onPress={() => setBitacoraTab(tab)}>
                <Text style={[styles.bitacoraTabText, { color: bitacoraTab === tab ? theme.primary : theme.textTertiary }]} numberOfLines={1}>
                  {tab === 'crear' ? '✏️ Crear' : `🗺️ Mis Aventuras ${trips.length > 0 ? `(${trips.length})` : ''}`}
                </Text>
              </Pressable>
            ))}
          </View>

          {bitacoraTab === 'crear' ? (
            <KeyboardAvoidingView style={styles.bitacoraKAV} behavior={Platform.OS === 'ios' ? 'padding' : undefined} keyboardVerticalOffset={Platform.OS === 'ios' ? 20 : 0}>
              <ScrollView style={styles.bitacoraFormScroll} showsVerticalScrollIndicator={false} keyboardShouldPersistTaps="handled">
                <View style={styles.bitacoraForm}>
                  <View style={styles.fieldGroup}>
                    <Text style={[styles.fieldLabel, { color: theme.textSecondary }]}>📅 Fecha</Text>
                    <TextInput style={[styles.input, { backgroundColor: theme.input, borderColor: `${theme.primary}33`, color: theme.text }]} placeholder="dd/mm/aaaa" placeholderTextColor={theme.placeholder} value={newTrip.date} onChangeText={(text) => setNewTrip({ ...newTrip, date: text })} />
                  </View>
                  <View style={styles.fieldGroup}>
                    <Text style={[styles.fieldLabel, { color: theme.textSecondary }]}>📍 Lugar</Text>
                    <TextInput style={[styles.input, { backgroundColor: theme.input, borderColor: `${theme.primary}33`, color: theme.text }]} placeholder="¿Dónde fue?" placeholderTextColor={theme.placeholder} value={newTrip.place} onChangeText={(text) => setNewTrip({ ...newTrip, place: text })} />
                  </View>
                  <View style={styles.fieldGroup}>
                    <Text style={[styles.fieldLabel, { color: theme.textSecondary }]}>💬 Descripción</Text>
                    <TextInput style={[styles.input, styles.inputMultiline, { backgroundColor: theme.input, borderColor: `${theme.primary}33`, color: theme.text }]} placeholder="Cuéntame qué hicieron..." placeholderTextColor={theme.placeholder} value={newTrip.desc} onChangeText={(text) => setNewTrip({ ...newTrip, desc: text })} multiline />
                  </View>
                  <View style={styles.fieldGroup}>
                    <Text style={[styles.fieldLabel, { color: theme.textSecondary }]}>📷 Foto (opcional)</Text>
                    <View style={styles.photoPickerRow}>
                      <Pressable style={[styles.photoPickerButton, { backgroundColor: `${theme.primary}1F`, borderColor: `${theme.primary}40` }]} onPress={takePhoto}>
                        <Text style={[styles.photoPickerButtonText, { color: theme.primary }]}>📷 Tomar foto</Text>
                      </Pressable>
                      {tripImage ? (
                        <View style={styles.photoPreviewWrapper}>
                          <Image source={{ uri: tripImage }} style={styles.photoPreview} />
                          <Pressable style={styles.photoRemoveButton} onPress={() => setTripImage(null)}>
                            <Text style={styles.photoRemoveText}>✕</Text>
                          </Pressable>
                        </View>
                      ) : (
                        <View style={[styles.tripPhotoThumb, { backgroundColor: theme.input, borderColor: theme.border }]}>
                          <Text style={[styles.tripPhotoThumbText, { color: theme.textTertiary }]}>Sin foto</Text>
                        </View>
                      )}
                    </View>
                  </View>
                  <Pressable style={[styles.saveTripButton, { backgroundColor: theme.primary }, uploadingTrip && styles.agregarButtonDisabled]} onPress={agregarTrip} disabled={uploadingTrip}>
                    {uploadingTrip ? <ActivityIndicator color={theme.text} /> : <Text style={[styles.saveTripButtonText, { color: theme.text }]}>💖 Guardar Aventura</Text>}
                  </Pressable>
                </View>
              </ScrollView>
            </KeyboardAvoidingView>
          ) : (
            <ScrollView style={styles.tripsListScroll} showsVerticalScrollIndicator={false} keyboardShouldPersistTaps="handled">
              {trips.length === 0 ? (
                <View style={styles.emptyAventuras}>
                  <Text style={styles.emptyAventurasIcon}>🗺️</Text>
                  <Text style={[styles.emptyAventurasText, { color: theme.textSecondary }]}>Sin aventuras aún</Text>
                  <Text style={[styles.emptyAventurasHint, { color: theme.textTertiary }]}>Ve a "Crear" para registrar tu primera aventura</Text>
                </View>
              ) : (
                trips.map((trip) => (
                  <View key={trip.id} style={[styles.tripCard, { backgroundColor: theme.surface, borderColor: `${theme.primary}14` }]}>
                    {trip.imageUrl ? (
                      <TouchableOpacity onPress={() => setSelectedPhoto(trip.imageUrl!)}>
                        <Image source={{ uri: trip.imageUrl }} style={styles.tripCardImage} />
                      </TouchableOpacity>
                    ) : (
                      <View style={[styles.tripCardImagePlaceholder, { backgroundColor: `${theme.primary}14` }]}>
                        <Text style={styles.tripCardPlaceholderIcon}>📍</Text>
                      </View>
                    )}
                    <View style={styles.tripCardContent}>
                      <View style={styles.tripCardHeader}>
                        <Text style={[styles.tripCardDate, { color: theme.primary }]}>{trip.date}</Text>
                        <Pressable style={styles.tripCardDelete} onPress={() => eliminarTrip(trip)}>
                          <Text style={styles.tripCardDeleteText}>🗑️</Text>
                        </Pressable>
                      </View>
                      <Text style={[styles.tripCardPlace, { color: theme.text }]} numberOfLines={1}>{trip.place}</Text>
                      {trip.desc ? <Text style={[styles.tripCardDesc, { color: theme.textSecondary }]} numberOfLines={3}>{trip.desc}</Text> : null}
                    </View>
                  </View>
                ))
              )}
            </ScrollView>
          )}
        </View>
      );
    }
    return null;
  };

  const renderPhoto = ({ item }: { item: Photo }) => {
    const getTimeAgo = (dateStr: string) => {
      const date = new Date(dateStr); const now = new Date(); const diff = now.getTime() - date.getTime();
      const hours = Math.floor(diff / (1000 * 60 * 60)); const days = Math.floor(hours / 24);
      if (days > 0) return `Hace ${days} día${days > 1 ? 's' : ''}`;
      if (hours > 0) return `Hace ${hours} hora${hours > 1 ? 's' : ''}`;
      return 'Hace un momento';
    };
    return (
      <Pressable style={[styles.photoContainer, { backgroundColor: theme.surface }]}>
        <View style={styles.photoHeader}>
          <View style={styles.headerLeft}>
            <View style={[styles.avatar, { backgroundColor: theme.primary }]} />
            <View style={styles.userInfo}>
              <Text style={[styles.username, { color: theme.text }]}>RebeDari</Text>
              <Text style={[styles.timeAgo, { color: theme.textTertiary }]}>{getTimeAgo(item.created_at)}</Text>
            </View>
          </View>
          <TouchableOpacity onPress={() => setPhotoOptionsId(photoOptionsId === item.id ? null : item.id)}>
            <Text style={[styles.moreOptions, { color: theme.textTertiary }]}>⋮</Text>
          </TouchableOpacity>
          {photoOptionsId === item.id && (
            <Pressable style={[styles.optionsMenuContainer, { backgroundColor: theme.surface }]} onPress={(e) => e.stopPropagation()}>
              <Pressable style={styles.optionButton} onPress={() => { setPhotoOptionsId(null); setEditingPhotoId(item.id); setEditingCaption(item.caption || 'Recuerdos'); setModalVisible(true); }}>
                <Text style={[styles.optionText, { color: theme.primary }]}>Editar título</Text>
              </Pressable>
              <Pressable style={styles.optionButton} onPress={() => { setPhotoOptionsId(null); Alert.alert('¿Seguro que quieres eliminar esta foto?', 'Esta acción no se puede deshacer.', [{ text: 'Cancelar', style: 'cancel' }, { text: 'Eliminar', style: 'destructive', onPress: async () => { try { await deleteFile(item.path || ''); await getClient().database.from('fotos').delete().eq('id', item.id); const sid = useAppStore.getState().sessionId; if (sid) publishTableEvent(`fotos:${sid}`, 'fotos_changed'); } catch (error) { console.error('Error deleting photo:', error); } } }]); }}>
                <Text style={[styles.optionText, { color: theme.error }]}>Eliminar foto</Text>
              </Pressable>
            </Pressable>
          )}
        </View>
        {item.url ? (
          <TouchableOpacity onPress={() => setSelectedPhoto(item.url)}>
            <Image source={{ uri: item.url }} style={styles.photoImage} />
          </TouchableOpacity>
        ) : (
          <View style={[styles.photoPlaceholder, { backgroundColor: theme.input }]}>
            <Text style={styles.placeholderText}>📷</Text>
            <Text style={[styles.placeholderSubtext, { color: theme.textTertiary }]}>Tu foto aquí</Text>
          </View>
        )}
        <View style={styles.photoFooter}>
          <Text style={[styles.caption, { color: theme.text }]}>{item.caption || 'Fotos de ustedes'}</Text>
        </View>
      </Pressable>
    );
  };

  return (
    <View style={[styles.container, { backgroundColor: theme.background }]}>
      {uploading && (
        <View style={[styles.loadingOverlay, { backgroundColor: `${theme.surface}E6` }]}>
          <ActivityIndicator size="large" color={theme.primary} />
          <Text style={[styles.loadingText, { color: theme.primary }]}>Subiendo foto...</Text>
        </View>
      )}
      
      <View style={styles.buttonRow}>
        {[{ title: '2 años...', type: 'capsula' as const }, { title: '2. Ábrelo cuando...', type: 'abrlo' as const }, { title: '3. Bitácora', type: 'bitacora' as const }].map(btn => (
          <Pressable key={btn.type} style={[styles.cardButton, { backgroundColor: theme.surface, borderColor: `${theme.primary}4D` }]} onPress={() => openModal(btn.type)}>
            <Text style={[styles.cardButtonText, { color: theme.text }]}>{btn.title}</Text>
          </Pressable>
        ))}
      </View>

      <FlatList data={photos} renderItem={renderPhoto} keyExtractor={(item) => String(item.id)} showsVerticalScrollIndicator={true}
        contentContainerStyle={styles.feedContent} onScrollBeginDrag={() => setPhotoOptionsId(null)}
        onEndReached={loadMore} onEndReachedThreshold={0.4} initialNumToRender={10} windowSize={11} maxToRenderPerBatch={10}
        ListFooterComponent={loadingMore ? <View style={styles.footerLoader}><ActivityIndicator color={theme.primary} /></View> : null} />
      
      <TouchableOpacity style={[styles.floatingButton, { backgroundColor: theme.primary }]} onPress={openActionModal}>
        <Text style={[styles.floatingButtonText, { color: theme.text }]}>+</Text>
      </TouchableOpacity>

      <Modal visible={modalVisible} transparent animationType="fade" onRequestClose={closeModal}>
        <Pressable style={[styles.modalOverlay, { backgroundColor: `${theme.shadow}80` }]} onPress={closeModal}>
          <Pressable style={[styles.modalCard, { backgroundColor: theme.surface }, modalType === 'bitacora' && styles.modalCardLarge]} onPress={(e) => e.stopPropagation()}>
            {modalType === 'bitacora' && (
              <View style={[styles.bitacoraHeader, { borderBottomColor: `${theme.primary}26` }]}>
                <Text style={[styles.bitacoraHeaderTitle, { color: theme.primary }]}>📔 Bitácora</Text>
                <Pressable style={[styles.bitacoraHeaderClose, { backgroundColor: `${theme.primary}1F` }]} onPress={closeModal}>
                  <Text style={[styles.bitacoraHeaderCloseText, { color: theme.primary }]}>✕</Text>
                </Pressable>
              </View>
            )}
            {renderModalContent()}
            {modalType !== 'bitacora' && (
              <Pressable style={[styles.closeButton, { backgroundColor: theme.primary }]} onPress={closeModal}>
                <Text style={[styles.closeButtonText, { color: theme.text }]}>Cerrar</Text>
              </Pressable>
            )}
          </Pressable>
        </Pressable>
      </Modal>
      
      <Modal visible={!!selectedPhoto} transparent animationType="fade" onRequestClose={() => setSelectedPhoto(null)}>
        <Pressable style={[styles.fullImageOverlay, { backgroundColor: `${theme.shadow}F2` }]} onPress={() => setSelectedPhoto(null)}>
          <Image source={{ uri: selectedPhoto! }} style={styles.fullImage} resizeMode="contain" />
          <Pressable style={[styles.closeFullImageButton, { backgroundColor: `${theme.surface}4D` }]} onPress={() => setSelectedPhoto(null)}>
            <Text style={[styles.closeFullImageText, { color: theme.text }]}>✕</Text>
          </Pressable>
        </Pressable>
      </Modal>

      <Modal visible={editingPhotoId !== null} transparent animationType="fade" onRequestClose={() => setEditingPhotoId(null)}>
        <Pressable style={[styles.modalOverlay, { backgroundColor: `${theme.shadow}80` }]} onPress={() => setEditingPhotoId(null)}>
          <Pressable style={[styles.modalCard, { backgroundColor: theme.surface }]} onPress={(e) => e.stopPropagation()}>
            <Text style={[styles.modalTitle, { color: theme.primary }]}>Editar título</Text>
            <TextInput style={[styles.editCaptionInput, { backgroundColor: theme.input, color: theme.text }]} value={editingCaption} onChangeText={setEditingCaption} placeholder="Título de la foto" placeholderTextColor={theme.placeholder} />
            <View style={styles.editModalButtons}>
              <Pressable style={[styles.cancelButton, { borderColor: theme.primary }]} onPress={() => setEditingPhotoId(null)}>
                <Text style={[styles.cancelButtonText, { color: theme.primary }]}>Cancelar</Text>
              </Pressable>
              <Pressable style={[styles.saveButton, { backgroundColor: theme.primary }]} onPress={async () => { if (editingPhotoId) { try { await getClient().database.from('fotos').update({ caption: editingCaption }).eq('id', editingPhotoId); const sid = useAppStore.getState().sessionId; if (sid) publishTableEvent(`fotos:${sid}`, 'fotos_changed'); setEditingPhotoId(null); } catch (error) { console.error('Error updating caption:', error); } } }}>
                <Text style={[styles.saveButtonText, { color: theme.text }]}>Guardar</Text>
              </Pressable>
            </View>
          </Pressable>
        </Pressable>
      </Modal>

      <Modal visible={actionModalVisible} transparent animationType="slide" onRequestClose={closeActionModal}>
        <Pressable style={[styles.actionModalOverlay, { backgroundColor: `${theme.shadow}80` }]} onPress={closeActionModal}>
          <Pressable style={[styles.actionModalCard, { backgroundColor: theme.surface }]} onPress={(e) => e.stopPropagation()}>
            <Text style={[styles.actionModalTitle, { color: theme.primary }]}>Agregar contenido</Text>
            <Pressable style={[styles.actionButton, { backgroundColor: theme.primary }]} onPress={() => handlePhotoAction(pickImage)}>
              <Text style={[styles.actionButtonText, { color: theme.text }]}>📷 Subir foto</Text>
            </Pressable>
            <Pressable style={[styles.actionButton, { backgroundColor: theme.primary }]} onPress={() => handlePhotoAction(shufflePhotos)}>
              <Text style={[styles.actionButtonText, { color: theme.text }]}>🔀 Mezclar contenido</Text>
            </Pressable>
            <Pressable style={[styles.actionCancelButton, { borderColor: theme.border }]} onPress={closeActionModal}>
              <Text style={[styles.actionCancelText, { color: theme.textSecondary }]}>Cancelar</Text>
            </Pressable>
          </Pressable>
        </Pressable>
      </Modal>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  header: { paddingBottom: 15, paddingHorizontal: 15 },
  title: { fontSize: 28, fontWeight: 'bold' },
  timeContainer: { marginTop: 8 },
  timeCounter: { fontSize: 16, fontWeight: 'bold', lineHeight: 22 },
  buttonRow: { flexDirection: 'row', justifyContent: 'space-between', marginBottom: 3, gap: 4 },
  cardButton: { flex: 1, minHeight: 42, paddingVertical: 6, paddingHorizontal: 8, borderRadius: 15, borderWidth: 1, justifyContent: 'center', marginHorizontal: 2 },
  cardButtonText: { fontSize: 11, fontWeight: '600', textAlign: 'center' },
  feedContent: { paddingBottom: 110 },
  footerLoader: { paddingVertical: 20, alignItems: 'center' },
  photoContainer: { marginHorizontal: 12, marginBottom: 16, marginTop: 8, borderRadius: 16, overflow: 'hidden', shadowColor: '#000', shadowOffset: { width: 0, height: 1 }, shadowOpacity: 0.1, shadowRadius: 4, elevation: 3 },
  photoHeader: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: 12, paddingVertical: 10 },
  avatar: { width: 32, height: 32, borderRadius: 16, marginRight: 10 },
  username: { fontSize: 14, fontWeight: 'bold' },
  photoPlaceholder: { width: '100%', aspectRatio: 1, alignItems: 'center', justifyContent: 'center' },
  placeholderText: { fontSize: 60, opacity: 0.3 },
  placeholderSubtext: { fontSize: 14, marginTop: 10 },
  photoFooter: { paddingHorizontal: 15, paddingVertical: 10 },
  caption: { fontSize: 14 },
  modalOverlay: { flex: 1, justifyContent: 'center', alignItems: 'center' },
  modalCard: { width: width - 50, maxHeight: '70%', borderRadius: 25, padding: 25, alignItems: 'center' },
  modalCardLarge: { flex: 1, maxHeight: '88%', padding: 0, alignItems: 'stretch' },
  bitacoraHeader: { width: '100%', flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: 20, paddingTop: 18, paddingBottom: 10, borderBottomWidth: 1 },
  bitacoraHeaderTitle: { fontSize: 20, fontWeight: 'bold' },
  bitacoraHeaderClose: { width: 32, height: 32, borderRadius: 16, alignItems: 'center', justifyContent: 'center' },
  bitacoraHeaderCloseText: { fontSize: 16, fontWeight: 'bold' },
  modalContent: { alignItems: 'center', width: '100%' },
  modalIcon: { fontSize: 40, marginBottom: 10 },
  modalTitle: { fontSize: 20, fontWeight: 'bold', marginBottom: 20, textAlign: 'center' },
  editCaptionInput: { width: '100%', borderRadius: 12, padding: 15, fontSize: 16, marginBottom: 20 },
  editModalButtons: { flexDirection: 'row', justifyContent: 'space-between', width: '100%', gap: 12 },
  cancelButton: { flex: 1, paddingVertical: 12, borderRadius: 12, borderWidth: 1, alignItems: 'center' },
  cancelButtonText: { fontSize: 14, fontWeight: '600' },
  saveButton: { flex: 1, paddingVertical: 12, borderRadius: 12, alignItems: 'center' },
  saveButtonText: { fontSize: 14, fontWeight: '600' },
  counterText: { fontSize: 14, fontWeight: '600', textAlign: 'center', marginBottom: 20 },
  mensajeSecretoBox: { width: '100%', padding: 15, borderRadius: 12, alignItems: 'center' },
  mensajeSecretoLabel: { fontSize: 12, marginBottom: 5 },
  mensajeSecretoText: { fontSize: 18, fontWeight: 'bold', letterSpacing: 3 },
  mensajeSecretoHint: { fontSize: 10, marginTop: 5 },
  mensajeReveladoContainer: { width: '100%', maxHeight: 250, marginTop: 10 },
  mensajeReveladoText: { fontSize: 16, lineHeight: 24, textAlign: 'center', paddingHorizontal: 5 },
  cartaButton: { width: '100%', paddingVertical: 14, paddingHorizontal: 20, borderRadius: 12, marginBottom: 10 },
  cartaButtonText: { fontSize: 15, textAlign: 'center' },
  input: { width: '100%', borderRadius: 12, paddingHorizontal: 15, paddingVertical: 13, fontSize: 15, marginBottom: 0, borderWidth: 1.5 },
  inputMultiline: { minHeight: 80, textAlignVertical: 'top', paddingTop: 13 },
  agregarButtonDisabled: { opacity: 0.6 },
  bitacoraContent: { flex: 1, width: '100%', alignItems: 'stretch', paddingTop: 16, paddingHorizontal: 20, paddingBottom: 20 },
  bitacoraTabs: { flexDirection: 'row', width: '100%', borderRadius: 14, padding: 4, marginBottom: 16, gap: 4 },
  bitacoraTab: { flex: 1, paddingVertical: 10, borderRadius: 11, alignItems: 'center', justifyContent: 'center' },
  bitacoraTabText: { fontSize: 13, fontWeight: '600' },
  bitacoraKAV: { flex: 1, width: '100%' },
  bitacoraFormScroll: { width: '100%', flex: 1 },
  bitacoraForm: { width: '100%', paddingHorizontal: 4, paddingBottom: 10 },
  fieldGroup: { width: '100%', marginBottom: 16 },
  fieldLabel: { fontSize: 13, fontWeight: '600', marginBottom: 8 },
  photoPickerRow: { flexDirection: 'row', alignItems: 'center', gap: 12 },
  photoPickerButton: { flex: 1, paddingVertical: 12, paddingHorizontal: 16, borderRadius: 12, borderWidth: 1.5, borderStyle: 'dashed', alignItems: 'center' },
  photoPickerButtonText: { fontSize: 13, fontWeight: '600' },
  photoPreviewWrapper: { position: 'relative' },
  photoPreview: { width: 56, height: 56, borderRadius: 12 },
  photoRemoveButton: { position: 'absolute', top: -6, right: -6, width: 22, height: 22, borderRadius: 11, backgroundColor: '#FF3B30', alignItems: 'center', justifyContent: 'center', borderWidth: 2, borderColor: '#FFFFFF' },
  photoRemoveText: { color: '#FFFFFF', fontSize: 11, fontWeight: 'bold', lineHeight: 14 },
  tripPhotoThumb: { width: 56, height: 56, borderRadius: 12, alignItems: 'center', justifyContent: 'center', borderWidth: 1 },
  tripPhotoThumbText: { fontSize: 9 },
  saveTripButton: { width: '100%', paddingVertical: 16, borderRadius: 14, alignItems: 'center', marginTop: 6, shadowColor: '#FF6B9D', shadowOffset: { width: 0, height: 3 }, shadowOpacity: 0.25, shadowRadius: 6, elevation: 3 },
  saveTripButtonText: { fontSize: 15, fontWeight: 'bold', letterSpacing: 0.3 },
  tripsListScroll: { width: '100%', flex: 1 },
  emptyAventuras: { alignItems: 'center', paddingVertical: 40, paddingHorizontal: 20 },
  emptyAventurasIcon: { fontSize: 48, marginBottom: 12, opacity: 0.6 },
  emptyAventurasText: { fontSize: 16, fontWeight: '600', marginBottom: 6 },
  emptyAventurasHint: { fontSize: 13, textAlign: 'center' },
  tripCard: { borderRadius: 16, marginBottom: 12, overflow: 'hidden', shadowColor: '#000', shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.06, shadowRadius: 6, elevation: 2, borderWidth: 1 },
  tripCardImage: { width: '100%', height: 140 },
  tripCardImagePlaceholder: { width: '100%', height: 60, alignItems: 'center', justifyContent: 'center' },
  tripCardPlaceholderIcon: { fontSize: 24 },
  tripCardContent: { padding: 14 },
  tripCardHeader: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: 6 },
  tripCardDate: { fontSize: 11, fontWeight: '700', letterSpacing: 0.5, textTransform: 'uppercase' },
  tripCardDelete: { padding: 4 },
  tripCardDeleteText: { fontSize: 16 },
  tripCardPlace: { fontSize: 17, fontWeight: '700', marginBottom: 4 },
  tripCardDesc: { fontSize: 13, lineHeight: 18 },
  closeButton: { marginTop: 20, paddingVertical: 12, paddingHorizontal: 40, borderRadius: 20 },
  closeButtonText: { fontSize: 16, fontWeight: '600' },
  floatingButton: { position: 'absolute', right: 20, bottom: 85, width: 56, height: 56, borderRadius: 28, alignItems: 'center', justifyContent: 'center', shadowColor: '#000', shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.25, shadowRadius: 4, elevation: 5, zIndex: 10 },
  floatingButtonText: { fontSize: 30, fontWeight: '300' },
  loadingOverlay: { ...StyleSheet.absoluteFill, alignItems: 'center', justifyContent: 'center', zIndex: 100 },
  loadingText: { marginTop: 10, fontSize: 16 },
  photoImage: { width: '100%', aspectRatio: 1 },
  headerLeft: { flexDirection: 'row', alignItems: 'center', flex: 1 },
  userInfo: { justifyContent: 'center' },
  timeAgo: { fontSize: 11, marginTop: 1 },
  moreOptions: { fontSize: 18, paddingHorizontal: 4 },
  fullImageOverlay: { flex: 1, alignItems: 'center', justifyContent: 'center' },
  fullImage: { width: width, height: width },
  closeFullImageButton: { position: 'absolute', top: 50, right: 20, width: 40, height: 40, borderRadius: 20, alignItems: 'center', justifyContent: 'center' },
  closeFullImageText: { fontSize: 20 },
  optionsMenuContainer: { position: 'absolute', right: 12, top: 50, borderRadius: 16, paddingVertical: 8, shadowColor: '#000', shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.15, shadowRadius: 8, elevation: 4, minWidth: 140, zIndex: 100 },
  optionButton: { paddingVertical: 12, paddingHorizontal: 16 },
  optionText: { fontSize: 14, fontWeight: '600' },
  actionModalOverlay: { flex: 1, justifyContent: 'flex-end' },
  actionModalCard: { borderTopLeftRadius: 30, borderTopRightRadius: 30, borderBottomLeftRadius: 30, borderBottomRightRadius: 30, padding: 25, paddingBottom: 40 },
  actionModalTitle: { fontSize: 20, fontWeight: 'bold', textAlign: 'center', marginBottom: 20 },
  actionButton: { paddingVertical: 16, borderRadius: 16, marginBottom: 12, alignItems: 'center' },
  actionButtonText: { fontSize: 16, fontWeight: '600' },
  actionCancelButton: { paddingVertical: 16, borderRadius: 16, marginTop: 8, alignItems: 'center', borderWidth: 1 },
  actionCancelText: { fontSize: 16 },
});
