import { View, Text, StyleSheet, ScrollView, Pressable, Animated, Easing } from 'react-native';
import { useState, useRef } from 'react';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useThemeStore } from '../../store/useThemeStore';
import { getColors } from '../../constants/Colors';

type GameType = 'ruleta' | 'ppt';
type Choice = 'piedra' | 'papel' | 'tijera' | null;

interface HistoryItem {
  game: string;
  result: string;
  date: string;
}

const OPTIONS: Exclude<Choice, null>[] = ['piedra', 'papel', 'tijera'];
const EMOJIS: Record<Exclude<Choice, null>, string> = {
  piedra: '🪨',
  papel: '📄',
  tijera: '✂️'
};
const RULETA_RESULTS = ['Gana Dariancin', 'Gana Lebebe'];

export default function DedosScreen() {
  const insets = useSafeAreaInsets();
  const isDarkMode = useThemeStore((s) => s.isDarkMode);
  const colors = getColors(isDarkMode);
  
  const [activeGame, setActiveGame] = useState<GameType>('ruleta');
  const [history, setHistory] = useState<HistoryItem[]>([]);
  
  const [ruletaTexto, setRuletaTexto] = useState('¿Quién gana?');
  const [isSpinning, setIsSpinning] = useState(false);
  const ruletaIntervalRef = useRef<ReturnType<typeof setInterval> | null>(null);
  
  const spinRuleta = () => {
    if (isSpinning) return;
    setIsSpinning(true);
    
    ruletaIntervalRef.current = setInterval(() => {
      const randomText = RULETA_RESULTS[Math.floor(Math.random() * RULETA_RESULTS.length)];
      setRuletaTexto(randomText);
    }, 100);
    
    setTimeout(() => {
      if (ruletaIntervalRef.current) {
        clearInterval(ruletaIntervalRef.current);
        ruletaIntervalRef.current = null;
      }
      
      const winner = RULETA_RESULTS[Math.floor(Math.random() * RULETA_RESULTS.length)];
      setRuletaTexto(winner);
      setIsSpinning(false);
      
      const now = new Date();
      const dateStr = now.toLocaleString('es-ES', { day: '2-digit', month: '2-digit', hour: '2-digit', minute: '2-digit' });
      
      const newItem: HistoryItem = { game: 'Ruleta', result: winner, date: dateStr };
      setHistory([newItem, ...history].slice(0, 10));
    }, 3000);
  };
  
  const [eleccionDarian, setEleccionDarian] = useState<Choice>(null);
  const [eleccionLebebe, setEleccionLebebe] = useState<Choice>(null);
  const [faseJuego, setFaseJuego] = useState<'seleccion' | 'revelacion'>('seleccion');
  const [pptGanador, setPptGanador] = useState<string | null>(null);
  
  const seleccionar = (jugador: 'darian' | 'lebebe', choice: Choice) => {
    if (jugador === 'darian') setEleccionDarian(choice);
    else setEleccionLebebe(choice);
  };
  
  const revelarGanador = () => {
    if (!eleccionDarian || !eleccionLebebe) return;
    
    let winner = '';
    if (eleccionDarian === eleccionLebebe) winner = 'Empate';
    else if (
      (eleccionDarian === 'piedra' && eleccionLebebe === 'tijera') ||
      (eleccionDarian === 'tijera' && eleccionLebebe === 'papel') ||
      (eleccionDarian === 'papel' && eleccionLebebe === 'piedra')
    ) winner = 'Gana Dariancin';
    else winner = 'Gana Lebebe';
    
    setPptGanador(`${EMOJIS[eleccionDarian as Exclude<Choice, null>]} vs ${EMOJIS[eleccionLebebe as Exclude<Choice, null>]} - ¡${winner}!`);
    setFaseJuego('revelacion');
    
    const now = new Date();
    const dateStr = now.toLocaleString('es-ES', { day: '2-digit', month: '2-digit', hour: '2-digit', minute: '2-digit' });
    const newItem: HistoryItem = { game: 'PPT', result: winner, date: dateStr };
    setHistory([newItem, ...history].slice(0, 10));
  };
  
  const reiniciarPPT = () => {
    setEleccionDarian(null);
    setEleccionLebebe(null);
    setFaseJuego('seleccion');
    setPptGanador(null);
  };
  
  const TabButton = ({ label, game }: { label: string; game: GameType }) => (
    <Pressable
      style={[
        styles.tabButton,
        { backgroundColor: activeGame === game ? colors.primary : colors.surfaceSecondary },
        activeGame === game && styles.tabButtonActive,
      ]}
      onPress={() => setActiveGame(game)}
    >
      <Text style={[
        styles.tabButtonText,
        { color: activeGame === game ? '#FFFFFF' : colors.textSecondary },
        activeGame === game && styles.tabButtonTextActive,
      ]}>
        {label}
      </Text>
    </Pressable>
  );
  
  const OptionButton = ({ emoji, onPress, selected, disabled }: { emoji: string; onPress: () => void; selected?: boolean; disabled?: boolean }) => (
    <Pressable
      style={[
        styles.optionButton,
        { backgroundColor: colors.surfaceSecondary, borderColor: colors.border },
        selected && [styles.optionButtonSelected, { backgroundColor: colors.surface, borderColor: colors.primary }],
        disabled && styles.optionButtonDisabled,
      ]}
      onPress={onPress}
      disabled={disabled}
    >
      <Text style={styles.optionEmoji}>{emoji}</Text>
    </Pressable>
  );
  
  const HistorialItem = ({ item, index }: { item: HistoryItem; index: number }) => (
    <View style={[styles.historyItem, { borderBottomColor: colors.border }]}>
      <Text style={[styles.historyGame, { color: colors.primary }]}>{item.game}</Text>
      <Text style={[styles.historyResult, { color: colors.text }]}>{item.result}</Text>
      <Text style={[styles.historyDate, { color: colors.textSecondary }]}>{item.date}</Text>
    </View>
  );
  
  const renderRuleta = () => (
    <View style={styles.gameContainer}>
      <View style={[styles.ruletaBox, { backgroundColor: colors.surface }]}>
        <Text style={[styles.ruletaTexto, { color: colors.primary }]}>{ruletaTexto}</Text>
      </View>
      
      <Pressable
        style={[styles.girarButton, { backgroundColor: theme.primary }, isSpinning && styles.girarButtonDisabled]}
        onPress={spinRuleta}
        disabled={isSpinning}
      >
        <Text style={[styles.girarButtonText, { color: theme.text }]}>
          {isSpinning ? 'Girando...' : '🎰 Girar'}
        </Text>
      </Pressable>
    </View>
  );
  
  const renderPPT = () => {
    if (faseJuego === 'seleccion') {
      const ambosListos = eleccionDarian && eleccionLebebe;
      
      return (
        <View style={styles.gameContainer}>
          <View style={styles.pptContainer}>
            <View style={styles.pptColumn}>
              <Text style={[styles.pptLabel, { color: colors.text }]}>Dariancin</Text>
              {eleccionDarian ? (
                <View style={styles.readyBox}>
                  <Text style={styles.readyText}>✅ Listo</Text>
                </View>
              ) : (
                <View style={styles.optionsRow}>
                  {OPTIONS.map((opt) => (
                    <OptionButton key={opt} emoji={EMOJIS[opt]} onPress={() => seleccionar('darian', opt)} />
                  ))}
                </View>
              )}
            </View>
            
            <Text style={[styles.pptVS, { color: theme.textTertiary }]}>VS</Text>
            
            <View style={styles.pptColumn}>
              <Text style={[styles.pptLabel, { color: colors.text }]}>Lebebe</Text>
              {eleccionLebebe ? (
                <View style={styles.readyBox}>
                  <Text style={styles.readyText}>✅ Listo</Text>
                </View>
              ) : (
                <View style={styles.optionsRow}>
                  {OPTIONS.map((opt) => (
                    <OptionButton key={opt} emoji={EMOJIS[opt]} onPress={() => seleccionar('lebebe', opt)} />
                  ))}
                </View>
              )}
            </View>
          </View>
          
          <Pressable
            style={[styles.revelarButton, { backgroundColor: theme.primary }, !ambosListos && styles.revelarButtonDisabled]}
            onPress={revelarGanador}
            disabled={!ambosListos}
          >
            <Text style={[styles.revelarButtonText, { color: theme.text }]}>
              {ambosListos ? '🎯 Revelar Ganador' : 'Esperando...'}
            </Text>
          </Pressable>
        </View>
      );
    }
    
    return (
      <View style={styles.gameContainer}>
        <View style={[styles.resultadoBox, { backgroundColor: colors.surface }]}>
          <Text style={styles.resultadoTexto}>{pptGanador}</Text>
        </View>
        
        <Pressable style={[styles.jugarDeNuevoButton, { backgroundColor: theme.primary }]} onPress={reiniciarPPT}>
          <Text style={[styles.jugarDeNuevoText, { color: theme.text }]}>🔄 Jugar de nuevo</Text>
        </Pressable>
      </View>
    );
  };
  
  return (
    <View style={[styles.container, { paddingTop: 5, backgroundColor: colors.background }]}>
      <View style={styles.header}>
        <Text style={[styles.title, { color: colors.primary }]}>Dedos</Text>
      </View>
      
      <View style={styles.tabsContainer}>
        <TabButton label="Ruleta" game="ruleta" />
        <TabButton label="Piedra, Papel, Tijera" game="ppt" />
      </View>
      
      <ScrollView style={styles.scrollContainer} contentContainerStyle={styles.scrollContent}>
        {activeGame === 'ruleta' ? renderRuleta() : renderPPT()}
        
        <View style={styles.historySection}>
          <Text style={[styles.historyTitle, { color: colors.text }]}>Historial</Text>
          <View style={[styles.historyList, { backgroundColor: colors.surface }]}>
            {history.length === 0 ? (
              <Text style={[styles.historyEmpty, { color: colors.textSecondary }]}>Sin jugadas aún</Text>
            ) : (
              history.map((item, index) => (
                <HistorialItem key={index} item={item} index={index} />
              ))
            )}
          </View>
        </View>
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  header: {
    paddingBottom: 15,
    paddingHorizontal: 15,
  },
  title: {
    fontSize: 24,
    fontWeight: 'bold',
  },
  tabsContainer: {
    flexDirection: 'row',
    paddingHorizontal: 15,
    marginBottom: 20,
    gap: 10,
  },
  tabButton: {
    flex: 1,
    paddingVertical: 12,
    paddingHorizontal: 15,
    borderRadius: 20,
    alignItems: 'center',
  },
  tabButtonActive: {},
  tabButtonText: {
    fontSize: 14,
    fontWeight: '600',
  },
  tabButtonTextActive: {},
  scrollContainer: {
    flex: 1,
  },
  scrollContent: {
    paddingBottom: 110,
    paddingHorizontal: 15,
  },
  gameContainer: {
    alignItems: 'center',
    marginBottom: 30,
  },
  
  // === RULETA STYLES ===
  ruletaBox: {
    width: '100%',
    paddingVertical: 40,
    borderRadius: 20,
    alignItems: 'center',
    marginBottom: 25,
  },
  ruletaTexto: {
    fontSize: 24,
    fontWeight: 'bold',
    textAlign: 'center',
  },
  girarButton: {
    backgroundColor: '#FF6B9D',
    paddingVertical: 15,
    paddingHorizontal: 50,
    borderRadius: 25,
  },
  girarButtonDisabled: {
    opacity: 0.5,
  },
  girarButtonText: {
    color: '#FFFFFF',
    fontSize: 18,
    fontWeight: 'bold',
  },
  
  // === PPT STYLES ===
  pptContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 25,
  },
  pptColumn: {
    alignItems: 'center',
    flex: 1,
  },
  pptLabel: {
    fontSize: 16,
    fontWeight: 'bold',
    marginBottom: 15,
  },
  pptVS: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#8E8E93',
    marginHorizontal: 15,
  },
  optionsRow: {
    flexDirection: 'row',
    gap: 10,
  },
  optionButton: {
    width: 60,
    height: 60,
    borderRadius: 30,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 2,
  },
  optionButtonSelected: {
    borderColor: '#FF6B9D',
  },
  optionButtonDisabled: {
    opacity: 0.5,
  },
  optionEmoji: {
    fontSize: 28,
  },
  readyBox: {
    width: 80,
    height: 60,
    borderRadius: 30,
    backgroundColor: '#90EE90',
    alignItems: 'center',
    justifyContent: 'center',
  },
  readyText: {
    color: '#FFFFFF',
    fontWeight: 'bold',
    fontSize: 12,
  },
  revelarButton: {
    backgroundColor: '#FF6B9D',
    paddingVertical: 15,
    paddingHorizontal: 40,
    borderRadius: 25,
  },
  revelarButtonDisabled: {
    opacity: 0.5,
  },
  revelarButtonText: {
    color: '#FFFFFF',
    fontSize: 16,
    fontWeight: 'bold',
  },
  resultadoBox: {
    width: '100%',
    paddingVertical: 40,
    borderRadius: 20,
    alignItems: 'center',
    marginBottom: 25,
  },
  resultadoTexto: {
    fontSize: 22,
    fontWeight: 'bold',
    textAlign: 'center',
  },
  jugarDeNuevoButton: {
    backgroundColor: '#FF6B9D',
    paddingVertical: 12,
    paddingHorizontal: 30,
    borderRadius: 20,
  },
  jugarDeNuevoText: {
    color: '#FFFFFF',
    fontSize: 14,
    fontWeight: '600',
  },
  
  // === HISTORIAL STYLES ===
  historySection: {
    marginTop: 20,
  },
  historyTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: '#333333',
    marginBottom: 10,
    textAlign: 'center',
  },
  historyList: {
    borderRadius: 15,
    padding: 15,
    minHeight: 100,
  },
  historyItem: {
    flexDirection: 'row',
    paddingVertical: 10,
    borderBottomWidth: 1,
  },
  historyGame: {
    fontSize: 12,
    fontWeight: 'bold',
    width: 50,
  },
  historyResult: {
    flex: 1,
    fontSize: 14,
    textAlign: 'center',
  },
  historyDate: {
    fontSize: 12,
  },
  historyEmpty: {
    fontSize: 14,
    textAlign: 'center',
    marginTop: 20,
  },
});