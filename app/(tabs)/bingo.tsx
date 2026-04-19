import { View, Text, StyleSheet, Pressable, Modal, TextInput, Alert, ScrollView } from 'react-native';
import { useState } from 'react';
import { Dimensions } from 'react-native';
import { SafeAreaView, useSafeAreaInsets } from 'react-native-safe-area-context';

const { width } = Dimensions.get('window');
const TAMANO_CASILLA = (width - 80) / 5;

interface Casilla {
  id: string;
  numero: number;
  titulo: string;
  descripcion: string;
  realizada: boolean;
  fechaRealizado?: string;
}

const generarCasillasIniciales = (cantidad: number): Casilla[] => {
  return Array.from({ length: cantidad }, (_, i) => ({
    id: `casilla-${i + 1}`,
    numero: i + 1,
    titulo: `Plan ${i + 1}`,
    descripcion: 'Descripción del plan...',
    realizada: false,
  }));
};

export default function BingoScreen() {
  const [casillas, setCasillas] = useState<Casilla[]>(generarCasillasIniciales(25));
  const [modalVisible, setModalVisible] = useState(false);
  const [selectedCasilla, setSelectedCasilla] = useState<Casilla | null>(null);
  const [editando, setEditando] = useState(false);
  const [modoEliminar, setModoEliminar] = useState(false);
  
  const [tituloInput, setTituloInput] = useState('');
  const [descripcionInput, setDescripcionInput] = useState('');
  const [filtroActual, setFiltroActual] = useState<'todos' | 'completados' | 'pendientes'>('todos');
  const insets = useSafeAreaInsets();

  const getCasillasFiltradas = () => {
    switch (filtroActual) {
      case 'completados':
        return casillas.filter(c => c.realizada);
      case 'pendientes':
        return casillas.filter(c => !c.realizada);
      default:
        return casillas;
    }
  };

  const casillasFiltradas = getCasillasFiltradas();

  const reindexarCasillas = (lista: Casilla[]): Casilla[] => {
    return lista.map((casilla, index) => ({
      ...casilla,
      numero: index + 1,
    }));
  };

  const agregarCasilla = () => {
    const nuevaCasilla: Casilla = {
      id: `casilla-${Date.now()}`,
      numero: casillas.length + 1,
      titulo: `Plan ${casillas.length + 1}`,
      descripcion: 'Descripción del plan...',
      realizada: false,
    };
    setCasillas([...casillas, nuevaCasilla]);
  };

  const eliminarCasilla = (id: string) => {
    Alert.alert(
      'Confirmar eliminación',
      '¿Estás segura de que quieres eliminar esta casilla?',
      [
        { text: 'Cancelar', style: 'cancel' },
        {
          text: 'Eliminar',
          style: 'destructive',
          onPress: () => {
            const filtrada = casillas.filter(c => c.id !== id);
            setCasillas(reindexarCasillas(filtrada));
            setModoEliminar(false);
          },
        },
      ]
    );
  };

  const abrirCasilla = (casilla: Casilla) => {
    if (modoEliminar) {
      eliminarCasilla(casilla.id);
      return;
    }
    setSelectedCasilla(casilla);
    setTituloInput(casilla.titulo);
    setDescripcionInput(casilla.descripcion);
    setEditando(false);
    setModalVisible(true);
  };

  const cerrarModal = () => {
    setModalVisible(false);
    setSelectedCasilla(null);
    setEditando(false);
  };

  const guardarCambios = () => {
    if (!selectedCasilla) return;
    
    const actualizadas = casillas.map(c =>
      c.id === selectedCasilla.id ? {
        ...c,
        titulo: tituloInput,
        descripcion: descripcionInput,
      } : c
    );
    setCasillas(actualizadas);
    cerrarModal();
  };

  const confirmarRealizado = () => {
    if (!selectedCasilla) return;
    
    const actualizadas = casillas.map(c =>
      c.id === selectedCasilla.id ? {
        ...c,
        realizada: true,
        fechaRealizado: new Date().toLocaleDateString('es-ES'),
      } : c
    );
    setCasillas(actualizadas);
    cerrarModal();
  };

  const renderCasilla = (casilla: Casilla) => {
    return (
      <Pressable
        key={casilla.id}
        style={[styles.casilla, !casilla.realizada && styles.casillaNormal, casilla.realizada && styles.casillaRealizada]}
        onPress={() => abrirCasilla(casilla)}
      >
        <Text style={[styles.numeroCasilla, !casilla.realizada && styles.numeroNormal, casilla.realizada && styles.numeroRealizado]}>
          {casilla.numero}
        </Text>
        {casilla.realizada && (
          <View style={styles.palomita}>
            <Text style={styles.palomitaTexto}>✓</Text>
          </View>
        )}
      </Pressable>
    );
  };

  const chunkArray = (arr: Casilla[], size: number): Casilla[][] => {
    const resultado: Casilla[][] = [];
    for (let i = 0; i < arr.length; i += size) {
      resultado.push(arr.slice(i, i + size));
    }
    return resultado;
  };

  const filas = chunkArray(casillasFiltradas, 5);

  return (
    <View style={[styles.container, { paddingTop: 5 }]}>
      <View style={styles.header}>
        <Text style={styles.title}>Bingo</Text>
      </View>

      {/* Filtros tipo tabs */}
      <View style={styles.filtrosContainer}>
        <Pressable
          style={[styles.botonFiltro, filtroActual === 'todos' && styles.botonFiltroActivo]}
          onPress={() => setFiltroActual('todos')}
        >
          <Text style={[styles.botonFiltroTexto, filtroActual === 'todos' && styles.botonFiltroTextoActivo]}>
            Todos
          </Text>
        </Pressable>
        <Pressable
          style={[styles.botonFiltro, filtroActual === 'completados' && styles.botonFiltroActivo]}
          onPress={() => setFiltroActual('completados')}
        >
          <Text style={[styles.botonFiltroTexto, filtroActual === 'completados' && styles.botonFiltroTextoActivo]}>
            Completados
          </Text>
        </Pressable>
        <Pressable
          style={[styles.botonFiltro, filtroActual === 'pendientes' && styles.botonFiltroActivo]}
          onPress={() => setFiltroActual('pendientes')}
        >
          <Text style={[styles.botonFiltroTexto, filtroActual === 'pendientes' && styles.botonFiltroTextoActivo]}>
            Pendientes
          </Text>
        </Pressable>
      </View>

      <View style={styles.botonesContainer}>
        <Pressable
          style={[styles.botonAccion, styles.botonAgregar]}
          onPress={agregarCasilla}
        >
          <Text style={styles.botonTexto}>+ Agregar</Text>
        </Pressable>
        <Pressable
          style={[styles.botonAccion, styles.botonEliminar, modoEliminar && styles.botonEliminarActivo]}
          onPress={() => setModoEliminar(!modoEliminar)}
        >
          <Text style={[styles.botonTexto, modoEliminar && styles.botonTextoActivo]}>
            {modoEliminar ? 'Cancelar' : 'Eliminar'}
          </Text>
        </Pressable>
      </View>

      {modoEliminar && (
        <Text style={styles.modoEliminarTexto}>Toca una casilla para eliminar</Text>
      )}

      <ScrollView contentContainerStyle={styles.scrollContent}>
        <View style={styles.tablero}>
          {filas.map((fila, i) => (
            <View key={i} style={styles.fila}>
              {fila.map(casilla => renderCasilla(casilla))}
            </View>
          ))}
        </View>
      </ScrollView>

      <Modal
        visible={modalVisible}
        animationType="slide"
        transparent={true}
        onRequestClose={cerrarModal}
      >
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <Text style={styles.modalTitle}>
              {selectedCasilla?.realizada ? 'Ver Plan' : 'Editar Plan'}
            </Text>
            
            <Text style={styles.labelInput}>Título</Text>
            <TextInput
              style={[styles.input, !editando && styles.inputDisabled]}
              value={tituloInput}
              onChangeText={setTituloInput}
              editable={editando}
              placeholder="Título del plan"
            />
            
            <Text style={styles.labelInput}>Descripción</Text>
            <TextInput
              style={[styles.inputDescripcion, !editando && styles.inputDisabled]}
              value={descripcionInput}
              onChangeText={setDescripcionInput}
              editable={editando}
              multiline
              numberOfLines={4}
              placeholder="Descripción del plan"
            />

            <View style={styles.modalBotones}>
              <Pressable
                style={[styles.botonModal, styles.botonEditar]}
                onPress={() => setEditando(!editando)}
              >
                <Text style={styles.botonModalTexto}>
                  {editando ? 'Cancelar' : 'Editar'}
                </Text>
              </Pressable>
              
              {selectedCasilla && !selectedCasilla.realizada && (
                <Pressable
                  style={[styles.botonModal, styles.botonConfirmar]}
                  onPress={confirmarRealizado}
                >
                  <Text style={styles.botonModalTexto}>✓ Realizado</Text>
                </Pressable>
              )}
            </View>

            {editando && (
              <Pressable
                style={styles.botonGuardar}
                onPress={guardarCambios}
              >
                <Text style={styles.botonGuardarTexto}>Guardar cambios</Text>
              </Pressable>
            )}

            <Pressable
              style={styles.botonCerrar}
              onPress={cerrarModal}
            >
              <Text style={styles.botonCerrarTexto}>Cerrar</Text>
            </Pressable>
          </View>
        </View>
      </Modal>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: 'rgba(255, 245, 248, 0.95)' },
  header: { paddingTop: 50, paddingBottom: 10, paddingHorizontal: 15 },
  title: { fontSize: 24, fontWeight: 'bold', color: '#FF6B9D' },
  botonesContainer: { flexDirection: 'row', paddingHorizontal: 15, marginBottom: 10, gap: 10 },
  botonAccion: { paddingVertical: 10, paddingHorizontal: 20, borderRadius: 20, flex: 1, alignItems: 'center' },
  botonAgregar: { backgroundColor: '#FFB6C1' },
  botonEliminar: { backgroundColor: '#F5F5F5' },
  botonEliminarActivo: { backgroundColor: '#FF6B6B' },
  botonTexto: { fontSize: 14, fontWeight: '600', color: '#FFFFFF' },
  botonTextoActivo: { color: '#FFFFFF' },
  modoEliminarTexto: { textAlign: 'center', color: '#FF6B6B', fontSize: 14, fontWeight: '600', marginBottom: 10 },
  scrollContent: { paddingBottom: 100 },
  tablero: { backgroundColor: 'rgba(255, 183, 197, 0.25)', borderRadius: 20, padding: 10, marginHorizontal: 15 },
  fila: { flexDirection: 'row', justifyContent: 'center' },
  casilla: { width: TAMANO_CASILLA, height: TAMANO_CASILLA, backgroundColor: '#FFFFFF', borderRadius: 10, alignItems: 'center', justifyContent: 'center', margin: 5, shadowColor: '#000', shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.08, shadowRadius: 4, elevation: 2 },
  casillaNormal: { backgroundColor: '#FFFFFF' },
  casillaRealizada: { backgroundColor: '#E8F5E9' },
  numeroCasilla: { fontSize: 20, fontWeight: 'bold' },
  numeroNormal: { color: '#333333' },
  numeroRealizado: { color: '#90EE90' },
  palomita: { position: 'absolute', top: 2, right: 2, backgroundColor: 'rgba(144, 238, 144, 0.8)', borderRadius: 10, width: 20, height: 20, alignItems: 'center', justifyContent: 'center' },
  palomitaTexto: { fontSize: 14, fontWeight: 'bold', color: '#228B22' },
  modalOverlay: { flex: 1, backgroundColor: 'rgba(0, 0, 0, 0.5)', justifyContent: 'center', alignItems: 'center' },
  modalContent: { backgroundColor: '#FFFFFF', borderRadius: 20, padding: 20, width: width - 40, maxHeight: '80%' },
  modalTitle: { fontSize: 20, fontWeight: 'bold', color: '#FF6B9D', marginBottom: 20, textAlign: 'center' },
  labelInput: { fontSize: 14, fontWeight: '600', color: '#666666', marginBottom: 5, marginTop: 10 },
  input: { backgroundColor: '#F5F5F5', borderRadius: 10, padding: 12, fontSize: 16, color: '#333333' },
  inputDisabled: { backgroundColor: '#EEEEEE', color: '#666666' },
  inputDescripcion: { backgroundColor: '#F5F5F5', borderRadius: 10, padding: 12, fontSize: 16, color: '#333333', minHeight: 80, textAlignVertical: 'top' },
  modalBotones: { flexDirection: 'row', marginTop: 20, gap: 10 },
  botonModal: { flex: 1, paddingVertical: 12, borderRadius: 10, alignItems: 'center' },
  botonEditar: { backgroundColor: '#F5F5F5' },
  botonConfirmar: { backgroundColor: '#90EE90' },
  botonModalTexto: { fontSize: 14, fontWeight: '600', color: '#333333' },
  botonCerrar: { marginTop: 15, paddingVertical: 12, alignItems: 'center' },
  botonCerrarTexto: { fontSize: 14, color: '#FF6B9D', fontWeight: '600' },
  
  // Estilos para filtros tipo tabs
  filtrosContainer: { flexDirection: 'row', paddingHorizontal: 15, marginBottom: 15, gap: 8 },
  botonFiltro: { flex: 1, paddingVertical: 8, paddingHorizontal: 12, borderRadius: 15, backgroundColor: 'rgba(255, 182, 193, 0.3)', alignItems: 'center' },
  botonFiltroActivo: { backgroundColor: 'rgba(255, 107, 157, 0.6)' },
  botonFiltroTexto: { fontSize: 12, fontWeight: '600', color: '#666666' },
  botonFiltroTextoActivo: { color: '#FFFFFF', fontWeight: 'bold' },
  
  // Estilos para botón guardar
  botonGuardar: { marginTop: 15, paddingVertical: 14, borderRadius: 10, backgroundColor: '#FF6B9D', alignItems: 'center' },
  botonGuardarTexto: { fontSize: 16, fontWeight: 'bold', color: '#FFFFFF' },
});