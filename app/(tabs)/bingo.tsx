import { View, Text, StyleSheet, Pressable, ScrollView } from 'react-native';
import { useState, useEffect } from 'react';

interface BingoCard {
  id: number;
  numbers: number[];
  marked: number[];
}

const BINGO_LABELS = ['B', 'I', 'N', 'G', 'O'];

export default function BingoScreen() {
  const [cards, setCards] = useState<BingoCard[]>([]);
  const [selectedCard, setSelectedCard] = useState<number | null>(null);
  const [currentNumber, setCurrentNumber] = useState<number | null>(null);
  const [history, setHistory] = useState<number[]>([]);

  useEffect(() => {
    setCards([
      { id: 1, numbers: generateCard(), marked: [] },
      { id: 2, numbers: generateCard(), marked: [] },
    ]);
  }, []);

  const generateCard = (): number[] => {
    const card: number[] = [];
    for (let col = 0; col < 5; col++) {
      const min = col * 15 + 1;
      const max = (col + 1) * 15;
      const columnNumbers: number[] = [];
      while (columnNumbers.length < 5) {
        const num = Math.floor(Math.random() * (max - min + 1)) + min;
        if (!columnNumbers.includes(num)) {
          columnNumbers.push(num);
        }
      }
      card.push(...columnNumbers);
    }
    card[12] = 0;
    return card;
  };

  const drawNumber = () => {
    const allDrawn = cards.flatMap(c => c.numbers).filter(n => n > 0 && !history.includes(n));
    if (allDrawn.length === 0) return;
    
    const available = allDrawn.filter(n => !history.includes(n));
    const randomNum = available[Math.floor(Math.random() * available.length)];
    setCurrentNumber(randomNum);
    setHistory([...history, randomNum]);
    
    if (selectedCard !== null) {
      const cardIndex = cards.findIndex(c => c.id === selectedCard);
      if (cardIndex !== -1) {
        const cardNumbers = cards[cardIndex].numbers;
        const markedIndex = cardNumbers.indexOf(randomNum);
        if (markedIndex !== -1) {
          const newMarked = [...cards[cardIndex].marked, markedIndex];
          const newCards = [...cards];
          newCards[cardIndex] = { ...cards[cardIndex], marked: newMarked };
          setCards(newCards);
        }
      }
    }
  };

  const toggleNumber = (cardId: number, index: number) => {
    const cardIndex = cards.findIndex(c => c.id === cardId);
    if (cardIndex === -1) return;
    
    const newMarked = cards[cardIndex].marked.includes(index)
      ? cards[cardIndex].marked.filter(i => i !== index)
      : [...cards[cardIndex].marked, index];
    
    const newCards = [...cards];
    newCards[cardIndex] = { ...cards[cardIndex], marked: newMarked };
    setCards(newCards);
  };

  const checkBingo = (card: BingoCard): boolean => {
    const marked = new Set(card.marked);
    for (let i = 0; i < 5; i++) {
      if ([0,1,2,3,4].every(j => marked.has(i * 5 + j))) return true;
    }
    for (let i = 0; i < 5; i++) {
      if ([0,5,10,15,20].every(j => marked.has(i + j))) return true;
    }
    if (marked.has(0) && marked.has(4) && marked.has(20) && marked.has(24)) return true;
    if (marked.has(4) && marked.has(8) && marked.has(16) && marked.has(20)) return true;
    return false;
  };

  const renderCard = (card: BingoCard) => {
    const isWinner = checkBingo(card);
    return (
      <Pressable
        key={card.id}
        style={[styles.card, selectedCard === card.id && styles.cardSelected]}
        onPress={() => setSelectedCard(card.id)}
      >
        <View style={styles.cardHeader}>
          <Text style={styles.cardTitle}>Card {card.id}</Text>
          {isWinner && <Text style={styles.winnerBadge}>🎉 BINGO!</Text>}
        </View>
        <View style={styles.grid}>
          {BINGO_LABELS.map((label, colIndex) => (
            <View key={colIndex} style={styles.column}>
              <Text style={styles.columnLabel}>{label}</Text>
              {Array.from({ length: 5 }).map((_, rowIndex) => {
                const numIndex = colIndex * 5 + rowIndex;
                const num = card.numbers[numIndex];
                const isMarked = card.marked.includes(numIndex);
                return (
                  <Pressable
                    key={rowIndex}
                    style={[styles.cell, isMarked && styles.cellMarked]}
                    onPress={() => num !== 0 && toggleNumber(card.id, numIndex)}
                    disabled={num === 0}
                  >
                    <Text style={[styles.cellText, isMarked && styles.cellTextMarked]}>
                      {num === 0 ? '★' : num}
                    </Text>
                  </Pressable>
                );
              })}
            </View>
          ))}
        </View>
      </Pressable>
    );
  };

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <Text style={styles.title}>Bingo</Text>
      </View>
      <ScrollView style={styles.content}>
        <View style={styles.drawSection}>
          <View style={styles.currentDraw}>
            <Text style={styles.currentLabel}>Número actual:</Text>
            <Text style={styles.currentNumber}>{currentNumber || '-'}</Text>
          </View>
          <Pressable style={styles.drawButton} onPress={drawNumber}>
            <Text style={styles.drawButtonText}>Sacar número</Text>
          </Pressable>
        </View>
        <View style={styles.historySection}>
          <Text style={styles.historyLabel}>Historial:</Text>
          <View style={styles.historyNumbers}>
            {history.map((num, i) => (
              <View key={i} style={styles.historyBall}>
                <Text style={styles.historyBallText}>{num}</Text>
              </View>
            ))}
          </View>
        </View>
        <Text style={styles.cardsTitle}>Tus Cards</Text>
        {cards.map(renderCard)}
      </ScrollView>
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
    paddingHorizontal: 15,
  },
  drawSection: {
    alignItems: 'center',
    paddingVertical: 20,
  },
  currentDraw: {
    alignItems: 'center',
    marginBottom: 15,
  },
  currentLabel: {
    fontSize: 14,
    color: '#8E8E93',
  },
  currentNumber: {
    fontSize: 48,
    fontWeight: 'bold',
    color: '#FF6B9D',
  },
  drawButton: {
    backgroundColor: '#FF6B9D',
    paddingHorizontal: 30,
    paddingVertical: 15,
    borderRadius: 25,
  },
  drawButtonText: {
    color: '#FFFFFF',
    fontSize: 16,
    fontWeight: '600',
  },
  historySection: {
    marginBottom: 20,
  },
  historyLabel: {
    fontSize: 14,
    color: '#8E8E93',
    marginBottom: 10,
  },
  historyNumbers: {
    flexDirection: 'row',
    flexWrap: 'wrap',
  },
  historyBall: {
    width: 30,
    height: 30,
    borderRadius: 15,
    backgroundColor: '#F5F5F5',
    alignItems: 'center',
    justifyContent: 'center',
    margin: 3,
  },
  historyBallText: {
    fontSize: 12,
    color: '#000000',
  },
  cardsTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: '#000000',
    marginBottom: 15,
  },
  card: {
    backgroundColor: '#F5F5F5',
    borderRadius: 15,
    padding: 15,
    marginBottom: 20,
  },
  cardSelected: {
    borderWidth: 2,
    borderColor: '#FF6B9D',
  },
  cardHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 10,
  },
  cardTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: '#000000',
  },
  winnerBadge: {
    fontSize: 14,
    color: '#FF6B9D',
    fontWeight: 'bold',
  },
  grid: {
    flexDirection: 'row',
  },
  column: {
    flex: 1,
    alignItems: 'center',
  },
  columnLabel: {
    fontSize: 12,
    fontWeight: 'bold',
    color: '#FF6B9D',
    marginBottom: 5,
  },
  cell: {
    width: 40,
    height: 40,
    backgroundColor: '#FFFFFF',
    borderRadius: 8,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 3,
  },
  cellMarked: {
    backgroundColor: '#FF6B9D',
  },
  cellText: {
    fontSize: 14,
    color: '#000000',
  },
  cellTextMarked: {
    color: '#FFFFFF',
  },
});