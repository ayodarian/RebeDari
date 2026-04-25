import { View, Text, StyleSheet, ScrollView, Pressable, TouchableOpacity, ActivityIndicator, Alert, Linking, TextInput, Modal, Dimensions } from 'react-native';
import { WebView } from 'react-native-webview';

import { GestureHandlerRootView } from 'react-native-gesture-handler';
import { useState, useEffect } from 'react';
import { Swipeable } from 'react-native-gesture-handler';
import * as DocumentPicker from 'expo-document-picker';
import * as Sharing from 'expo-sharing';
import { collection, addDoc, onSnapshot, deleteDoc, doc, query, orderBy, where, updateDoc, getDocs, limit, startAfter } from 'firebase/firestore';
import { db, uploadFile, deleteFile } from '../../lib/firebase';



interface Carta {
  id: string;
  titulo: string;
  url: string;
  path: string;
  remitente: string;
  fecha: string;
  fechaEscritura?: string;
  description: string;
  favorita?: boolean;
  tipo?: 'pdf' | 'imagen';
  created_at: string;
}

export default function CartasScreen() {
  const [pestanaActiva, setPestanaActiva] = useState<'Lebebe' | 'Darian'>('Lebebe');
  const [cartas, setCartas] = useState<Carta[]>([]);
  const [uploading, setUploading] = useState(false);
  const [filterMode, setFilterMode] = useState<'recientes' | 'fecha' | 'favoritas' | 'aleatorias'>('recientes');
  const [showDropdown, setShowDropdown] = useState(false);
  const [fechaModalOpen, setFechaModalOpen] = useState(false);
  const [fechaEscrituraTemp, setFechaEscrituraTemp] = useState('');
  const [pendingUpload, setPendingUpload] = useState<{uri: string; name: string} | null>(null);
  const [cartaOptionsId, setCartaOptionsId] = useState<string | null>(null);
  const [editingCartaId, setEditingCartaId] = useState<string | null>(null);
  const [editingTitulo, setEditingTitulo] = useState('');
  const [descripcionTemp, setDescripcionTemp] = useState('');
  const [tituloCartaTemp, setTituloCartaTemp] = useState('');
  const [previewCarta, setPreviewCarta] = useState<Carta | null>(null);

  useEffect(() => {
    const cartasQuery = query(
      collection(db, 'cartas'),
      where('remitente', '==', pestanaActiva),
      orderBy('created_at', 'desc'),
      limit(CARTAS_PAGE)
    );
    
    const unsubscribe = onSnapshot(cartasQuery, (snapshot) => {
      let cartasData = snapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data()
      })) as Carta[];

      switch (filterMode) {
        case 'recientes':
          // ya vienen ordenadas por created_at desc
          break;
        case 'fecha':
          cartasData.sort((a, b) => {
            const fechaA = a.fechaEscritura ? new Date(a.fechaEscritura).getTime() : 0;
            const fechaB = b.fechaEscritura ? new Date(b.fechaEscritura).getTime() : 0;
            return fechaB - fechaA;
          });
          break;
        case 'favoritas':
          cartasData = cartasData.filter(c => c.favorita);
          break;
        case 'aleatorias':
          cartasData.sort(() => Math.random() - 0.5);
          break;
      }

      setCartas(cartasData);
      if (snapshot.docs.length > 0) {
        setLastVisibleCartas(snapshot.docs[snapshot.docs.length - 1]);
        setHasMoreCartas(snapshot.docs.length === CARTAS_PAGE);
      } else setHasMoreCartas(false);
    });

    return () => unsubscribe();
  }, [pestanaActiva, filterMode]);

  const loadMoreCartas = async () => {
    if (!hasMoreCartas || moreLoadingCartas || !lastVisibleCartas) return;
    setMoreLoadingCartas(true);
    try {
      const moreQuery = query(collection(db, 'cartas'), where('remitente', '==', pestanaActiva), orderBy('created_at', 'desc'), startAfter(lastVisibleCartas), limit(CARTAS_PAGE));
      const snap = await getDocs(moreQuery);
      const newCartas = snap.docs.map(doc => ({ id: doc.id, ...doc.data() })) as Carta[];
      if (newCartas.length > 0) {
        setCartas(prev => [...prev, ...newCartas]);
        setLastVisibleCartas(snap.docs[snap.docs.length - 1]);
      }
      if (newCartas.length < CARTAS_PAGE) setHasMoreCartas(false);
    } catch (e) {
      console.error('Error cargando más cartas', e);
    } finally {
      setMoreLoadingCartas(false);
    }
  };

  const uploadCarta = async () => {
    try {
      const result = await DocumentPicker.getDocumentAsync({
        type: 'application/pdf',
      });

      if (!result.canceled && result.assets && result.assets[0]) {
        setPendingUpload({ uri: result.assets[0].uri, name: result.assets[0].name });
        setFechaEscrituraTemp('');
        setDescripcionTemp('');
        setTituloCartaTemp('');
        setFechaModalOpen(true);
      }
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Error desconocido';
      Alert.alert('Error', `No se pudo seleccionar el archivo. Detalles: ${errorMessage}`);
      console.error(error);
    }
  };

  const confirmarUpload = async () => {
    if (!pendingUpload) return;
    
    if (!tituloCartaTemp.trim()) {
      Alert.alert('Error', 'Por favor ingresa un título para la carta');
      return;
    }
    if (!fechaEscrituraTemp.trim()) {
      Alert.alert('Error', 'Por favor ingresa la fecha de escritura');
      return;
    }
    if (!descripcionTemp.trim()) {
      Alert.alert('Error', 'Por favor ingresa una descripción');
      return;
    }

    setFechaModalOpen(false);
    setUploading(true);

    const timestamp = Date.now();
    const extension = pendingUpload.name.split('.').pop()?.toLowerCase() || 'pdf';
    const path = `cartas/${pestanaActiva}/${timestamp}.${extension}`;

    try {
      const url = await uploadFile(pendingUpload.uri, path);
      const titulo = tituloCartaTemp.trim();

      await addDoc(collection(db, 'cartas'), {
        titulo,
        url,
        path,
        remitente: pestanaActiva,
        fecha: new Date().toLocaleDateString('es-MX'),
        fechaEscritura: fechaEscrituraTemp,
        description: descripcionTemp.trim(),
        favorita: false,
        created_at: new Date().toISOString(),
      });

      Alert.alert('Éxito', 'Carta subida correctamente');
    } catch (uploadError) {
      const errorMessage = uploadError instanceof Error ? uploadError.message : 'Error desconocido';
      Alert.alert('Error de subida', `No se pudo subir el archivo. Detalles: ${errorMessage}`);
      console.error('Upload error:', uploadError);
    } finally {
      setUploading(false);
      setPendingUpload(null);
      setFechaEscrituraTemp('');
      setDescripcionTemp('');
      setTituloCartaTemp('');
    }
  };

  const toggleFavorita = async (carta: Carta) => {
    try {
      await updateDoc(doc(db, 'cartas', carta.id), {
        favorita: !carta.favorita
      });
    } catch (error) {
      console.error('Error toggling favorite:', error);
    }
  };

  const abrirCarta = (carta: Carta) => {
    setPreviewCarta(carta);
  };

  const eliminarCarta = async (carta: Carta) => {
    Alert.alert(
      'Eliminar Carta',
      '¿Estás seguro que deseas eliminar esta carta?',
      [
        { text: 'Cancelar', style: 'cancel' },
        { 
          text: 'Eliminar', 
          style: 'destructive',
          onPress: async () => {
            try {
              await deleteFile(carta.path);
              await deleteDoc(doc(db, 'cartas', carta.id));
            } catch (error) {
              Alert.alert('Error', 'No se pudo eliminar la carta');
              console.error('Error deleting carta:', error);
            }
          }
        },
      ]
    );
  };

  const renderRightActions = (carta: Carta) => (
    <TouchableOpacity 
      style={styles.deleteButton} 
      onPress={() => eliminarCarta(carta)}
    >
      <Text style={styles.deleteButtonText}>🗑️</Text>
    </TouchableOpacity>
  );

  const renderTarjeta = (carta: Carta, index: number) => {
    return (
    <Swipeable
      key={carta.id}
      renderRightActions={() => renderRightActions(carta)}
      overshootRight={false}
    >
      <TouchableOpacity
        style={styles.tarjeta}
        onPress={() => abrirCarta(carta)}
      >
        <View style={styles.tarjetaIcono}>
          <Text style={styles.tarjetaIconText}>💌</Text>
        </View>
        <View style={styles.tarjetaContent}>
          <Text style={styles.tarjetaTitulo}>{carta.titulo}</Text>
          <Text style={styles.tarjetaSubtitulo}>
            De {carta.remitente} • {carta.fechaEscritura || carta.fecha}
          </Text>
        </View>
        <View style={styles.tarjetaRight}>
          <TouchableOpacity style={styles.starButton} onPress={() => toggleFavorita(carta)}>
            <Text style={[styles.estrella, carta.favorita ? styles.estrellaActiva : styles.estrellaInactiva]}>
              {carta.favorita ? '★' : '☆'}
            </Text>
          </TouchableOpacity>
          <TouchableOpacity onPress={() => setCartaOptionsId(cartaOptionsId === carta.id ? null : carta.id)}>
            <Text style={styles.moreOptions}>⋮</Text>
          </TouchableOpacity>
          {cartaOptionsId === carta.id && (
            <Pressable style={styles.optionsMenuContainer} onPress={(e) => e.stopPropagation()}>
              <Pressable 
                style={styles.optionButton} 
                onPress={() => {
                  setCartaOptionsId(null);
                  setEditingCartaId(carta.id);
                  setEditingTitulo(carta.titulo);
                }}
              >
                <Text style={styles.optionText}>Editar título</Text>
              </Pressable>
              <Pressable 
                style={styles.optionButton} 
                onPress={() => {
                  setCartaOptionsId(null);
                  eliminarCarta(carta);
                }}
              >
                <Text style={[styles.optionText, styles.optionDeleteText]}>Eliminar</Text>
              </Pressable>
            </Pressable>
          )}
        </View>
      </TouchableOpacity>
    </Swipeable>
    );
  };

  return (
    <GestureHandlerRootView style={{ flex: 1 }}>
    <View style={styles.container}>
      {uploading && (
        <View style={styles.loadingOverlay}>
          <ActivityIndicator size="large" color="#FF6B9D" />
          <Text style={styles.loadingText}>Subiendo carta...</Text>
        </View>
      )}
      
      <View style={[styles.header, { paddingTop: 5, flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' }]}>
        <Text style={styles.title}>Cartas</Text>
        <View style={styles.filterContainer}>
          <TouchableOpacity style={styles.filterButton} onPress={() => setShowDropdown(!showDropdown)}>
            <Text style={styles.filterButtonText}>≡ {filterMode === 'recientes' ? 'Recientes' : filterMode === 'fecha' ? 'Fecha' : filterMode === 'favoritas' ? 'Favoritas' : 'Aleatorias'}</Text>
          </TouchableOpacity>
          {showDropdown && (
            <View style={styles.filterDropdown}>
              <TouchableOpacity style={styles.filterOption} onPress={() => { setFilterMode('recientes'); setShowDropdown(false); }}>
                <Text style={styles.filterOptionText}>Recientes</Text>
              </TouchableOpacity>
              <TouchableOpacity style={styles.filterOption} onPress={() => { setFilterMode('fecha'); setShowDropdown(false); }}>
                <Text style={styles.filterOptionText}>Fecha de escritura</Text>
              </TouchableOpacity>
              <TouchableOpacity style={styles.filterOption} onPress={() => { setFilterMode('favoritas'); setShowDropdown(false); }}>
                <Text style={styles.filterOptionText}>Favoritas</Text>
              </TouchableOpacity>
              <TouchableOpacity style={styles.filterOption} onPress={() => { setFilterMode('aleatorias'); setShowDropdown(false); }}>
                <Text style={styles.filterOptionText}>Aleatorias</Text>
              </TouchableOpacity>
            </View>
          )}
        </View>
      </View>
      
      <View style={styles.pestanasContainer}>
        <Pressable
          style={[styles.pestana, pestanaActiva === 'Lebebe' && styles.pestanaActivaLebebe]}
          onPress={() => setPestanaActiva('Lebebe')}
        >
          <Text style={[styles.pestanaTexto, pestanaActiva === 'Lebebe' && styles.pestanaTextoActivo]}>
            Lebebe
          </Text>
        </Pressable>
        <Pressable
          style={[styles.pestana, pestanaActiva === 'Darian' && styles.pestanaActivaDarian]}
          onPress={() => setPestanaActiva('Darian')}
        >
          <Text style={[styles.pestanaTexto, pestanaActiva === 'Darian' && styles.pestanaTextoActivo]}>
            Darianzin
          </Text>
        </Pressable>
      </View>

      <ScrollView
        style={styles.lista}
        contentContainerStyle={styles.listaContent}
        showsVerticalScrollIndicator={false}
        onScrollBeginDrag={() => setCartaOptionsId(null)}
        onScroll={({ nativeEvent }) => {
          const { layoutMeasurement, contentOffset, contentSize } = nativeEvent;
          // cuando estemos a menos de 200px del final, cargamos más
          if (layoutMeasurement.height + contentOffset.y >= contentSize.height - 200) {
            loadMoreCartas();
          }
        }}
        scrollEventThrottle={250}
      >
        {cartas.length === 0 ? (
          <View style={styles.emptyContainer}>
            <Text style={styles.emptyText}>Sin cartas</Text>
            <Text style={styles.emptySubtext}>Toca + para subir una carta</Text>
          </View>
        ) : (
          cartas.map((carta, index) => renderTarjeta(carta, index))
        )}

        {/* carga automática al llegar al final (si hay más) */}
      </ScrollView>
      
      <TouchableOpacity style={styles.floatingButton} onPress={uploadCarta}>
        <Text style={styles.floatingButtonText}>+</Text>
      </TouchableOpacity>

      <Modal
        visible={fechaModalOpen}
        transparent
        animationType="fade"
        onRequestClose={() => setFechaModalOpen(false)}
      >
        <Pressable style={styles.modalOverlay} onPress={() => setFechaModalOpen(false)}>
          <Pressable style={styles.modalCard} onPress={(e) => e.stopPropagation()}>
            <Text style={styles.modalTitle}>Nueva Carta</Text>
            <Text style={styles.modalSubtitle}>Título de la carta</Text>
            <TextInput
              style={styles.fechaInput}
              value={tituloCartaTemp}
              onChangeText={setTituloCartaTemp}
              placeholder="Ej: Carta de San Valentín"
              placeholderTextColor="#8E8E93"
            />
            <Text style={styles.modalSubtitle}>Fecha de escritura</Text>
            <TextInput
              style={styles.fechaInput}
              value={fechaEscrituraTemp}
              onChangeText={setFechaEscrituraTemp}
              placeholder="Ej: 25/01/2025"
              placeholderTextColor="#8E8E93"
            />
            <Text style={styles.modalSubtitle}>Descripción</Text>
            <TextInput
              style={[styles.fechaInput, styles.descripcionInput]}
              value={descripcionTemp}
              onChangeText={setDescripcionTemp}
              placeholder="Escribe una descripción..."
              placeholderTextColor="#8E8E93"
              multiline
              numberOfLines={4}
            />
            <View style={styles.modalButtons}>
              <Pressable style={styles.cancelButton} onPress={() => { setFechaModalOpen(false); setPendingUpload(null); setTituloCartaTemp(''); }}>
                <Text style={styles.cancelButtonText}>Cancelar</Text>
              </Pressable>
              <Pressable style={styles.saveButton} onPress={confirmarUpload}>
                <Text style={styles.saveButtonText}>Subir</Text>
              </Pressable>
            </View>
          </Pressable>
        </Pressable>
      </Modal>

      <Modal
        visible={editingCartaId !== null}
        transparent
        animationType="fade"
        onRequestClose={() => setEditingCartaId(null)}
      >
        <Pressable style={styles.modalOverlay} onPress={() => setEditingCartaId(null)}>
          <Pressable style={styles.modalCard} onPress={(e) => e.stopPropagation()}>
            <Text style={styles.modalTitle}>Editar título</Text>
            <TextInput
              style={styles.fechaInput}
              value={editingTitulo}
              onChangeText={setEditingTitulo}
              placeholder="Título de la carta"
              placeholderTextColor="#8E8E93"
            />
            <View style={styles.modalButtons}>
              <Pressable style={styles.cancelButton} onPress={() => setEditingCartaId(null)}>
                <Text style={styles.cancelButtonText}>Cancelar</Text>
              </Pressable>
              <Pressable 
                style={styles.saveButton} 
                onPress={async () => {
                  if (editingCartaId) {
                    try {
                      await updateDoc(doc(db, 'cartas', editingCartaId), { titulo: editingTitulo });
                      setEditingCartaId(null);
                    } catch (error) {
                      console.error('Error updating titulo:', error);
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
        visible={previewCarta !== null}
        transparent
        animationType="fade"
        onRequestClose={() => setPreviewCarta(null)}
      >
        <View style={styles.romanticoOverlay}>
          <View style={styles.romanticoTarjeta}>
            <TouchableOpacity 
              style={styles.romanticoCerrar} 
              onPress={() => setPreviewCarta(null)}
            >
              <Text style={styles.romanticoCerrarTexto}>✕</Text>
            </TouchableOpacity>
            
            <View style={styles.romanticoHeader}>
              <Text style={styles.romanticoIcono}>📄</Text>
              <Text style={styles.romanticoTitulo} numberOfLines={2}>
                {previewCarta?.titulo}
              </Text>
              <Text style={styles.romanticoFecha}>
                De {previewCarta?.remitente} • {previewCarta?.fechaEscritura || previewCarta?.fecha}
              </Text>
            </View>
            
            <View style={styles.romanticoDivider} />
            
            <View style={styles.romanticoVisorContainer}>
              <Text style={styles.romanticoEtiqueta}>Vista previa de la carta:</Text>
              {previewCarta?.url?.toLowerCase().includes('.pdf') ? (
                <WebView
                  source={{ uri: `https://docs.google.com/viewer?url=${encodeURIComponent(previewCarta?.url || '')}&embedded=true` }}
                  style={{ flex: 1, backgroundColor: 'transparent' }}
                  originWhitelist={['*']}
                  javaScriptEnabled={true}
                  scalesPageToFit={true}
                  scrollEnabled={true}
                  bounces={true}
                  startInLoadingState={true}
                />
              ) : (
                <View style={styles.romanticoImageContainer}>
                  <Text style={styles.romanticoImageIcon}>📷</Text>
                  <Text style={styles.romanticoImageText}>Cargando imagen...</Text>
                </View>
              )}
            </View>
            
            <View style={styles.romanticoFooter}>
              <ScrollView style={styles.romanticoDescripcion} showsVerticalScrollIndicator={false}>
                <Text style={styles.romanticoDescripcionTexto}>
                  {previewCarta?.description || 'Sin descripción'}
                </Text>
              </ScrollView>
              <TouchableOpacity 
                style={styles.romanticoBoton}
                onPress={() => {
                  if (previewCarta?.url) {
                    const urlPDF = previewCarta?.url?.toLowerCase().includes('.pdf') 
                      ? `https://docs.google.com/viewer?url=${encodeURIComponent(previewCarta?.url || '')}&embedded=true`
                      : previewCarta?.url;
                    Linking.openURL(urlPDF || '');
                  }
                }}
              >
                <Text style={styles.romanticoBotonTexto}>📁 Abrir Documento Completo</Text>
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
  pestanasContainer: {
    flexDirection: 'row',
    paddingHorizontal: 15,
    marginBottom: 15,
    gap: 10,
  },
  pestana: {
    paddingVertical: 10,
    paddingHorizontal: 20,
    borderRadius: 20,
    backgroundColor: '#F5F5F5',
  },
  pestanaActivaLebebe: {
    backgroundColor: '#FFB6C1',
  },
  pestanaActivaDarian: {
    backgroundColor: '#98FB98',
  },
  pestanaTexto: {
    fontSize: 14,
    color: '#666666',
    fontWeight: '500',
  },
  pestanaTextoActivo: {
    color: '#333333',
    fontWeight: '600',
  },
  lista: {
    flex: 1,
  },
  listaContent: {
    paddingHorizontal: 15,
    paddingBottom: 120,
  },
  tarjeta: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#FFFFFF',
    borderRadius: 15,
    padding: 15,
    marginBottom: 12,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.08,
    shadowRadius: 4,
    elevation: 2,
  },
  tarjetaIcono: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: 'rgba(255, 182, 193, 0.2)',
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 12,
  },
  tarjetaIconText: {
    fontSize: 20,
  },
  tarjetaContent: {
    flex: 1,
  },
  tarjetaTitulo: {
    fontSize: 16,
    fontWeight: '600',
    color: '#333333',
  },
  tarjetaSubtitulo: {
    fontSize: 12,
    color: '#8E8E93',
    marginTop: 2,
  },
  emptyContainer: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingTop: 50,
  },
  emptyText: {
    fontSize: 18,
    color: '#8E8E93',
    fontWeight: '600',
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
  loadMoreButton: {
    marginTop: 10,
    marginBottom: 40,
    alignSelf: 'center',
    paddingVertical: 10,
    paddingHorizontal: 20,
    backgroundColor: 'rgba(255, 107, 157, 0.12)',
    borderRadius: 12,
  },
  loadMoreText: {
    color: '#FF6B9D',
    fontWeight: '600',
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
  deleteButton: {
    backgroundColor: '#FF4444',
    justifyContent: 'center',
    alignItems: 'center',
    width: 80,
    marginBottom: 12,
    borderRadius: 15,
  },
  deleteButtonText: {
    fontSize: 24,
  },
  filterContainer: {
    position: 'relative',
    zIndex: 50,
  },
  filterButton: {
    backgroundColor: '#FFFFFF',
    paddingVertical: 8,
    paddingHorizontal: 12,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#FF6B9D',
  },
  filterButtonText: {
    color: '#FF6B9D',
    fontSize: 12,
    fontWeight: '600',
  },
  filterDropdown: {
    position: 'absolute',
    top: 40,
    right: 0,
    backgroundColor: '#FFFFFF',
    borderRadius: 12,
    paddingVertical: 8,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.15,
    shadowRadius: 8,
    elevation: 4,
    minWidth: 150,
  },
  filterOption: {
    paddingVertical: 10,
    paddingHorizontal: 16,
  },
  filterOptionText: {
    fontSize: 14,
    color: '#333333',
  },
  starButton: {
    padding: 8,
  },
  estrella: {
    fontSize: 20,
  },
  estrellaActiva: {
    color: '#FFD700',
  },
  estrellaInactiva: {
    color: '#8E8E93',
  },
  tarjetaRight: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  moreOptions: {
    fontSize: 18,
    color: '#8E8E93',
    padding: 8,
  },
  optionsMenuContainer: {
    position: 'absolute',
    right: 40,
    top: 10,
    backgroundColor: '#FFFFFF',
    borderRadius: 16,
    paddingVertical: 8,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.15,
    shadowRadius: 8,
    elevation: 4,
    minWidth: 130,
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
  previewModalContainer: {
    flex: 1,
    backgroundColor: 'rgba(255, 245, 248, 0.95)',
    justifyContent: 'center',
    alignItems: 'center',
    padding: 15,
  },
  previewCard: {
    width: '100%',
    height: '95%',
    backgroundColor: '#FFFFFF',
    borderRadius: 24,
    overflow: 'hidden',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.15,
    shadowRadius: 12,
    elevation: 8,
  },
  previewHeaderCard: {
    paddingHorizontal: 20,
    paddingTop: 20,
    paddingBottom: 15,
    backgroundColor: '#FFF5F8',
    borderBottomWidth: 1,
    borderBottomColor: 'rgba(255, 107, 157, 0.1)',
  },
  previewHeaderTop: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 15,
  },
  cartaAvatar: {
    width: 56,
    height: 56,
    borderRadius: 28,
    backgroundColor: 'rgba(255, 107, 157, 0.15)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  cartaAvatarText: {
    fontSize: 28,
  },
  closeButtonCard: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: 'rgba(255, 107, 157, 0.1)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  closeButtonCardText: {
    fontSize: 18,
    color: '#FF6B9D',
    fontWeight: 'bold',
  },
  previewTitleCard: {
    fontSize: 22,
    fontWeight: 'bold',
    color: '#333333',
    marginBottom: 8,
    lineHeight: 28,
  },
  previewFechaCard: {
    fontSize: 14,
    color: '#FF6B9D',
    fontWeight: '500',
  },
  pdfContainerCard: {
    flex: 1,
    backgroundColor: '#F5F5F5',
  },
  pdfViewCard: {
    flex: 1,
    backgroundColor: '#F5F5F5',
  },
  previewFooterCard: {
    paddingHorizontal: 20,
    paddingVertical: 15,
    backgroundColor: '#FFFFFF',
    borderTopWidth: 1,
    borderTopColor: 'rgba(255, 107, 157, 0.1)',
  },
  previewDescripcionCard: {
    maxHeight: 100,
    marginBottom: 12,
  },
  previewDescripcionTextCard: {
    fontSize: 14,
    color: '#666666',
    lineHeight: 20,
  },
  abrirButtonCard: {
    backgroundColor: '#FF6B9D',
    borderRadius: 25,
    paddingVertical: 14,
    alignItems: 'center',
  },
  abrirButtonTextCard: {
    color: '#FFFFFF',
    fontSize: 15,
    fontWeight: '700',
  },
  modalCard: {
    width: '85%',
    backgroundColor: '#FFFFFF',
    borderRadius: 20,
    padding: 20,
  },
  modalTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#FF6B9D',
    marginBottom: 8,
    textAlign: 'center',
  },
  modalSubtitle: {
    fontSize: 14,
    color: '#666666',
    marginBottom: 15,
    textAlign: 'center',
  },
  fechaInput: {
    backgroundColor: '#F5F5F5',
    borderRadius: 12,
    padding: 15,
    fontSize: 16,
    color: '#333333',
    marginBottom: 20,
  },
  modalButtons: {
    flexDirection: 'row',
    justifyContent: 'space-between',
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
  descripcionInput: {
    backgroundColor: 'rgba(255, 182, 193, 0.25)',
    minHeight: 100,
    textAlignVertical: 'top',
    marginBottom: 15,
  },
  previewModalCard: {
    width: '95%',
    height: '90%',
    backgroundColor: '#FFF5F8',
    borderRadius: 24,
    padding: 20,
  },
  previewHeader: {
    position: 'absolute',
    top: 50,
    left: 0,
    right: 0,
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 15,
    paddingVertical: 10,
    zIndex: 10,
    backgroundColor: 'rgba(255, 245, 248, 0.9)',
  },
  previewTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#FF6B9D',
    flex: 1,
    textAlign: 'center',
    marginHorizontal: 10,
  },
  pdfContainer: {
    flex: 1,
    backgroundColor: '#FFFFFF',
  },
  previewOverlay: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    backgroundColor: 'rgba(255, 107, 157, 0.95)',
    paddingHorizontal: 20,
    paddingTop: 15,
    paddingBottom: 35,
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
  },
  overlayTopRow: {
    flexDirection: 'row',
    justifyContent: 'center',
    marginBottom: 10,
  },
  overlayFecha: {
    fontSize: 14,
    color: '#FFFFFF',
    fontWeight: '600',
  },
  overlayDescripcion: {
    maxHeight: 80,
    marginBottom: 12,
  },
  overlayDescripcionText: {
    fontSize: 14,
    color: '#FFFFFF',
    lineHeight: 20,
    textAlign: 'center',
  },
  closeButton: {
    padding: 8,
    width: 40,
    height: 40,
    alignItems: 'center',
    justifyContent: 'center',
  },
  closeButtonText: {
    fontSize: 22,
    color: '#FF6B9D',
    fontWeight: 'bold',
  },
  previewImageContainer: {
    height: '55%',
    backgroundColor: '#FFFFFF',
    borderRadius: 16,
    overflow: 'hidden',
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 15,
  },
  previewImagen: {
    width: '100%',
    height: '100%',
  },
  pdfIconContainer: {
    alignItems: 'center',
    justifyContent: 'center',
  },
  pdfIconEmoji: {
    fontSize: 80,
    marginBottom: 10,
  },
  pdfLabel: {
    fontSize: 16,
    color: '#FF6B9D',
    fontWeight: '600',
  },
  pdfViewerContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20,
  },
  pdfWebView: {
    flex: 1,
    backgroundColor: '#FFFFFF',
    borderRadius: 12,
  },
  pdfViewerTitle: {
    fontSize: 14,
    color: '#888888',
    marginBottom: 20,
  },
  pdfViewerButton: {
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: 'rgba(255, 107, 157, 0.1)',
    borderRadius: 20,
    padding: 30,
    borderWidth: 2,
    borderColor: '#FF6B9D',
    borderStyle: 'dashed',
  },
  pdfViewerEmoji: {
    fontSize: 60,
    marginBottom: 15,
  },
  pdfViewerText: {
    fontSize: 16,
    color: '#FF6B9D',
    fontWeight: '600',
  },
  previewInfoContainer: {
    flex: 1,
    backgroundColor: 'rgba(255, 255, 255, 0.7)',
    borderRadius: 16,
    padding: 15,
  },
  previewFechaRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 12,
    paddingBottom: 12,
    borderBottomWidth: 1,
    borderBottomColor: 'rgba(255, 107, 157, 0.2)',
  },
  previewFechaIcon: {
    fontSize: 16,
    marginRight: 8,
  },
  previewFechaText: {
    fontSize: 14,
    color: '#FF6B9D',
    fontWeight: '600',
  },
  previewDescripcion: {
    flex: 1,
  },
  previewDescripcionLabel: {
    fontSize: 13,
    color: '#FF6B9D',
    fontWeight: '700',
    marginBottom: 6,
  },
  previewDescripcionText: {
    fontSize: 14,
    color: '#444444',
    lineHeight: 22,
  },
  abrirButton: {
    backgroundColor: '#FFFFFF',
    borderRadius: 25,
    paddingVertical: 14,
    paddingHorizontal: 25,
    alignItems: 'center',
  },
  abrirButtonText: {
    color: '#FF6B9D',
    fontSize: 15,
    fontWeight: '700',
  },
  previewCardLimpio: {
    width: '95%',
    maxHeight: '90%',
    backgroundColor: '#FFFFFF',
    borderRadius: 20,
    overflow: 'hidden',
  },
  previewHeaderLimpio: {
    paddingHorizontal: 20,
    paddingTop: 20,
    paddingBottom: 12,
    backgroundColor: '#FFF5F8',
  },
  previewTituloLimpio: {
    fontSize: 22,
    fontWeight: 'bold',
    color: '#333333',
    marginBottom: 8,
    lineHeight: 28,
  },
  previewFechaLimpio: {
    fontSize: 14,
    color: '#FF6B9D',
    fontWeight: '600',
  },
  previewDescripcionLimpio: {
    maxHeight: 100,
    paddingHorizontal: 20,
    paddingVertical: 12,
    backgroundColor: '#FFFFFF',
  },
  previewDescripcionTextoLimpio: {
    fontSize: 14,
    color: '#666666',
    lineHeight: 20,
  },
  pdfContainerLimpio: {
    flex: 1,
    minHeight: 300,
    backgroundColor: '#F5F5F5',
  },
  pdfWebViewLimpio: {
    flex: 1,
    backgroundColor: '#F5F5F5',
  },
  romanticoOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20,
  },
  romanticoCerrar: {
    position: 'absolute',
    top: 12,
    right: 12,
    width: 32,
    height: 32,
    justifyContent: 'center',
    alignItems: 'center',
    zIndex: 10,
  },
  romanticoCerrarTexto: {
    fontSize: 20,
    color: '#666666',
    fontWeight: '300',
  },
  romanticoTarjeta: {
    width: '95%',
    minHeight: 400,
    maxHeight: '90%',
    backgroundColor: '#FFFFFF',
    borderRadius: 28,
    paddingHorizontal: 16,
    overflow: 'hidden',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.2,
    shadowRadius: 20,
    elevation: 12,
  },
  romanticoHeader: {
    alignItems: 'center',
    paddingTop: 20,
    paddingBottom: 8,
  },
  romanticoIcono: {
    fontSize: 36,
    marginBottom: 8,
  },
  romanticoTitulo: {
    fontSize: 18,
    fontWeight: '800',
    color: '#000000',
    textAlign: 'center',
    marginTop: 4,
    lineHeight: 24,
  },
  romanticoFecha: {
    fontSize: 12,
    color: '#666666',
    fontWeight: '400',
    marginTop: 4,
    textAlign: 'center',
  },
  romanticoDivider: {
    height: 1,
    backgroundColor: '#E0E0E0',
    marginVertical: 12,
  },
  romanticoVisorContainer: {
    height: '55%',
    minHeight: 350,
    backgroundColor: 'transparent',
  },
  romanticoWebView: {
    flex: 1,
    backgroundColor: 'transparent',
  },
  romanticoImageContainer: {
    flex: 1,
    backgroundColor: '#F5F5F5',
    justifyContent: 'center',
    alignItems: 'center',
  },
  romanticoImageIcon: {
    fontSize: 48,
  },
  romanticoImageText: {
    marginTop: 8,
    fontSize: 14,
    color: '#888888',
  },
  romanticoFooter: {
    paddingHorizontal: 16,
    paddingVertical: 16,
    paddingBottom: 24,
    backgroundColor: '#FFFFFF',
  },
  romanticoDescripcion: {
    maxHeight: 100,
  },
  romanticoDescripcionTexto: {
    fontSize: 14,
    color: '#666666',
    lineHeight: 20,
    textAlign: 'center',
  },
  romanticoEtiqueta: {
    fontSize: 14,
    fontWeight: '700',
    color: '#000000',
    marginBottom: 8,
  },
  romanticoBoton: {
    backgroundColor: '#FF6B9D',
    borderRadius: 30,
    paddingVertical: 16,
    width: '100%',
    alignItems: 'center',
    justifyContent: 'center',
  },
  romanticoBotonTexto: {
    color: '#FFFFFF',
    fontSize: 16,
    fontWeight: '700',
  },
});
  const [lastVisibleCartas, setLastVisibleCartas] = useState<any>(null);
  const [moreLoadingCartas, setMoreLoadingCartas] = useState(false);
  const [hasMoreCartas, setHasMoreCartas] = useState(true);
  const CARTAS_PAGE = 12;
