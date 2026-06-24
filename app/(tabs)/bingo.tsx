import { View, Text, StyleSheet, Pressable, Modal, TextInput, Alert, ScrollView, Animated } from 'react-native';
import { useState, useEffect, useRef } from 'react';
import { Dimensions } from 'react-native';
import { SafeAreaView, useSafeAreaInsets } from 'react-native-safe-area-context';
import { getClient } from '../../lib/insforge';
import ConfettiCannon from 'react-native-confetti-cannon';
import { useToast } from '../components/Toast';
import { useAppStore } from '../../store/index';
import { useThemeStore } from '../../store/useThemeStore';
import { getColors } from '../../constants/Colors';

const { width } = Dimensions.get('window');
const TAMANO_CASILLA = (width - 80) / 5;
const HIGHLIGHT_DURATION_MS = 2000;

interface Casilla {
  id: number;
  titulo: string;
  descripcion: string;
  realizada: boolean;
  fecha_realizado?: string;
  created_by: string;
  created_by_name: string;
  created_at: number;
  updated_at?: number;
  updated_by?: string;
  updated_by_name?: string;
}

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
  const isDarkMode = useThemeStore((s) => s.isDarkMode);
  const colors = getColors(isDarkMode);
  const [currentUser, setCurrentUser] = useState<{ uid: string; name: string }>({ uid: 'anonymous', name: 'Anónimo' });
  const currentUid = currentUser.uid;
  const currentName = currentUser.name;
  const { theme } = useTheme();

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

  const [highlightedIds, setHighlightedIds] = useState<Set<number>>(new Set());
  const prevIdsRef = useRef<Set<number>>(new Set());
  const isFirstSnapshotRef = useRef(true);

  useEffect(() => {
    const fetchUser = async () => {
      try {
        const { data } = await getClient().auth.getCurrentUser();
        if (data?.user) {
          const name = data.user.profile?.name || (data.user.email ? data.user.email.split('@')[0] : null) || 'Alguien';
          setCurrentUser({ uid: data.user.id, name });
        }
      } catch (e) {
        console.warn('Bingo: error obteniendo usuario', e);
      }
    };
    fetchUser();
  }, []);

  useEffect(() => {
    const performWipeIfNeeded = async () => {
      const sessionId = useAppStore.getState().sessionId;
      if (!sessionId) return;
      try {
        const { data: flag } = await getClient().database
          .from('bingo_meta')
          .select('*')
          .eq('id', 'wiped')
          .eq('session_id', sessionId)
          .single();

        if (!flag) {
          await getClient().database.from('bingo_meta').insert({ id: 'wiped', wiped: true, at: Date.now(), session_id: sessionId });
          await getClient().database.from('bingo_cells').delete().neq('id', 0);
        }
      } catch (e) {
        console.warn('Bingo: error en wipe inicial', e);
      }
    };

    const loadCells = async () => {
      try {
        const { data } = await getClient().database
          .from('bingo_cells')
          .select('*')
          .order('created_at', { ascending: true });
        if (data) {
          setCasillas(data as Casilla[]);
        }
        setCargando(false);
      } catch (e) {
        console.error('Error loading bingo cells', e);
        setCargando(false);
      }
    };

    const init = async () => {
      await performWipeIfNeeded();
      await loadCells();
    };
    init();
    const sessionId = useAppStore.getState().sessionId;
    if (sessionId) {
      const unsub = subscribeToTable(
        `bingo:${sessionId}`,
        'bingo_changed',
        loadCells
      );
      return () => unsub();
    }
  }, []);

  useEffect(() => {
    if (isFirstSnapshotRef.current) {
      prevIdsRef.current = new Set(casillas.map(c => c.id));
      isFirstSnapshotRef.current = false;
      return;
    }

    const newIds: number[] = [];
    casillas.forEach(c => {
      if (!prevIdsRef.current.has(c.id) && c.created_by && c.created_by !== currentUid) {
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
      case 'completados': return casillas.filter(c => c.realizada);
      case 'pendientes': return casillas.filter(c => !c.realizada);
      default: return casillas;
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
    const nuevaCasilla = {
      titulo: tituloInput.trim(),
      descripcion: descripcionInput.trim(),
      realizada: false,
      created_by: currentUid,
      created_by_name: currentName,
      created_at: Date.now(),
      session_id: useAppStore.getState().sessionId,
    };
    try {
      const { error } = await getClient().database.from('bingo_cells').insert(nuevaCasilla);
      if (error) throw error;
      const state = useAppStore.getState();
      if (state.sessionId) {
        publishTableEvent(`bingo:${state.sessionId}`, 'bingo_changed');
        if (state.user) {
          await createNotification(state.sessionId, state.user.id, state.user.nombre, 'bingo', 'Nuevo plan de bingo', `${state.user.nombre} agregó: ${tituloInput.trim()}`);
        }
      }
      cerrarModal();
    } catch (e) {
      console.error('Error creando casilla', e);
      Alert.alert('Error', 'No se pudo crear el plan. Intentá de nuevo.');
    }
  };

  const eliminarCasilla = (id: number) => {
    Alert.alert(
      'Confirmar eliminación',
      '¿Estás segura de que quieres eliminar esta casilla?',
      [
        { text: 'Cancelar', style: 'cancel' },
        {
          text: 'Eliminar',
          style: 'destructive',
          onPress: async () => {
            try {
              await getClient().database.from('bingo_cells').delete().eq('id', id);
              const sid = useAppStore.getState().sessionId;
              if (sid) publishTableEvent(`bingo:${sid}`, 'bingo_changed');
            } catch (e) {
              console.error('Error eliminando casilla', e);
            }
            setModoEliminar(false);
          },
        },
      ]
    );
  };

  const abrirCasilla = (casilla: Casilla) => {
    if (modoEliminar) { eliminarCasilla(casilla.id); return; }
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

  const guardarCambios = async () => {
    if (!selectedCasilla) return;
    const updates = {
      titulo: tituloInput,
      descripcion: descripcionInput,
      updated_at: Date.now(),
      updated_by: currentUid,
      updated_by_name: currentName,
    };
    try {
      await getClient().database.from('bingo_cells').update(updates).eq('id', selectedCasilla.id);
      const sid = useAppStore.getState().sessionId;
      if (sid) publishTableEvent(`bingo:${sid}`, 'bingo_changed');
    } catch (e) {
      console.error('Error guardando casilla', e);
    }
    cerrarModal();
  };

  const confirmarRealizado = async () => {
    if (!selectedCasilla) return;
    const updates = {
      realizada: true,
      fecha_realizado: new Date().toLocaleDateString('es-ES'),
      updated_at: Date.now(),
      updated_by: currentUid,
      updated_by_name: currentName,
    };
    try {
      await getClient().database.from('bingo_cells').update(updates).eq('id', selectedCasilla.id);
      const sid = useAppStore.getState().sessionId;
      if (sid) publishTableEvent(`bingo:${sid}`, 'bingo_changed');
    } catch (e) {
      console.error('Error marcando realizado', e);
    }
    const nuevasCompletadas = completadas + 1;
    if (nuevasCompletadas >= total && total > 0) setShowConfetti(true);
    toast.show('Plan marcado como realizado');
    cerrarModal();
  };

  const renderCasilla = (casilla: Casilla, index: number) => {
    const key = String(casilla.id);
    if (!animValues[key]) animValues[key] = new Animated.Value(1);
    const scale = animValues[key];
    const isHighlighted = highlightedIds.has(casilla.id);
    const initial = (casilla.created_by_name?.[0] ?? '?').toUpperCase();
    const badgeColor = getColorForUid(casilla.created_by);

    return (
      <Pressable key={casilla.id} onPress={() => {
        Animated.sequence([
          Animated.timing(scale, { toValue: 0.93, duration: 90, useNativeDriver: true }),
          Animated.timing(scale, { toValue: 1, duration: 90, useNativeDriver: true }),
        ]).start();
        abrirCasilla(casilla);
      }}>
        <Animated.View style={[
          styles.casilla,
          { backgroundColor: colors.surface },
          casilla.realizada && styles.casillaRealizada,
          isHighlighted && styles.casillaHighlighted,
          { transform: [{ scale }] },
        ]}>
          <Text style={[styles.numeroCasilla, { color: casilla.realizada ? theme.success : theme.text }]}>{index + 1}</Text>
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
    for (let i = 0; i < arr.length; i += size) resultado.push(arr.slice(i, i + size));
    return resultado;
  };

  const total = casillas.length;
  const completadas = casillas.filter(c => c.realizada).length;
  const porcentaje = total === 0 ? 0 : Math.round((completadas / total) * 100);
  const filas = chunkArray(casillasFiltradas, 5);

  return (
    <View style={[styles.container, { paddingTop: 5, backgroundColor: colors.background }]}>
      <View style={styles.header}>
        <Text style={[styles.title, { color: colors.primary }]}>Bingo</Text>
      </View>

      <View style={styles.progressContainer}>
        <View style={[styles.progressBarBackground, { backgroundColor: colors.surfaceSecondary }]}>
          <View style={[styles.progressBarFill, { width: `${porcentaje}%` }]} />
        </View>
        <Text style={[styles.progressText, { color: colors.textSecondary }]}>{porcentaje}% completado</Text>
      </View>

      <View style={styles.filtrosContainer}>
        {(['todos', 'completados', 'pendientes'] as const).map(filtro => (
          <Pressable key={filtro} style={[styles.botonFiltro, { backgroundColor: filtroActual === filtro ? `${theme.primary}99` : `${theme.primaryLight}4D` }]} onPress={() => setFiltroActual(filtro)}>
            <Text style={[styles.botonFiltroTexto, { color: filtroActual === filtro ? theme.text : theme.textSecondary }]}>
              {filtro.charAt(0).toUpperCase() + filtro.slice(1)}
            </Text>
          </Pressable>
        ))}
      </View>

      <View style={styles.botonesContainer}>
        <Pressable style={[styles.botonAccion, { backgroundColor: theme.primaryLight }, cargando && styles.botonAccionDisabled]} onPress={agregarCasilla} disabled={cargando}>
          <Text style={[styles.botonTexto, { color: theme.text }]}>+ Agregar</Text>
        </Pressable>
        <Pressable
          style={[styles.botonAccion, styles.botonEliminar, { backgroundColor: colors.surfaceSecondary }, modoEliminar && styles.botonEliminarActivo, cargando && styles.botonAccionDisabled]}
          onPress={() => setModoEliminar(!modoEliminar)}
          disabled={cargando}
        >
          <Text style={[styles.botonTexto, modoEliminar && styles.botonTextoActivo]}>
            {modoEliminar ? 'Cancelar' : 'Eliminar'}
          </Text>
        </Pressable>
      </View>

      {modoEliminar && <Text style={[styles.modoEliminarTexto, { color: theme.error }]}>Toca una casilla para eliminar</Text>}

      <ScrollView contentContainerStyle={styles.scrollContent}>
        {cargando ? (
          <View style={styles.emptyState}>
            <Text style={styles.emptyStateIcon}>⏳</Text>
            <Text style={[styles.emptyStateTitle, { color: colors.text }]}>Cargando...</Text>
          </View>
        ) : casillasFiltradas.length === 0 ? (
          <View style={styles.emptyState}>
            <Text style={styles.emptyStateIcon}>🎯</Text>
            <Text style={[styles.emptyStateTitle, { color: colors.text }]}>
              {casillas.length === 0 ? 'Aún no hay planes' : 'Sin resultados'}
            </Text>
            <Text style={[styles.emptyStateHint, { color: colors.textSecondary }]}>
              {casillas.length === 0
                ? 'Tocá + Agregar para crear el primer plan'
                : 'Cambiá el filtro para ver más planes'}
            </Text>
          </View>
        ) : (
          <View style={[styles.tablero, { backgroundColor: colors.surfaceSecondary }]}>
            {filas.map((fila, i) => (
              <View key={i} style={styles.fila}>
                {fila.map(casilla => renderCasilla(casilla, indexMap.get(casilla.id) ?? 0))}
              </View>
            ))}
          </View>
        )}
      </ScrollView>

      {showConfetti && <ConfettiCannon count={150} origin={{ x: width / 2, y: 0 }} fadeOut onAnimationEnd={() => setShowConfetti(false)} />}

      <Modal
        visible={modalVisible}
        animationType="slide"
        transparent={true}
        onRequestClose={cerrarModal}
      >
        <View style={styles.modalOverlay}>
          <View style={[styles.modalContent, { backgroundColor: colors.surface }]}>
            <Text style={styles.modalTitle}>
              {modoNuevo
                ? 'Nuevo Plan'
                : (selectedCasilla?.realizada ? 'Ver Plan' : 'Editar Plan')}
            </Text>

            <Text style={[styles.labelInput, { color: theme.textSecondary }]}>Título</Text>
            <TextInput style={[styles.input, { backgroundColor: theme.input, color: theme.text }, !editando && !modoNuevo && { opacity: 0.6 }]} value={tituloInput} onChangeText={setTituloInput} editable={editando || modoNuevo} placeholder="Título del plan" placeholderTextColor={theme.placeholder} />

            <Text style={[styles.labelInput, { color: theme.textSecondary }]}>Descripción</Text>
            <TextInput style={[styles.inputDescripcion, { backgroundColor: theme.input, color: theme.text }, !editando && !modoNuevo && { opacity: 0.6 }]} value={descripcionInput} onChangeText={setDescripcionInput} editable={editando || modoNuevo} multiline numberOfLines={4} placeholder="Descripción del plan" placeholderTextColor={theme.placeholder} />

            {selectedCasilla && !modoNuevo && (
              <View style={[styles.modalAttribution, { borderTopColor: theme.border }]}>
                <Text style={[styles.attributionText, { color: theme.textTertiary }]}>Creado por {selectedCasilla.created_by_name} · {formatDate(selectedCasilla.created_at)}</Text>
                {selectedCasilla.updated_at && (
                  <Text style={[styles.attributionText, { color: theme.textTertiary }]}>Editado por {selectedCasilla.updated_by_name || selectedCasilla.updated_by || 'alguien'} · {formatDate(selectedCasilla.updated_at)}</Text>
                )}
              </View>
            )}

            {!modoNuevo && (
              <View style={styles.modalBotones}>
                <Pressable style={[styles.botonModal, { backgroundColor: theme.input }]} onPress={() => setEditando(!editando)}>
                  <Text style={[styles.botonModalTexto, { color: theme.text }]}>{editando ? 'Cancelar' : 'Editar'}</Text>
                </Pressable>
                {selectedCasilla && !selectedCasilla.realizada && (
                  <Pressable style={[styles.botonModal, { backgroundColor: theme.success }]} onPress={confirmarRealizado}>
                    <Text style={[styles.botonModalTexto, { color: theme.text }]}>✓ Realizado</Text>
                  </Pressable>
                )}
              </View>
            )}

            {modoNuevo && (
              <Pressable style={[styles.botonGuardar, { backgroundColor: theme.primary }]} onPress={crearCasilla}>
                <Text style={[styles.botonGuardarTexto, { color: theme.text }]}>Guardar Plan</Text>
              </Pressable>
            )}

            {!modoNuevo && editando && (
              <Pressable style={[styles.botonGuardar, { backgroundColor: theme.primary }]} onPress={guardarCambios}>
                <Text style={[styles.botonGuardarTexto, { color: theme.text }]}>Guardar cambios</Text>
              </Pressable>
            )}

            <Pressable style={styles.botonCerrar} onPress={cerrarModal}>
              <Text style={[styles.botonCerrarTexto, { color: theme.primary }]}>{modoNuevo ? 'Cancelar' : 'Cerrar'}</Text>
            </Pressable>
          </View>
        </View>
      </Modal>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  header: { paddingTop: 5, paddingBottom: 10, paddingHorizontal: 15 },
  title: { fontSize: 24, fontWeight: 'bold' },
  botonesContainer: { flexDirection: 'row', paddingHorizontal: 15, marginBottom: 10, gap: 10 },
  botonAccion: { paddingVertical: 10, paddingHorizontal: 20, borderRadius: 20, flex: 1, alignItems: 'center' },
  botonAccionDisabled: { opacity: 0.5 },
  botonAgregar: { backgroundColor: '#FFB6C1' },
  botonEliminar: {},
  botonEliminarActivo: { backgroundColor: '#FF6B6B' },
  botonTexto: { fontSize: 14, fontWeight: '600', color: '#FFFFFF' },
  botonTextoActivo: { color: '#FFFFFF' },
  modoEliminarTexto: { textAlign: 'center', color: '#FF6B6B', fontSize: 14, fontWeight: '600', marginBottom: 10 },
  scrollContent: { paddingBottom: 100 },
  tablero: { borderRadius: 20, padding: 10, marginHorizontal: 15 },
  fila: { flexDirection: 'row', justifyContent: 'center' },
  casilla: { width: TAMANO_CASILLA, height: TAMANO_CASILLA, borderRadius: 10, alignItems: 'center', justifyContent: 'center', margin: 5, shadowColor: '#000', shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.08, shadowRadius: 4, elevation: 2, position: 'relative' },
  casillaNormal: {},
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
  numeroNormal: {},
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
  modalContent: { borderRadius: 20, padding: 20, width: width - 40, maxHeight: '80%' },
  modalTitle: { fontSize: 20, fontWeight: 'bold', marginBottom: 20, textAlign: 'center' },
  labelInput: { fontSize: 14, fontWeight: '600', marginBottom: 5, marginTop: 10 },
  input: { borderRadius: 10, padding: 12, fontSize: 16 },
  inputDisabled: {},
  inputDescripcion: { borderRadius: 10, padding: 12, fontSize: 16, minHeight: 80, textAlignVertical: 'top' },
  modalAttribution: {
    marginTop: 16,
    paddingTop: 12,
    borderTopWidth: 1,
    borderTopColor: 'rgba(0, 0, 0, 0.06)',
    alignItems: 'center',
  },
  attributionText: {
    fontSize: 12,
    marginVertical: 1,
  },
  modalBotones: { flexDirection: 'row', marginTop: 20, gap: 10 },
  botonModal: { flex: 1, paddingVertical: 12, borderRadius: 10, alignItems: 'center' },
  botonEditar: {},
  botonConfirmar: { backgroundColor: '#90EE90' },
  botonModalTexto: { fontSize: 14, fontWeight: '600' },
  botonCerrar: { marginTop: 15, paddingVertical: 12, alignItems: 'center' },
  botonCerrarTexto: { fontSize: 14, fontWeight: '600' },
  progressContainer: { paddingHorizontal: 15, marginBottom: 12 },
  progressBarBackground: { height: 10, borderRadius: 10, overflow: 'hidden' },
  progressBarFill: { height: 10, backgroundColor: '#FF6B9D' },
  progressText: { marginTop: 6, fontSize: 12, textAlign: 'center' },

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
    marginBottom: 8,
    textAlign: 'center',
  },
  emptyStateHint: {
    fontSize: 14,
    textAlign: 'center',
    lineHeight: 20,
  },
});
