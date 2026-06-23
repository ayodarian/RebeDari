import { View, Text, StyleSheet, ScrollView, Pressable, TouchableOpacity, ActivityIndicator, Alert, Linking, TextInput, Modal, Dimensions } from 'react-native';
import { WebView } from 'react-native-webview';
import { GestureHandlerRootView } from 'react-native-gesture-handler';
import { useState, useEffect } from 'react';
import { Swipeable } from 'react-native-gesture-handler';
import * as DocumentPicker from 'expo-document-picker';
import { getClient } from '../../lib/insforge';
import { uploadFile, deleteFile } from '../../lib/storage';
import { useAppStore } from '../../store/index';
import { useTheme } from '../components/ThemeProvider';
import { createNotification } from '../../lib/notifications';
import { subscribeToTable, publishTableEvent } from '../../lib/realtime';

const { width } = Dimensions.get('window');

interface Carta { id: number; titulo: string; url: string; path: string; remitente: string; fecha: string; fecha_escritura?: string; description: string; favorita?: boolean; tipo?: 'pdf' | 'imagen'; created_at: string; }

export default function CartasScreen() {
  const { theme } = useTheme();
  const [pestanaActiva, setPestanaActiva] = useState<'Lebebe' | 'Darian'>('Lebebe');
  const [cartas, setCartas] = useState<Carta[]>([]);
  const [uploading, setUploading] = useState(false);
  const [filterMode, setFilterMode] = useState<'recientes' | 'fecha' | 'favoritas' | 'aleatorias'>('recientes');
  const [showDropdown, setShowDropdown] = useState(false);
  const [fechaModalOpen, setFechaModalOpen] = useState(false);
  const [fechaEscrituraTemp, setFechaEscrituraTemp] = useState('');
  const [pendingUpload, setPendingUpload] = useState<{uri: string; name: string} | null>(null);
  const [cartaOptionsId, setCartaOptionsId] = useState<number | null>(null);
  const [editingCartaId, setEditingCartaId] = useState<number | null>(null);
  const [editingTitulo, setEditingTitulo] = useState('');
  const [descripcionTemp, setDescripcionTemp] = useState('');
  const [tituloCartaTemp, setTituloCartaTemp] = useState('');
  const [previewCarta, setPreviewCarta] = useState<Carta | null>(null);

  useEffect(() => {
    const sessionId = useAppStore.getState().sessionId;
    if (!sessionId) return;
    const loadCartas = async () => {
      try {
        const { data } = await getClient().database.from('cartas').select('*').eq('remitente', pestanaActiva).order('created_at', { ascending: false });
        if (data) {
          let cartasData = data as Carta[];
          switch (filterMode) {
            case 'recientes': break;
            case 'fecha': cartasData.sort((a, b) => (a.fecha_escritura ? new Date(a.fecha_escritura).getTime() : 0) - (b.fecha_escritura ? new Date(b.fecha_escritura).getTime() : 0)); break;
            case 'favoritas': cartasData = cartasData.filter(c => c.favorita); break;
            case 'aleatorias': cartasData.sort(() => Math.random() - 0.5); break;
          }
          setCartas(cartasData);
        }
      } catch (e) { console.error('Error cargando cartas', e); }
    };
    loadCartas();
    const unsub = subscribeToTable(
      `cartas:${sessionId}`,
      'cartas_changed',
      loadCartas
    );
    return () => unsub();
  }, [pestanaActiva, filterMode]);

  const uploadCarta = async () => {
    try {
      const result = await DocumentPicker.getDocumentAsync({ type: 'application/pdf' });
      if (!result.canceled && result.assets && result.assets[0]) {
        setPendingUpload({ uri: result.assets[0].uri, name: result.assets[0].name });
        setFechaEscrituraTemp(''); setDescripcionTemp(''); setTituloCartaTemp(''); setFechaModalOpen(true);
      }
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Error desconocido';
      Alert.alert('Error', `No se pudo seleccionar el archivo. Detalles: ${errorMessage}`);
      console.error(error);
    }
  };

  const confirmarUpload = async () => {
    if (!pendingUpload) return;
    if (!tituloCartaTemp.trim()) { Alert.alert('Error', 'Por favor ingresa un título para la carta'); return; }
    if (!fechaEscrituraTemp.trim()) { Alert.alert('Error', 'Por favor ingresa la fecha de escritura'); return; }
    if (!descripcionTemp.trim()) { Alert.alert('Error', 'Por favor ingresa una descripción'); return; }
    setFechaModalOpen(false); setUploading(true);
    const timestamp = Date.now();
    const extension = pendingUpload.name.split('.').pop()?.toLowerCase() || 'pdf';
    const path = `cartas/${pestanaActiva}/${timestamp}.${extension}`;
    try {
      const url = await uploadFile(pendingUpload.uri, path);
      await getClient().database.from('cartas').insert({ titulo: tituloCartaTemp.trim(), url, path, remitente: pestanaActiva, fecha: new Date().toLocaleDateString('es-MX'), fecha_escritura: fechaEscrituraTemp, description: descripcionTemp.trim(), favorita: false, created_at: new Date().toISOString(), session_id: useAppStore.getState().sessionId, user_id: useAppStore.getState().user?.id });
      const state = useAppStore.getState();
      if (state.sessionId) {
        publishTableEvent(`cartas:${state.sessionId}`, 'cartas_changed');
        if (state.user) {
          await createNotification(state.sessionId, state.user.id, state.user.nombre, 'carta', 'Nueva carta', `${state.user.nombre} escribió una carta: ${tituloCartaTemp.trim()}`);
        }
      }
      Alert.alert('Éxito', 'Carta subida correctamente');
    } catch (uploadError) { Alert.alert('Error de subida', `No se pudo subir el archivo.`); console.error('Upload error:', uploadError); } finally { setUploading(false); setPendingUpload(null); setFechaEscrituraTemp(''); setDescripcionTemp(''); setTituloCartaTemp(''); }
  };

  const toggleFavorita = async (carta: Carta) => { try { await getClient().database.from('cartas').update({ favorita: !carta.favorita }).eq('id', carta.id); const sid = useAppStore.getState().sessionId; if (sid) publishTableEvent(`cartas:${sid}`, 'cartas_changed'); } catch (error) { console.error('Error toggling favorite:', error); } };
  const abrirCarta = (carta: Carta) => setPreviewCarta(carta);
  const eliminarCarta = async (carta: Carta) => {
    Alert.alert('Eliminar Carta', '¿Estás seguro que deseas eliminar esta carta?', [{ text: 'Cancelar', style: 'cancel' }, { text: 'Eliminar', style: 'destructive', onPress: async () => { try { await deleteFile(carta.path); await getClient().database.from('cartas').delete().eq('id', carta.id); const sid = useAppStore.getState().sessionId; if (sid) publishTableEvent(`cartas:${sid}`, 'cartas_changed'); } catch (error) { Alert.alert('Error', 'No se pudo eliminar la carta'); } } }]);
  };

  const renderRightActions = (carta: Carta) => (
    <TouchableOpacity style={[styles.deleteButton, { backgroundColor: theme.error }]} onPress={() => eliminarCarta(carta)}>
      <Text style={styles.deleteButtonText}>🗑️</Text>
    </TouchableOpacity>
  );

  const renderTarjeta = (carta: Carta) => (
    <Swipeable key={carta.id} renderRightActions={() => renderRightActions(carta)} overshootRight={false}>
      <TouchableOpacity style={[styles.tarjeta, { backgroundColor: theme.surface }]} onPress={() => abrirCarta(carta)}>
        <View style={[styles.tarjetaIcono, { backgroundColor: `${theme.primaryLight}33` }]}>
          <Text style={styles.tarjetaIconText}>💌</Text>
        </View>
        <View style={styles.tarjetaContent}>
          <Text style={[styles.tarjetaTitulo, { color: theme.text }]}>{carta.titulo}</Text>
          <Text style={[styles.tarjetaSubtitulo, { color: theme.textTertiary }]}>De {carta.remitente} • {carta.fecha_escritura || carta.fecha}</Text>
        </View>
        <View style={styles.tarjetaRight}>
          <TouchableOpacity style={styles.starButton} onPress={() => toggleFavorita(carta)}>
            <Text style={[styles.estrella, { color: carta.favorita ? theme.warning : theme.textTertiary }]}>{carta.favorita ? '★' : '☆'}</Text>
          </TouchableOpacity>
          <TouchableOpacity onPress={() => setCartaOptionsId(cartaOptionsId === carta.id ? null : carta.id)}>
            <Text style={[styles.moreOptions, { color: theme.textTertiary }]}>⋮</Text>
          </TouchableOpacity>
          {cartaOptionsId === carta.id && (
            <Pressable style={[styles.optionsMenuContainer, { backgroundColor: theme.surface }]} onPress={(e) => e.stopPropagation()}>
              <Pressable style={styles.optionButton} onPress={() => { setCartaOptionsId(null); setEditingCartaId(carta.id); setEditingTitulo(carta.titulo); }}>
                <Text style={[styles.optionText, { color: theme.primary }]}>Editar título</Text>
              </Pressable>
              <Pressable style={styles.optionButton} onPress={() => { setCartaOptionsId(null); eliminarCarta(carta); }}>
                <Text style={[styles.optionText, { color: theme.error }]}>Eliminar</Text>
              </Pressable>
            </Pressable>
          )}
        </View>
      </TouchableOpacity>
    </Swipeable>
  );

  return (
    <GestureHandlerRootView style={{ flex: 1 }}>
    <View style={[styles.container, { backgroundColor: theme.background }]}>
      {uploading && (
        <View style={[styles.loadingOverlay, { backgroundColor: `${theme.surface}E6` }]}>
          <ActivityIndicator size="large" color={theme.primary} />
          <Text style={[styles.loadingText, { color: theme.primary }]}>Subiendo carta...</Text>
        </View>
      )}

      <View style={[styles.header, { paddingTop: 5, flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' }]}>
        <Text style={[styles.title, { color: theme.primary }]}>Cartas</Text>
        <View style={styles.filterContainer}>
          <TouchableOpacity style={[styles.filterButton, { backgroundColor: theme.surface, borderColor: theme.primary }]} onPress={() => setShowDropdown(!showDropdown)}>
            <Text style={[styles.filterButtonText, { color: theme.primary }]}>≡ {filterMode === 'recientes' ? 'Recientes' : filterMode === 'fecha' ? 'Fecha' : filterMode === 'favoritas' ? 'Favoritas' : 'Aleatorias'}</Text>
          </TouchableOpacity>
          {showDropdown && (
            <View style={[styles.filterDropdown, { backgroundColor: theme.surface }]}>
              {(['recientes', 'fecha', 'favoritas', 'aleatorias'] as const).map(mode => (
                <TouchableOpacity key={mode} style={styles.filterOption} onPress={() => { setFilterMode(mode); setShowDropdown(false); }}>
                  <Text style={[styles.filterOptionText, { color: theme.text }]}>{mode === 'recientes' ? 'Recientes' : mode === 'fecha' ? 'Fecha de escritura' : mode === 'favoritas' ? 'Favoritas' : 'Aleatorias'}</Text>
                </TouchableOpacity>
              ))}
            </View>
          )}
        </View>
      </View>

      <View style={styles.pestanasContainer}>
        {(['Lebebe', 'Darian'] as const).map(tab => (
          <Pressable key={tab} style={[styles.pestana, { backgroundColor: pestanaActiva === tab ? (tab === 'Lebebe' ? theme.primaryLight : theme.success) : theme.input }]} onPress={() => setPestanaActiva(tab)}>
            <Text style={[styles.pestanaTexto, { color: pestanaActiva === tab ? theme.text : theme.textSecondary }]}>
              {tab === 'Darian' ? 'Darianzin' : tab}
            </Text>
          </Pressable>
        ))}
      </View>

      <ScrollView style={styles.lista} contentContainerStyle={styles.listaContent} showsVerticalScrollIndicator={false} onScrollBeginDrag={() => setCartaOptionsId(null)}>
        {cartas.length === 0 ? (
          <View style={styles.emptyContainer}>
            <Text style={[styles.emptyText, { color: theme.textTertiary }]}>Sin cartas</Text>
            <Text style={[styles.emptySubtext, { color: theme.textTertiary }]}>Toca + para subir una carta</Text>
          </View>
        ) : (
          cartas.map((carta) => renderTarjeta(carta))
        )}
      </ScrollView>

      <TouchableOpacity style={[styles.floatingButton, { backgroundColor: theme.primary }]} onPress={uploadCarta}>
        <Text style={[styles.floatingButtonText, { color: theme.text }]}>+</Text>
      </TouchableOpacity>

      <Modal visible={fechaModalOpen} transparent animationType="fade" onRequestClose={() => setFechaModalOpen(false)}>
        <Pressable style={[styles.modalOverlay, { backgroundColor: `${theme.shadow}80` }]} onPress={() => setFechaModalOpen(false)}>
          <Pressable style={[styles.modalCard, { backgroundColor: theme.surface }]} onPress={(e) => e.stopPropagation()}>
            <Text style={[styles.modalTitle, { color: theme.primary }]}>Nueva Carta</Text>
            <Text style={[styles.modalSubtitle, { color: theme.textSecondary }]}>Título de la carta</Text>
            <TextInput style={[styles.fechaInput, { backgroundColor: theme.input, color: theme.text }]} value={tituloCartaTemp} onChangeText={setTituloCartaTemp} placeholder="Ej: Carta de San Valentín" placeholderTextColor={theme.placeholder} />
            <Text style={[styles.modalSubtitle, { color: theme.textSecondary }]}>Fecha de escritura</Text>
            <TextInput style={[styles.fechaInput, { backgroundColor: theme.input, color: theme.text }]} value={fechaEscrituraTemp} onChangeText={setFechaEscrituraTemp} placeholder="Ej: 25/01/2025" placeholderTextColor={theme.placeholder} />
            <Text style={[styles.modalSubtitle, { color: theme.textSecondary }]}>Descripción</Text>
            <TextInput style={[styles.fechaInput, styles.descripcionInput, { backgroundColor: `${theme.primaryLight}40`, color: theme.text }]} value={descripcionTemp} onChangeText={setDescripcionTemp} placeholder="Escribe una descripción..." placeholderTextColor={theme.placeholder} multiline numberOfLines={4} />
            <View style={styles.modalButtons}>
              <Pressable style={[styles.cancelButton, { borderColor: theme.primary }]} onPress={() => { setFechaModalOpen(false); setPendingUpload(null); setTituloCartaTemp(''); }}>
                <Text style={[styles.cancelButtonText, { color: theme.primary }]}>Cancelar</Text>
              </Pressable>
              <Pressable style={[styles.saveButton, { backgroundColor: theme.primary }]} onPress={confirmarUpload}>
                <Text style={[styles.saveButtonText, { color: theme.text }]}>Subir</Text>
              </Pressable>
            </View>
          </Pressable>
        </Pressable>
      </Modal>

      <Modal visible={editingCartaId !== null} transparent animationType="fade" onRequestClose={() => setEditingCartaId(null)}>
        <Pressable style={[styles.modalOverlay, { backgroundColor: `${theme.shadow}80` }]} onPress={() => setEditingCartaId(null)}>
          <Pressable style={[styles.modalCard, { backgroundColor: theme.surface }]} onPress={(e) => e.stopPropagation()}>
            <Text style={[styles.modalTitle, { color: theme.primary }]}>Editar título</Text>
            <TextInput style={[styles.fechaInput, { backgroundColor: theme.input, color: theme.text }]} value={editingTitulo} onChangeText={setEditingTitulo} placeholder="Título de la carta" placeholderTextColor={theme.placeholder} />
            <View style={styles.modalButtons}>
              <Pressable style={[styles.cancelButton, { borderColor: theme.primary }]} onPress={() => setEditingCartaId(null)}>
                <Text style={[styles.cancelButtonText, { color: theme.primary }]}>Cancelar</Text>
              </Pressable>
              <Pressable style={[styles.saveButton, { backgroundColor: theme.primary }]} onPress={async () => { if (editingCartaId) { try { await getClient().database.from('cartas').update({ titulo: editingTitulo }).eq('id', editingCartaId); setEditingCartaId(null); } catch (error) { console.error('Error updating titulo:', error); } } }}>
                <Text style={[styles.saveButtonText, { color: theme.text }]}>Guardar</Text>
              </Pressable>
            </View>
          </Pressable>
        </Pressable>
      </Modal>

      <Modal visible={previewCarta !== null} transparent animationType="fade" onRequestClose={() => setPreviewCarta(null)}>
        <View style={[styles.romanticoOverlay, { backgroundColor: `${theme.shadow}80` }]}>
          <View style={[styles.romanticoTarjeta, { backgroundColor: theme.surface }]}>
            <TouchableOpacity style={styles.romanticoCerrar} onPress={() => setPreviewCarta(null)}>
              <Text style={[styles.romanticoCerrarTexto, { color: theme.textSecondary }]}>✕</Text>
            </TouchableOpacity>

            <View style={styles.romanticoHeader}>
              <Text style={styles.romanticoIcono}>📄</Text>
              <Text style={[styles.romanticoTitulo, { color: theme.text }]} numberOfLines={2}>{previewCarta?.titulo}</Text>
              <Text style={[styles.romanticoFecha, { color: theme.textSecondary }]}>De {previewCarta?.remitente} • {previewCarta?.fecha_escritura || previewCarta?.fecha}</Text>
            </View>

            <View style={[styles.romanticoDivider, { backgroundColor: theme.border }]} />

            <View style={styles.romanticoVisorContainer}>
              <Text style={[styles.romanticoEtiqueta, { color: theme.text }]}>Vista previa de la carta:</Text>
              {previewCarta?.url?.toLowerCase().includes('.pdf') ? (
                <WebView source={{ uri: `https://docs.google.com/viewer?url=${encodeURIComponent(previewCarta?.url || '')}&embedded=true` }} style={{ flex: 1, backgroundColor: 'transparent' }} originWhitelist={['*']} javaScriptEnabled={true} scalesPageToFit={true} scrollEnabled={true} bounces={true} startInLoadingState={true} />
              ) : (
                <View style={[styles.romanticoImageContainer, { backgroundColor: theme.input }]}>
                  <Text style={styles.romanticoImageIcon}>📷</Text>
                  <Text style={[styles.romanticoImageText, { color: theme.textTertiary }]}>Cargando imagen...</Text>
                </View>
              )}
            </View>

            <View style={[styles.romanticoFooter, { backgroundColor: theme.surface }]}>
              <ScrollView style={styles.romanticoDescripcion} showsVerticalScrollIndicator={false}>
                <Text style={[styles.romanticoDescripcionTexto, { color: theme.textSecondary }]}>{previewCarta?.description || 'Sin descripción'}</Text>
              </ScrollView>
              <TouchableOpacity style={[styles.romanticoBoton, { backgroundColor: theme.primary }]} onPress={() => { if (previewCarta?.url) { const urlPDF = previewCarta?.url?.toLowerCase().includes('.pdf') ? `https://docs.google.com/viewer?url=${encodeURIComponent(previewCarta?.url || '')}&embedded=true` : previewCarta?.url; Linking.openURL(urlPDF || ''); } }}>
                <Text style={[styles.romanticoBotonTexto, { color: theme.text }]}>📁 Abrir Documento Completo</Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>
    </View>
    </GestureHandlerRootView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  header: { paddingBottom: 10, paddingHorizontal: 15 },
  title: { fontSize: 24, fontWeight: 'bold' },
  pestanasContainer: { flexDirection: 'row', paddingHorizontal: 15, marginBottom: 15, gap: 10 },
  pestana: { paddingVertical: 10, paddingHorizontal: 20, borderRadius: 20 },
  pestanaTexto: { fontSize: 14, fontWeight: '500' },
  lista: { flex: 1 },
  listaContent: { paddingHorizontal: 15, paddingBottom: 120 },
  tarjeta: { flexDirection: 'row', alignItems: 'center', borderRadius: 15, padding: 15, marginBottom: 12, shadowColor: '#000', shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.08, shadowRadius: 4, elevation: 2 },
  tarjetaIcono: { width: 40, height: 40, borderRadius: 20, alignItems: 'center', justifyContent: 'center', marginRight: 12 },
  tarjetaIconText: { fontSize: 20 },
  tarjetaContent: { flex: 1 },
  tarjetaTitulo: { fontSize: 16, fontWeight: '600' },
  tarjetaSubtitulo: { fontSize: 12, marginTop: 2 },
  emptyContainer: { alignItems: 'center', justifyContent: 'center', paddingTop: 50 },
  emptyText: { fontSize: 18, fontWeight: '600' },
  emptySubtext: { fontSize: 14, marginTop: 5 },
  floatingButton: { position: 'absolute', right: 20, bottom: 85, width: 56, height: 56, borderRadius: 28, alignItems: 'center', justifyContent: 'center', shadowColor: '#000', shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.25, shadowRadius: 4, elevation: 5, zIndex: 10 },
  floatingButtonText: { fontSize: 30, fontWeight: '300' },
  loadingOverlay: { ...StyleSheet.absoluteFillObject, alignItems: 'center', justifyContent: 'center', zIndex: 100 },
  loadingText: { marginTop: 10, fontSize: 16 },
  deleteButton: { justifyContent: 'center', alignItems: 'center', width: 80, marginBottom: 12, borderRadius: 15 },
  deleteButtonText: { fontSize: 24 },
  filterContainer: { position: 'relative', zIndex: 50 },
  filterButton: { paddingVertical: 8, paddingHorizontal: 12, borderRadius: 12, borderWidth: 1 },
  filterButtonText: { fontSize: 12, fontWeight: '600' },
  filterDropdown: { position: 'absolute', top: 40, right: 0, borderRadius: 12, paddingVertical: 8, shadowColor: '#000', shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.15, shadowRadius: 8, elevation: 4, minWidth: 150 },
  filterOption: { paddingVertical: 10, paddingHorizontal: 16 },
  filterOptionText: { fontSize: 14 },
  starButton: { padding: 8 },
  estrella: { fontSize: 20 },
  tarjetaRight: { flexDirection: 'row', alignItems: 'center' },
  moreOptions: { fontSize: 18, padding: 8 },
  optionsMenuContainer: { position: 'absolute', right: 40, top: 10, borderRadius: 16, paddingVertical: 8, shadowColor: '#000', shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.15, shadowRadius: 8, elevation: 4, minWidth: 130, zIndex: 100 },
  optionButton: { paddingVertical: 12, paddingHorizontal: 16 },
  optionText: { fontSize: 14, fontWeight: '600' },
  modalOverlay: { flex: 1, justifyContent: 'center', alignItems: 'center', zIndex: 200 },
  modalCard: { width: '85%', borderRadius: 20, padding: 20 },
  modalTitle: { fontSize: 18, fontWeight: 'bold', marginBottom: 8, textAlign: 'center' },
  modalSubtitle: { fontSize: 14, marginBottom: 15, textAlign: 'center' },
  fechaInput: { borderRadius: 12, padding: 15, fontSize: 16, marginBottom: 20 },
  modalButtons: { flexDirection: 'row', justifyContent: 'space-between', gap: 12 },
  cancelButton: { flex: 1, paddingVertical: 12, borderRadius: 12, borderWidth: 1, alignItems: 'center' },
  cancelButtonText: { fontSize: 14, fontWeight: '600' },
  saveButton: { flex: 1, paddingVertical: 12, borderRadius: 12, alignItems: 'center' },
  saveButtonText: { fontSize: 14, fontWeight: '600' },
  descripcionInput: { minHeight: 100, textAlignVertical: 'top', marginBottom: 15 },
  romanticoOverlay: { flex: 1, justifyContent: 'center', alignItems: 'center', padding: 20 },
  romanticoCerrar: { position: 'absolute', top: 12, right: 12, width: 32, height: 32, justifyContent: 'center', alignItems: 'center', zIndex: 10 },
  romanticoCerrarTexto: { fontSize: 20, fontWeight: '300' },
  romanticoTarjeta: { width: '95%', minHeight: 400, maxHeight: '90%', borderRadius: 28, paddingHorizontal: 16, overflow: 'hidden', shadowColor: '#000', shadowOffset: { width: 0, height: 8 }, shadowOpacity: 0.2, shadowRadius: 20, elevation: 12 },
  romanticoHeader: { alignItems: 'center', paddingTop: 20, paddingBottom: 8 },
  romanticoIcono: { fontSize: 36, marginBottom: 8 },
  romanticoTitulo: { fontSize: 18, fontWeight: '800', textAlign: 'center', marginTop: 4, lineHeight: 24 },
  romanticoFecha: { fontSize: 12, fontWeight: '400', marginTop: 4, textAlign: 'center' },
  romanticoDivider: { height: 1, marginVertical: 12 },
  romanticoVisorContainer: { height: '55%', minHeight: 350, backgroundColor: 'transparent' },
  romanticoImageContainer: { flex: 1, justifyContent: 'center', alignItems: 'center' },
  romanticoImageIcon: { fontSize: 48 },
  romanticoImageText: { marginTop: 8, fontSize: 14 },
  romanticoFooter: { paddingHorizontal: 16, paddingVertical: 16, paddingBottom: 24 },
  romanticoDescripcion: { maxHeight: 100 },
  romanticoDescripcionTexto: { fontSize: 14, lineHeight: 20, textAlign: 'center' },
  romanticoEtiqueta: { fontSize: 14, fontWeight: '700', marginBottom: 8 },
  romanticoBoton: { borderRadius: 30, paddingVertical: 16, width: '100%', alignItems: 'center', justifyContent: 'center' },
  romanticoBotonTexto: { fontSize: 16, fontWeight: '700' },
});
