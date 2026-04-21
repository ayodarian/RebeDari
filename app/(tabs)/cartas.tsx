import { View, Text, StyleSheet, ScrollView, Pressable, TouchableOpacity, ActivityIndicator, Alert, Linking, TextInput, Modal } from 'react-native';
import { GestureHandlerRootView } from 'react-native-gesture-handler';
import { useState, useEffect } from 'react';
import { Swipeable } from 'react-native-gesture-handler';
import * as DocumentPicker from 'expo-document-picker';
import * as Sharing from 'expo-sharing';
import { collection, addDoc, onSnapshot, deleteDoc, doc, query, orderBy, where, updateDoc } from 'firebase/firestore';
import { db, uploadFile, deleteFile } from '../../lib/firebase';

interface Carta {
  id: string;
  titulo: string;
  url: string;
  path: string;
  remitente: string;
  fecha: string;
  fechaEscritura?: string;
  favorita?: boolean;
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

  useEffect(() => {
    const cartasQuery = query(
      collection(db, 'cartas'),
      where('remitente', '==', pestanaActiva)
    );
    
    const unsubscribe = onSnapshot(cartasQuery, (snapshot) => {
      let cartasData = snapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data()
      })) as Carta[];

      switch (filterMode) {
        case 'recientes':
          cartasData.sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime());
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
    });

    return () => unsubscribe();
  }, [pestanaActiva, filterMode]);

  const uploadCarta = async () => {
    try {
      const result = await DocumentPicker.getDocumentAsync({
        type: 'application/pdf',
      });

      if (!result.canceled && result.assets && result.assets[0]) {
        setPendingUpload({ uri: result.assets[0].uri, name: result.assets[0].name });
        setFechaEscrituraTemp('');
        setFechaModalOpen(true);
      }
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Error desconocido';
      Alert.alert('Error', `No se pudo seleccionar el archivo. Detalles: ${errorMessage}`);
      console.error(error);
    }
  };

  const confirmarUpload = async () => {
    if (!pendingUpload || !fechaEscrituraTemp.trim()) {
      Alert.alert('Error', 'Por favor ingresa la fecha de escritura');
      return;
    }

    setFechaModalOpen(false);
    setUploading(true);

    const timestamp = Date.now();
    const path = `cartas/${pestanaActiva}/${timestamp}.pdf`;

    try {
      const url = await uploadFile(pendingUpload.uri, path);
      const titulo = pendingUpload.name.replace('.pdf', '');

      await addDoc(collection(db, 'cartas'), {
        titulo,
        url,
        path,
        remitente: pestanaActiva,
        fecha: new Date().toLocaleDateString('es-MX'),
        fechaEscritura: fechaEscrituraTemp,
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

  const abrirCarta = async (carta: Carta) => {
    try {
      await Linking.openURL(carta.url);
    } catch (error) {
      Alert.alert('Error', 'No se pudo abrir el archivo');
      console.error(error);
    }
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

  const renderTarjeta = (carta: Carta) => (
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
          <Text style={styles.tarjetaIconText}>📄</Text>
        </View>
        <View style={styles.tarjetaContent}>
          <Text style={styles.tarjetaTitulo}>{carta.titulo}</Text>
          <Text style={styles.tarjetaSubtitulo}>
            {carta.fechaEscritura || carta.fecha}
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
      >
        {cartas.length === 0 ? (
          <View style={styles.emptyContainer}>
            <Text style={styles.emptyText}>Sin cartas</Text>
            <Text style={styles.emptySubtext}>Toca + para subir un PDF</Text>
          </View>
        ) : (
          cartas.map(renderTarjeta)
        )}
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
            <Text style={styles.modalTitle}>Fecha de escritura</Text>
            <Text style={styles.modalSubtitle}>Ingresa la fecha en que escribiste esta carta</Text>
            <TextInput
              style={styles.fechaInput}
              value={fechaEscrituraTemp}
              onChangeText={setFechaEscrituraTemp}
              placeholder="Ej: 25/01/2025"
              placeholderTextColor="#8E8E93"
            />
            <View style={styles.modalButtons}>
              <Pressable style={styles.cancelButton} onPress={() => { setFechaModalOpen(false); setPendingUpload(null); }}>
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
});