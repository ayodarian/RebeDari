import { View, Text, StyleSheet, ScrollView, Pressable, TouchableOpacity, ActivityIndicator, Alert, Linking } from 'react-native';
import { useState, useEffect } from 'react';
import * as DocumentPicker from 'expo-document-picker';
import * as Sharing from 'expo-sharing';
import * as FileSystem from 'expo-file-system';
import { collection, addDoc, onSnapshot, deleteDoc, doc, query, orderBy, where } from 'firebase/firestore';
import { db, uploadFile, deleteFile } from '../../lib/firebase';

interface Carta {
  id: string;
  titulo: string;
  url: string;
  path: string;
  remitente: string;
  fecha: string;
  created_at: string;
}

export default function CartasScreen() {
  const [pestanaActiva, setPestanaActiva] = useState<'Lebebe' | 'Darian'>('Lebebe');
  const [cartas, setCartas] = useState<Carta[]>([]);
  const [uploading, setUploading] = useState(false);

  useEffect(() => {
    const cartasQuery = query(
      collection(db, 'cartas'),
      where('remitente', '==', pestanaActiva),
      orderBy('created_at', 'desc')
    );
    
    const unsubscribe = onSnapshot(cartasQuery, (snapshot) => {
      const cartasData = snapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data()
      })) as Carta[];
      setCartas(cartasData);
    });

    return () => unsubscribe();
  }, [pestanaActiva]);

  const uploadCarta = async () => {
    try {
      const result = await DocumentPicker.getDocumentAsync({
        type: 'application/pdf',
        copyToCache: true,
      });

      if (!result.canceled && result.file) {
        setUploading(true);
        
        const timestamp = Date.now();
        const path = `cartas/${pestanaActiva}/${timestamp}.pdf`;
        const url = await uploadFile(result.uri, path);
        
        const titulo = result.name.replace('.pdf', '');
        
        await addDoc(collection(db, 'cartas'), {
          titulo,
          url,
          path,
          remitente: pestanaActiva,
          fecha: new Date().toLocaleDateString('es-MX'),
          created_at: new Date().toISOString(),
        });
        
        Alert.alert('Éxito', 'Carta subida correctamente');
      }
    } catch (error) {
      Alert.alert('Error', 'No se pudo subir la carta');
      console.error(error);
    } finally {
      setUploading(false);
    }
  };

  const abrirCarta = async (carta: Carta) => {
    try {
      const isAvailable = await Sharing.isAvailableAsync();
      
      if (isAvailable) {
        const fileUri = FileSystem.cacheDirectory + `${carta.titulo}.pdf`;
        const downloadResult = await FileSystem.downloadAsync(carta.url, fileUri);
        await Sharing.shareAsync(downloadResult.uri);
      } else {
        await Linking.openURL(carta.url);
      }
    } catch (error) {
      try {
        await Linking.openURL(carta.url);
      } catch (linkError) {
        Alert.alert('Error', 'No se pudo abrir el archivo');
        console.error(linkError);
      }
    }
  };

  const eliminarCarta = async (carta: Carta) => {
    Alert.alert(
      'Eliminar Carta',
      '¿Estás seguro?',
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
              console.error('Error deleting carta:', error);
            }
          }
        },
      ]
    );
  };

  const renderTarjeta = (carta: Carta) => (
    <TouchableOpacity
      key={carta.id}
      style={styles.tarjeta}
      onPress={() => abrirCarta(carta)}
      onLongPress={() => eliminarCarta(carta)}
    >
      <View style={styles.tarjetaIcono}>
        <Text style={styles.tarjetaIconText}>📄</Text>
      </View>
      <View style={styles.tarjetaContent}>
        <Text style={styles.tarjetaTitulo}>{carta.titulo}</Text>
        <Text style={styles.tarjetaSubtitulo}>
          {carta.fecha}
        </Text>
      </View>
    </TouchableOpacity>
  );

  return (
    <View style={styles.container}>
      {uploading && (
        <View style={styles.loadingOverlay}>
          <ActivityIndicator size="large" color="#FF6B9D" />
          <Text style={styles.loadingText}>Subiendo carta...</Text>
        </View>
      )}
      
      <View style={[styles.header, { paddingTop: 5 }]}>
        <Text style={styles.title}>Cartas</Text>
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
    </View>
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
    bottom: 130,
    width: 60,
    height: 60,
    borderRadius: 30,
    backgroundColor: '#FF6B9D',
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.25,
    shadowRadius: 4,
    elevation: 5,
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
});