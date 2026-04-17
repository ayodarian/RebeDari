import { View, Text, StyleSheet, FlatList, TextInput, Pressable, KeyboardAvoidingView, Platform } from 'react-native';
import { useState, useEffect } from 'react';

interface Carta {
  id: string;
  contenido: string;
  autor: string;
  created_at: string;
}

export default function CartasScreen() {
  const [cartas, setCartas] = useState<Carta[]>([]);
  const [nuevaCarta, setNuevaCarta] = useState('');

  useEffect(() => {
    setCartas([
      { id: '1', contenido: 'Hola mi amor, te quiero mucho!', autor: 'Tu', created_at: new Date().toISOString() },
      { id: '2', contenido: 'Yo también te amo ❤️', autor: 'Ella', created_at: new Date().toISOString() },
    ]);
  }, []);

  const enviarCarta = () => {
    if (nuevaCarta.trim()) {
      const carta: Carta = {
        id: Date.now().toString(),
        contenido: nuevaCarta,
        autor: 'Tu',
        created_at: new Date().toISOString(),
      };
      setCartas([carta, ...cartas]);
      setNuevaCarta('');
    }
  };

  const renderCarta = ({ item }: { item: Carta }) => (
    <View style={styles.cartaContainer}>
      <View style={styles.cartaBubble}>
        <Text style={styles.cartaContenido}>{item.contenido}</Text>
        <View style={styles.cartaFooter}>
          <Text style={styles.cartaAutor}>{item.autor}</Text>
          <Text style={styles.cartaHora}>
            {new Date(item.created_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
          </Text>
        </View>
      </View>
    </View>
  );

  return (
    <KeyboardAvoidingView
      style={styles.container}
      behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
    >
      <View style={styles.header}>
        <Text style={styles.title}>Cartas</Text>
      </View>
      <FlatList
        data={cartas}
        renderItem={renderCarta}
        keyExtractor={(item) => item.id}
        showsVerticalScrollIndicator={false}
        style={styles.lista}
        contentContainerStyle={styles.listaContent}
        ListEmptyComponent={
          <View style={styles.emptyContainer}>
            <Text style={styles.emptyText}>Sin cartas todavía</Text>
            <Text style={styles.emptySubtext}>Escribí la primera carta</Text>
          </View>
        }
      />
      <View style={styles.inputContainer}>
        <TextInput
          style={styles.input}
          placeholder="Escribe una carta de amor..."
          placeholderTextColor="#8E8E93"
          value={nuevaCarta}
          onChangeText={setNuevaCarta}
          multiline
        />
        <Pressable style={styles.enviarButton} onPress={enviarCarta}>
          <Text style={styles.enviarText}>💌</Text>
        </Pressable>
      </View>
    </KeyboardAvoidingView>
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
  lista: {
    flex: 1,
  },
  listaContent: {
    paddingHorizontal: 15,
  },
  cartaContainer: {
    marginBottom: 15,
    alignItems: 'flex-start',
  },
  cartaBubble: {
    maxWidth: '80%',
    backgroundColor: '#F5F5F5',
    borderRadius: 18,
    padding: 15,
  },
  cartaContenido: {
    fontSize: 16,
    color: '#000000',
  },
  cartaFooter: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginTop: 8,
  },
  cartaAutor: {
    fontSize: 12,
    color: '#FF6B9D',
    fontWeight: '600',
  },
  cartaHora: {
    fontSize: 12,
    color: '#8E8E93',
  },
  emptyContainer: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingTop: 100,
  },
  emptyText: {
    fontSize: 18,
    fontWeight: '600',
    color: '#8E8E93',
  },
  emptySubtext: {
    fontSize: 14,
    color: '#8E8E93',
    marginTop: 5,
  },
  inputContainer: {
    flexDirection: 'row',
    padding: 15,
    backgroundColor: '#FFFFFF',
    borderTopWidth: 1,
    borderTopColor: '#E5E5E5',
    alignItems: 'flex-end',
  },
  input: {
    flex: 1,
    backgroundColor: '#F5F5F5',
    borderRadius: 20,
    paddingHorizontal: 15,
    paddingVertical: 10,
    fontSize: 16,
    maxHeight: 100,
    marginRight: 10,
  },
  enviarButton: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: '#FF6B9D',
    alignItems: 'center',
    justifyContent: 'center',
  },
  enviarText: {
    fontSize: 20,
  },
});