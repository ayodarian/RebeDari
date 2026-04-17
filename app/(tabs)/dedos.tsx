import { View, Text, StyleSheet, Pressable, Animated } from 'react-native';
import { useState, useEffect, useRef } from 'react';

type Player = 'Tu' | 'Ella';

export default function DedosScreen() {
  const [gameState, setGameState] = useState<'waiting' | 'counting' | 'showing'>('waiting');
  const [count, setCount] = useState(3);
  const [playerChoice, setPlayerChoice] = useState<Player | null>(null);
  const [opponentChoice, setOpponentChoice] = useState<Player | null>(null);
  const [winner, setWinner] = useState<Player | null>(null);
  const [history, setHistory] = useState<{ winner: Player; tu: number; ella: number }[]>([]);
  
  const countAnim = useRef(new Animated.Value(1)).current;
  const resultAnim = useRef(new Animated.Value(0)).current;

  const startGame = async () => {
    setGameState('counting');
    setPlayerChoice(null);
    setOpponentChoice(null);
    setWinner(null);
    setCount(3);
    
    for (let i = 3; i > 0; i--) {
      setCount(i);
      await new Promise(resolve => setTimeout(resolve, 1000));
    }
    
    const tuNum = Math.floor(Math.random() * 10) + 1;
    const ellaNum = Math.floor(Math.random() * 10) + 1;
    
    setPlayerChoice('Tu');
    setOpponentChoice('Ella');
    
    let roundWinner: Player | null = null;
    if (tuNum > ellaNum) {
      roundWinner = 'Tu';
    } else if (ellaNum > tuNum) {
      roundWinner = 'Ella';
    } else {
      const random = Math.random() > 0.5 ? 'Tu' : 'Ella';
      roundWinner = random;
    }
    
    setWinner(roundWinner);
    setGameState('showing');
    
    setHistory([{ winner: roundWinner, tu: tuNum, ella: ellaNum }, ...history].slice(0, 10));
  };

  const renderFinger = (player: Player, show: boolean, num?: number) => (
    <View style={styles.fingerContainer}>
      <Text style={styles.fingerLabel}>{player}</Text>
      <View style={[styles.fingerDisplay, show && styles.fingerDisplayActive]}>
        {show && num ? (
          <Text style={styles.fingerNumber}>{num}</Text>
        ) : (
          <Text style={styles.fingerEmoji}>✌️</Text>
        )}
      </View>
    </View>
  );

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <Text style={styles.title}>Dedos</Text>
      </View>
      
      <View style={styles.content}>
        <Text style={styles.subtitle}>
          {gameState === 'waiting' && '¿Listos para jugar?'}
          {gameState === 'counting' && `(${count})`}
          {gameState === 'showing' && winner && `¡Ganó ${winner}!`}
        </Text>
        
        <View style={styles.playersContainer}>
          {renderFinger('Tu', gameState === 'showing' || gameState === 'counting', history[0]?.tu)}
          <Text style={styles.vsText}>VS</Text>
          {renderFinger('Ella', gameState === 'showing' || gameState === 'counting', history[0]?.ella)}
        </View>
        
        {gameState === 'showing' && winner && (
          <View style={styles.winnerBox}>
            <Text style={styles.winnerText}>🎉 ¡Ganó {winner}!</Text>
          </View>
        )}
        
        <Pressable
          style={[styles.playButton, gameState === 'counting' && styles.playButtonDisabled]}
          onPress={startGame}
          disabled={gameState === 'counting'}
        >
          <Text style={styles.playButtonText}>
            {gameState === 'waiting' ? 'Jugar' : 'Jugando...'}
          </Text>
        </Pressable>
        
        <View style={styles.historySection}>
          <Text style={styles.historyTitle}>Historial</Text>
          <View style={styles.historyList}>
            {history.map((round, index) => (
              <View key={index} style={styles.historyItem}>
                <Text style={styles.historyText}>
                  #{index + 1}: {round.winner === 'Tu' ? '🔥' : '💜'} 
                  ({round.tu} vs {round.ella})
                </Text>
              </View>
            ))}
            {history.length === 0 && (
              <Text style={styles.historyEmpty}>Sinjugadas aún</Text>
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
    backgroundColor: '#FFFFFF',
  },
  header: {
    paddingTop: 60,
    paddingBottom: 15,
    paddingHorizontal: 15,
    backgroundColor: '#FFFFFF',
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
    fontSize: 20,
    fontWeight: '600',
    color: '#000000',
    marginBottom: 30,
  },
  playersContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 30,
  },
  fingerContainer: {
    alignItems: 'center',
  },
  fingerLabel: {
    fontSize: 16,
    fontWeight: '600',
    color: '#000000',
    marginBottom: 10,
  },
  fingerDisplay: {
    width: 100,
    height: 100,
    borderRadius: 50,
    backgroundColor: '#F5F5F5',
    alignItems: 'center',
    justifyContent: 'center',
  },
  fingerDisplayActive: {
    backgroundColor: '#FF6B9D',
  },
  fingerNumber: {
    fontSize: 36,
    fontWeight: 'bold',
    color: '#FFFFFF',
  },
  fingerEmoji: {
    fontSize: 40,
    opacity: 0.3,
  },
  vsText: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#8E8E93',
    marginHorizontal: 20,
  },
  winnerBox: {
    backgroundColor: '#FFF5F8',
    paddingHorizontal: 30,
    paddingVertical: 15,
    borderRadius: 15,
    marginBottom: 20,
  },
  winnerText: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#FF6B9D',
  },
  playButton: {
    backgroundColor: '#FF6B9D',
    paddingHorizontal: 50,
    paddingVertical: 15,
    borderRadius: 25,
    marginBottom: 30,
  },
  playButtonDisabled: {
    opacity: 0.5,
  },
  playButtonText: {
    color: '#FFFFFF',
    fontSize: 18,
    fontWeight: '600',
  },
  historySection: {
    width: '100%',
  },
  historyTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: '#000000',
    marginBottom: 10,
    textAlign: 'center',
  },
  historyList: {
    backgroundColor: '#F5F5F5',
    borderRadius: 10,
    padding: 10,
  },
  historyItem: {
    paddingVertical: 5,
  },
  historyText: {
    fontSize: 14,
    color: '#000000',
    textAlign: 'center',
  },
  historyEmpty: {
    fontSize: 14,
    color: '#8E8E93',
    textAlign: 'center',
  },
});