import { View, Text, StyleSheet, Pressable, Modal, TextInput, Alert, ScrollView, Animated } from 'react-native';
import { useState, useEffect, useRef } from 'react';
import { Dimensions } from 'react-native';
import { SafeAreaView, useSafeAreaInsets } from 'react-native-safe-area-context';
import { db, auth } from '../../lib/firebase';
import { COLORS } from '../../src/styles/brand';
import { collection, doc, onSnapshot, setDoc, updateDoc, query, getDocs, runTransaction, writeBatch, deleteDoc } from 'firebase/firestore';
import ConfettiCannon from 'react-native-confetti-cannon';
import { useToast } from '../components/Toast';

const { width } = Dimensions.get('window');
const TAMANO_CASILLA = (width - 80) / 5;
const HIGHLIGHT_DURATION_MS = 2000;

interface Casilla {
  id: string;
  titulo: string;
  descripcion: string;
  realizada: boolean;
  fechaRealizado?: string;
  createdBy: string;
  createdByName: string;
  createdAt: number;
  updatedAt?: number;
  updatedBy?: string;
  updatedByName?: string;
}

const getBingoCollection = () => {
  if (!db) throw new Error('Firestore no inicializado');
  return collection(db, 'bingo_cells');
};

const getCurrentUser = () => {
  const u = auth?.currentUser;
  if (!u) return { uid: 'anonymous', name: 'Anónimo' };
  const name = u.displayName || (u.email ? u.email.split('@')[0] : null) || 'Alguien';
  return { uid: u.uid, name };
};

const getColorForUid = (uid: string): string => {
  if (!uid || uid === 'anonymous') return '#B0B0B5';
  let hash = 0;
  for (let i = 0; i < uid.length; i++) {
    hash = (hash * 31 + uid.charCodeAt(i)) | 0;
  }
  const hue = Math.abs(hash) % 360;
  return `hsl(${hue}, 55%, 62%)`;
};

const formatDate = (ts: number): string => {
  if (!ts) return '';
  return new Date(ts).toLocaleDateString('es-ES', { day: '2-digit', month: 'short', year: 'numeric' });
};

export default function BingoScreen() {
  const [casillas, setCasillas] = useState<Casilla[]>([]);
  const [modalVisible, setModalVisible] = useState(false);
  const [selectedCasilla, setSelectedCasilla] = useState<Casilla | null>(null);
  const [editando, setEditando] = useState(false);
  const [modoEliminar, setModoEliminar] = useState(false);
  const [cargando, setCargando] = useState(true);
  const [modoNuevo, setModoNuevo] = useState(false);

  const [tituloInput, setTituloInput] = useState('');
  const [descripcionInput, setDescripcionInput] = useState('');
  const [filtroActual, setFiltroActual] = useState<'todos' | 'completados' | 'pendientes'>('todos');
  const insets = useSafeAreaInsets();
  const animValues = useRef<Record<string, Animated.Value>>({}).current;
  const toast = useToast();
  const [showConfetti, setShowConfetti] = useState(false);

  const [highlightedIds, setHighlightedIds] = useState<Set<string>>(new Set());
  const prevIdsRef = useRef<Set<string>>(new Set());
  const isFirstSnapshotRef = useRef(true);

  const currentUser = getCurrentUser();
  const currentUid = currentUser.uid;
  const currentName = currentUser.name;

  const total = casillas.length;
  const completadas = casillas.filter(c => c.realizada).length;
  const porcentaje = total === 0 ? 0 : Math.round((completadas / total) * 100);

  useEffect(() => {
    if (!db) {
      setCargando(false);
      return;
    }

    const flagRef = doc(db, 'bingo_meta', 'wiped');

    const performWipeIfNeeded = async () => {
      try {
        await runTransaction(db!, async (txn) => {
          const flagDoc = await txn.get(flagRef);
          if (flagDoc.exists()) return;
          txn.set(flagRef, { wiped: true, at: Date.now() });
        });

        const cellsSnap = await getDocs(getBingoCollection());
        if (!cellsSnap.empty) {
          const batch = writeBatch(db!);
          cellsSnap.docs.forEach(d => batch.delete(d.ref));
          await batch.commit();
        }
      } catch (e) {
        console.warn('Bingo: error en wipe inicial', e);
      }
    };

    performWipeIfNeeded();

    const q = query(getBingoCollection());
    const unsubscribe = onSnapshot(q, (snapshot) => {
      const cells = snapshot.docs.map(d => ({
        id: d.id,
        ...(d.data() as Omit<Casilla, 'id'>),
      }));
      const sorted = cells.sort((a, b) => (a.createdAt || 0) - (b.createdAt || 0));
      setCasillas(sorted);
      setCargando(false);
    });

    return () => unsubscribe();
  }, []);

  useEffect(() => {
    if (isFirstSnapshotRef.current) {
      prevIdsRef.current = new Set(casillas.map(c => c.id));
      isFirstSnapshotRef.current = false;
      return;
    }

    const newIds: string[] = [];
    casillas.forEach(c => {
      if (!prevIdsRef.current.has(c.id) && c.createdBy && c.createdBy !== currentUid) {
        newIds.push(c.id);
      }
    });

    if (newIds.length > 0) {
      setHighlightedIds(prev => {
        const next = new Set(prev);
        newIds.forEach(id => next.add(id));
        return next;
      });

      newIds.forEach(id => {
        setTimeout(() => {
          setHighlightedIds(prev => {
            const next = new Set(prev);
            next.delete(id);
            return next;
          });
        }, HIGHLIGHT_DURATION_MS);
      });
    }

    prevIdsRef.current = new Set(casillas.map(c => c.id));
  }, [casillas, currentUid]);

  const getCasillasFiltradas = (): Casilla[] => {
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
  const indexMap = new Map(casillasFiltradas.map((c, i) => [c.id, i]));

  const agregarCasilla = () => {
    if (modalVisible) return;
    setModoNuevo(true);
    setSelectedCasilla(null);
    setTituloInput('');
    setDescripcionInput('');
    setEditando(true);
    setModalVisible(true);
  };

  const crearCasilla = async () => {
    if (!tituloInput.trim()) {
      Alert.alert('Falta el título', 'Escribí un título para el plan.');
      return;
    }
    const newDocRef = doc(getBingoCollection());
    const nuevaCasilla = {
      id: newDocRef.id,
      titulo: tituloInput.trim(),
      descripcion: descripcionInput.trim(),
      realizada: false,
      createdBy: currentUid,
      createdByName: currentName,
      createdAt: Date.now(),
    };
    try {
      await setDoc(newDocRef, nuevaCasilla);
      cerrarModal();
    } catch (e) {
      console.error('Error creando casilla', e);
      Alert.alert('Error', 'No se pudo crear el plan. Intentá de nuevo.');
    }
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
            try {
              deleteDoc(doc(getBingoCollection(), id)).catch(err => console.error('Error eliminando casilla', err));
            } catch (e) {
              console.warn('No se pudo eliminar casilla: Firestore no inicializado', e);
            }
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
    setModoNuevo(false);
  };

  const guardarCambios = () => {
    if (!selectedCasilla) return;
    const updates = {
      titulo: tituloInput,
      descripcion: descripcionInput,
      updatedAt: Date.now(),
      updatedBy: currentUid,
      updatedByName: currentName,
    };
    try {
      updateDoc(doc(getBingoCollection(), selectedCasilla.id), updates).catch(err => console.error('Error guardando casilla', err));
    } catch (e) {
      console.warn('No se pudo guardar casilla: Firestore no inicializado', e);
    }
    cerrarModal();
  };

  const confirmarRealizado = () => {
    if (!selectedCasilla) return;
    const updates = {
      realizada: true,
      fechaRealizado: new Date().toLocaleDateString('es-ES'),
      updatedAt: Date.now(),
      updatedBy: currentUid,
      updatedByName: currentName,
    };
    try {
      updateDoc(doc(getBingoCollection(), selectedCasilla.id), updates).catch(err => console.error('Error marcando realizado', err));
    } catch (e) {
      console.warn('No se pudo actualizar realización: Firestore no inicializado', e);
    }
    const nuevasCompletadas = completadas + 1;
    if (nuevasCompletadas >= total && total > 0) {
      setShowConfetti(true);
    }
    toast.show('Plan marcado como realizado');
    cerrarModal();
  };

  const renderCasilla = (casilla: Casilla, index: number) => {
    if (!animValues[casilla.id]) animValues[casilla.id] = new Animated.Value(1);
    const scale = animValues[casilla.id];
    const isHighlighted = highlightedIds.has(casilla.id);
    const initial = (casilla.createdByName?.[0] ?? '?').toUpperCase();
    const badgeColor = getColorForUid(casilla.createdBy);

    return (
      <Pressable
        key={casilla.id}
        onPress={() => {
          Animated.sequence([
            Animated.timing(scale, { toValue: 0.93, duration: 90, useNativeDriver: true }),
            Animated.timing(scale, { toValue: 1, duration: 90, useNativeDriver: true }),
          ]).start();
          abrirCasilla(casilla);
        }}
      >
        <Animated.View style={[
          styles.casilla,
          !casilla.realizada && styles.casillaNormal,
          casilla.realizada && styles.casillaRealizada,
          isHighlighted && styles.casillaHighlighted,
          { transform: [{ scale }] },
        ]}>
          <Text style={[styles.numeroCasilla, !casilla.realizada && styles.numeroNormal, casilla.realizada && styles.numeroRealizado]}>
            {index + 1}
          </Text>
          <View style={[styles.creadorBadge, { backgroundColor: badgeColor }]}>
            <Text style={styles.creadorBadgeText}>{initial}</Text>
          </View>
          {casilla.realizada && (
            <View style={styles.palomita}>
              <Text style={styles.palomitaTexto}>✓</Text>
            </View>
          )}
        </Animated.View>
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
        <Text style={[styles.title, { color: COLORS.primary }]}>Bingo</Text>
      </View>

      <View style={styles.progressContainer}>
        <View style={styles.progressBarBackground}>
          <View style={[styles.progressBarFill, { width: `${porcentaje}%` }]} />
        </View>
        <Text style={styles.progressText}>{porcentaje}% completado</Text>
      </View>

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
          style={[styles.botonAccion, styles.botonAgregar, cargando && styles.botonAccionDisabled]}
          onPress={agregarCasilla}
          disabled={cargando}
        >
          <Text style={styles.botonTexto}>+ Agregar</Text>
        </Pressable>
        <Pressable
          style={[styles.botonAccion, styles.botonEliminar, modoEliminar && styles.botonEliminarActivo, cargando && styles.botonAccionDisabled]}
          onPress={() => setModoEliminar(!modoEliminar)}
          disabled={cargando}
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
        {cargando ? (
          <View style={styles.emptyState}>
            <Text style={styles.emptyStateIcon}>⏳</Text>
            <Text style={styles.emptyStateTitle}>Cargando...</Text>
          </View>
        ) : casillasFiltradas.length === 0 ? (
          <View style={styles.emptyState}>
            <Text style={styles.emptyStateIcon}>🎯</Text>
            <Text style={styles.emptyStateTitle}>
              {casillas.length === 0 ? 'Aún no hay planes' : 'Sin resultados'}
            </Text>
            <Text style={styles.emptyStateHint}>
              {casillas.length === 0
                ? 'Tocá + Agregar para crear el primer plan'
                : 'Cambiá el filtro para ver más planes'}
            </Text>
          </View>
        ) : (
          <View style={styles.tablero}>
            {filas.map((fila, i) => (
              <View key={i} style={styles.fila}>
                {fila.map(casilla => renderCasilla(casilla, indexMap.get(casilla.id) ?? 0))}
              </View>
            ))}
          </View>
        )}
      </ScrollView>

      {showConfetti && (
        <ConfettiCannon count={150} origin={{ x: width / 2, y: 0 }} fadeOut onAnimationEnd={() => setShowConfetti(false)} />
      )}

      <Modal
        visible={modalVisible}
        animationType="slide"
        transparent={true}
        onRequestClose={cerrarModal}
      >
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <Text style={styles.modalTitle}>
              {modoNuevo
                ? 'Nuevo Plan'
                : (selectedCasilla?.realizada ? 'Ver Plan' : 'Editar Plan')}
            </Text>

            <Text style={styles.labelInput}>Título</Text>
            <TextInput
              style={[styles.input, !editando && !modoNuevo && styles.inputDisabled]}
              value={tituloInput}
              onChangeText={setTituloInput}
              editable={editando || modoNuevo}
              placeholder="Título del plan"
            />

            <Text style={styles.labelInput}>Descripción</Text>
            <TextInput
              style={[styles.inputDescripcion, !editando && !modoNuevo && styles.inputDisabled]}
              value={descripcionInput}
              onChangeText={setDescripcionInput}
              editable={editando || modoNuevo}
              multiline
              numberOfLines={4}
              placeholder="Descripción del plan"
            />

            {selectedCasilla && !modoNuevo && (
              <View style={styles.modalAttribution}>
                <Text style={styles.attributionText}>
                  Creado por {selectedCasilla.createdByName} · {formatDate(selectedCasilla.createdAt)}
                </Text>
                {selectedCasilla.updatedAt && (
                  <Text style={styles.attributionText}>
                    Editado por {selectedCasilla.updatedByName || selectedCasilla.updatedBy || 'alguien'} · {formatDate(selectedCasilla.updatedAt)}
                  </Text>
                )}
              </View>
            )}

            {!modoNuevo && (
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
            )}

            {modoNuevo && (
              <Pressable
                style={styles.botonGuardar}
                onPress={crearCasilla}
              >
                <Text style={styles.botonGuardarTexto}> Guardar Plan</Text>
              </Pressable>
            )}

            {!modoNuevo && editando && (
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
              <Text style={styles.botonCerrarTexto}>{modoNuevo ? 'Cancelar' : 'Cerrar'}</Text>
            </Pressable>
          </View>
        </View>
      </Modal>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: 'rgba(255, 245, 248, 0.95)' },
  header: { paddingTop: 5, paddingBottom: 10, paddingHorizontal: 15 },
  title: { fontSize: 24, fontWeight: 'bold', color: '#FF6B9D' },
  botonesContainer: { flexDirection: 'row', paddingHorizontal: 15, marginBottom: 10, gap: 10 },
  botonAccion: { paddingVertical: 10, paddingHorizontal: 20, borderRadius: 20, flex: 1, alignItems: 'center' },
  botonAccionDisabled: { opacity: 0.5 },
  botonAgregar: { backgroundColor: '#FFB6C1' },
  botonEliminar: { backgroundColor: '#F5F5F5' },
  botonEliminarActivo: { backgroundColor: '#FF6B6B' },
  botonTexto: { fontSize: 14, fontWeight: '600', color: '#FFFFFF' },
  botonTextoActivo: { color: '#FFFFFF' },
  modoEliminarTexto: { textAlign: 'center', color: '#FF6B6B', fontSize: 14, fontWeight: '600', marginBottom: 10 },
  scrollContent: { paddingBottom: 100 },
  tablero: { backgroundColor: 'rgba(255, 183, 197, 0.25)', borderRadius: 20, padding: 10, marginHorizontal: 15 },
  fila: { flexDirection: 'row', justifyContent: 'center' },
  casilla: { width: TAMANO_CASILLA, height: TAMANO_CASILLA, backgroundColor: '#FFFFFF', borderRadius: 10, alignItems: 'center', justifyContent: 'center', margin: 5, shadowColor: '#000', shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.08, shadowRadius: 4, elevation: 2, position: 'relative' },
  casillaNormal: { backgroundColor: '#FFFFFF' },
  casillaRealizada: { backgroundColor: '#E8F5E9' },
  casillaHighlighted: {
    borderWidth: 2.5,
    borderColor: '#FF6B9D',
    shadowColor: '#FF6B9D',
    shadowOffset: { width: 0, height: 0 },
    shadowOpacity: 0.5,
    shadowRadius: 10,
    elevation: 8,
  },
  numeroCasilla: { fontSize: 20, fontWeight: 'bold' },
  numeroNormal: { color: '#333333' },
  numeroRealizado: { color: '#90EE90' },
  creadorBadge: {
    position: 'absolute',
    top: 4,
    left: 4,
    width: 18,
    height: 18,
    borderRadius: 9,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1.5,
    borderColor: '#FFFFFF',
  },
  creadorBadgeText: {
    fontSize: 10,
    fontWeight: 'bold',
    color: '#FFFFFF',
    lineHeight: 12,
  },
  palomita: { position: 'absolute', top: 2, right: 2, backgroundColor: 'rgba(144, 238, 144, 0.8)', borderRadius: 10, width: 20, height: 20, alignItems: 'center', justifyContent: 'center' },
  palomitaTexto: { fontSize: 14, fontWeight: 'bold', color: '#228B22' },
  modalOverlay: { flex: 1, backgroundColor: 'rgba(0, 0, 0, 0.5)', justifyContent: 'center', alignItems: 'center' },
  modalContent: { backgroundColor: '#FFFFFF', borderRadius: 20, padding: 20, width: width - 40, maxHeight: '80%' },
  modalTitle: { fontSize: 20, fontWeight: 'bold', color: '#FF6B9D', marginBottom: 20, textAlign: 'center' },
  labelInput: { fontSize: 14, fontWeight: '600', color: '#666666', marginBottom: 5, marginTop: 10 },
  input: { backgroundColor: '#F5F5F5', borderRadius: 10, padding: 12, fontSize: 16, color: '#333333' },
  inputDisabled: { backgroundColor: '#EEEEEE', color: '#666666' },
  inputDescripcion: { backgroundColor: '#F5F5F5', borderRadius: 10, padding: 12, fontSize: 16, color: '#333333', minHeight: 80, textAlignVertical: 'top' },
  modalAttribution: {
    marginTop: 16,
    paddingTop: 12,
    borderTopWidth: 1,
    borderTopColor: 'rgba(0, 0, 0, 0.06)',
    alignItems: 'center',
  },
  attributionText: {
    fontSize: 12,
    color: '#999999',
    marginVertical: 1,
  },
  modalBotones: { flexDirection: 'row', marginTop: 20, gap: 10 },
  botonModal: { flex: 1, paddingVertical: 12, borderRadius: 10, alignItems: 'center' },
  botonEditar: { backgroundColor: '#F5F5F5' },
  botonConfirmar: { backgroundColor: '#90EE90' },
  botonModalTexto: { fontSize: 14, fontWeight: '600', color: '#333333' },
  botonCerrar: { marginTop: 15, paddingVertical: 12, alignItems: 'center' },
  botonCerrarTexto: { fontSize: 14, color: '#FF6B9D', fontWeight: '600' },
  progressContainer: { paddingHorizontal: 15, marginBottom: 12 },
  progressBarBackground: { height: 10, backgroundColor: '#F5F5F5', borderRadius: 10, overflow: 'hidden' },
  progressBarFill: { height: 10, backgroundColor: '#FF6B9D' },
  progressText: { marginTop: 6, fontSize: 12, color: '#666666', textAlign: 'center' },

  filtrosContainer: { flexDirection: 'row', paddingHorizontal: 15, marginBottom: 15, gap: 8 },
  botonFiltro: { flex: 1, paddingVertical: 8, paddingHorizontal: 12, borderRadius: 15, backgroundColor: 'rgba(255, 182, 193, 0.3)', alignItems: 'center' },
  botonFiltroActivo: { backgroundColor: 'rgba(255, 107, 157, 0.6)' },
  botonFiltroTexto: { fontSize: 12, fontWeight: '600', color: '#666666' },
  botonFiltroTextoActivo: { color: '#FFFFFF', fontWeight: 'bold' },

  botonGuardar: { marginTop: 15, paddingVertical: 14, borderRadius: 10, backgroundColor: '#FF6B9D', alignItems: 'center' },
  botonGuardarTexto: { fontSize: 16, fontWeight: 'bold', color: '#FFFFFF' },

  emptyState: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 60,
    paddingHorizontal: 30,
  },
  emptyStateIcon: {
    fontSize: 64,
    marginBottom: 16,
    opacity: 0.6,
  },
  emptyStateTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: '#666666',
    marginBottom: 8,
    textAlign: 'center',
  },
  emptyStateHint: {
    fontSize: 14,
    color: '#999999',
    textAlign: 'center',
    lineHeight: 20,
  },
});
