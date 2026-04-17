import { View, Text, StyleSheet, Pressable, Animated, Easing } from 'react-native';
import { useState, useEffect, useRef } from 'react';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

type Player = 'Tu' | 'Ella';

interface HistoryItem {
  winner: Player;
  date: string;
  tuNumber: number;
  ellaNumber: number;
}

export default function DedosScreen() {
  const insets = useSafeAreaInsets();
  const [gameState, setGameState] = useState<'waiting' | 'ready' | 'counting' | 'showing'>('waiting');
  const [tuTouching, setTuTouching] = useState(false);
  const [ellaTouching, setEllaTouching] = useState(false);
  const [winner, setWinner] = useState<Player | null>(null);
  const [loser, setLoser] = useState<Player | null>(null);
  const [history, setHistory] = useState<HistoryItem[]>([]);

  const pulseAnim = useRef(new Animated.Value(1)).current;
  const ringWidth = useRef(new Animated.Value(2)).current;
  const ringOpacity = useRef(new Animated.Value(0.3)).current;

  useEffect(() => {
    if (tuTouching && ellaTouching) {
      setGameState('ready');
      startCountdown();
    } else {
      setGameState('waiting');
      setWinner(null);
      setLoser(null);
      pulseAnim.setValue(1);
      ringWidth.setValue(2);
      ringOpacity.setValue(0.3);
    }
  }, [tuTouching, ellaTouching]);

  const startCountdown = async () => {
    setGameState('counting');
    
    const pulseAnimation = Animated.loop(
      Animated.sequence([
        Animated.parallel([
          Animated.timing(pulseAnim, {
            toValue: 1.15,
            duration: 500,
            easing: Easing.inOut(Easing.ease),
            useNativeDriver: true,
          }),
          Animated.timing(ringWidth, {
            toValue: 6,
            duration: 500,
            useNativeDriver: false,
          }),
          Animated.timing(ringOpacity, {
            toValue: 1,
            duration: 500,
            useNativeDriver: false,
          }),
        ]),
        Animated.parallel([
          Animated.timing(pulseAnim, {
            toValue: 1,
            duration: 500,
            easing: Easing.inOut(Easing.ease),
            useNativeDriver: true,
          }),
          Animated.timing(ringWidth, {
            toValue: 2,
            duration: 500,
            useNativeDriver: false,
          }),
          Animated.timing(ringOpacity, {
            toValue: 0.3,
            duration: 500,
            useNativeDriver: false,
          }),
        ]),
      ])
    );
    
    pulseAnimation.start();

    await new Promise(resolve => setTimeout(resolve, 3000));
    pulseAnimation.stop();

    const tuNum = Math.floor(Math.random() * 10) + 1;
    const ellaNum = Math.floor(Math.random() * 10) + 1;
    
    let roundWinner: Player | null = null;
    if (tuNum > ellaNum) {
      roundWinner = 'Tu';
    } else if (ellaNum > tuNum) {
      roundWinner = 'Ella';
    } else {
      roundWinner = Math.random() > 0.5 ? 'Tu' : 'Ella';
    }

    const roundLoser = roundWinner === 'Tu' ? 'Ella' : 'Tu';

    setWinner(roundWinner);
    setLoser(roundLoser);
    setGameState('showing');
    pulseAnim.setValue(1);
    ringWidth.setValue(2);
    ringOpacity.setValue(0.3);

    const now = new Date();
    const dateStr = now.toLocaleString('es-ES', {
      day: '2-digit',
      month: '2-digit',
      hour: '2-digit',
      minute: '2-digit'
    });

    setHistory([{ winner: roundWinner, date: dateStr, tuNumber: tuNum, ellaNumber: ellaNum }, ...history].slice(0, 10));
  };

  const handleTuPressIn = () => setTuTouching(true);
  const handleTuPressOut = () => setTuTouching(false);
  const handleEllaPressIn = () => setEllaTouching(true);
  const handleEllaPressOut = () => setEllaTouching(false);

  const getStatusMessage = () => {
    if (!tuTouching && !ellaTouching) return '✌️ Toca ambos círculos para jugar';
    if (tuTouching && !ellaTouching) return '👆 Espera que ella toque...';
    if (!tuTouching && ellaTouching) return '👆 Espera que toques...';
    if (gameState === 'ready') return '🎯 ¡Ya! Comenzando...';
    if (gameState === 'counting') return '🎲 Sorteando...';
    if (gameState === 'showing' && winner) return `🎉 ¡Ganó ${winner}!`;
    return '❓';
  };

  return (
    <View style={[styles.container, { paddingTop: insets.top + 15 }]}>
      <View style={styles.header}>
        <Text style={styles.title}>Dedos</Text>
      </View>

      <View style={styles.content}>
        <Text style={styles.subtitle}>{getStatusMessage()}</Text>

        <View style={styles.playersContainer}>
          <View>
            <Animated.View
              style={[
                styles.fingerCircle,
                (winner === 'Tu' || tuTouching) && styles.fingerCircleActive,
                loser === 'Tu' && styles.fingerCircleLoser,
                { transform: [{ scale: winner === 'Tu' ? 1.1 : 1 }] }
              ]}
            >
              <Pressable
                style={styles.touchArea}
                onPressIn={handleTuPressIn}
                onPressOut={handleTuPressOut}
              >
                <Text style={styles.fingerEmoji}>✌️</Text>
                <Text style={styles.fingerLabel}>Tú</Text>
                {winner === 'Tu' && <Text style={styles.winnerBadge}>✓</Text>}
              </Pressable>
            </Animated.View>
          </View>

          <Text style={styles.vsText}>VS</Text>

          <View>
            <Animated.View
              style={[
                styles.fingerCircle,
                (winner === 'Ella' || ellaTouching) && styles.fingerCircleActive,
                loser === 'Ella' && styles.fingerCircleLoser,
                { transform: [{ scale: winner === 'Ella' ? 1.1 : 1 }] }
              ]}
            >
              <Pressable
                style={styles.touchArea}
                onPressIn={handleEllaPressIn}
                onPressOut={handleEllaPressOut}
              >
                <Text style={styles.fingerEmoji}>✌️</Text>
                <Text style={styles.fingerLabel}>Ella</Text>
                {winner === 'Ella' && <Text style={styles.winnerBadge}>✓</Text>}
              </Pressable>
            </Animated.View>
          </View>
        </View>

        <View style={styles.historySection}>
          <Text style={styles.historyTitle}>Historial</Text>
          <View style={styles.historyList}>
            {history.map((round, index) => (
              <View key={index} style={styles.historyItem}>
                <Text style={styles.historyText}>
                  {round.winner === 'Tu' ? '🔥' : '💜'} {round.winner === 'Tu' ? 'Ganaste' : 'Ganó ella'} • {round.date}
                </Text>
              </View>
            ))}
            {history.length === 0 && (
              <Text style={styles.historyEmpty}>Sin jugadas aún</Text>
            )}
          </View>
        </View>
      </View>
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
    fontSize: 24,
    fontWeight: 'bold',
    color: '#FF6B9D',
  },
  content: {
    flex: 1,
    alignItems: 'center',
    paddingHorizontal: 15,
  },
  subtitle: {
    fontSize: 18,
    fontWeight: '600',
    color: '#666666',
    marginBottom: 30,
    textAlign: 'center',
  },
  playersContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 30,
  },
  fingerCircle: {
    width: 120,
    height: 120,
    borderRadius: 60,
    backgroundColor: '#F5F5F5',
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 3,
    borderColor: 'rgba(255, 107, 157, 0.3)',
  },
  fingerCircleActive: {
    backgroundColor: 'rgba(255, 107, 157, 0.2)',
    borderColor: '#FF6B9D',
  },
  fingerCircleLoser: {
    backgroundColor: '#E0E0E0',
    borderColor: '#BDBDBD',
    opacity: 0.6,
  },
  fingerCircleWinner: {
    backgroundColor: '#FF6B9D',
    borderColor: '#FF1493',
    borderWidth: 5,
  },
  touchArea: {
    width: '100%',
    height: '100%',
    alignItems: 'center',
    justifyContent: 'center',
  },
  fingerEmoji: {
    fontSize: 40,
  },
  fingerLabel: {
    fontSize: 14,
    fontWeight: '600',
    color: '#333333',
    marginTop: 5,
  },
  winnerBadge: {
    position: 'absolute',
    top: -5,
    right: -5,
    width: 28,
    height: 28,
    borderRadius: 14,
    backgroundColor: '#FF6B9D',
    alignItems: 'center',
    justifyContent: 'center',
  },
  vsText: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#8E8E93',
    marginHorizontal: 25,
  },
  historySection: {
    width: '100%',
    paddingHorizontal: 15,
  },
  historyTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: '#333333',
    marginBottom: 10,
    textAlign: 'center',
  },
  historyList: {
    backgroundColor: 'rgba(255, 255, 255, 0.6)',
    borderRadius: 15,
    padding: 15,
    minHeight: 120,
  },
  historyItem: {
    paddingVertical: 8,
    borderBottomWidth: 1,
    borderBottomColor: 'rgba(0,0,0,0.05)',
  },
  historyText: {
    fontSize: 14,
    color: '#333333',
    textAlign: 'center',
  },
  historyEmpty: {
    fontSize: 14,
    color: '#8E8E93',
    textAlign: 'center',
    marginTop: 20,
  },
});