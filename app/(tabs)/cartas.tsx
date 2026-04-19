import { View, Text, StyleSheet, ScrollView, Pressable, Image } from 'react-native';
import { useState } from 'react';

interface DocumentoCarta {
  id: string;
  titulo: string;
  remitente: string;
  fecha: string;
}

const documentosLebebe: DocumentoCarta[] = [
  { id: '1', titulo: 'Carta de Aniversario', remitente: 'De Darian para Rebeca', fecha: '12 Dic 2025' },
  { id: '2', titulo: 'Mi Primer Amor', remitente: 'De Darian para Rebeca', fecha: '14 Feb 2025' },
  { id: '3', titulo: 'Te Extraño', remitente: 'De Rebeca para Darian', fecha: '5 Mar 2026' },
  { id: '4', titulo: 'Carta de San Valentín', remitente: 'De Darian para Rebeca', fecha: '14 Feb 2026' },
];

const documentosDarian: DocumentoCarta[] = [
  { id: '1', titulo: 'Carta de Cumpleaños', remitente: 'De Rebeca para Darian', fecha: '15 Jun 2025' },
  { id: '2', titulo: 'Mensaje Especial', remitente: 'De Rebeca para Darian', fecha: '20 Jul 2025' },
  { id: '3', titulo: 'Te Amo', remitente: 'De Rebeca para Darian', fecha: '10 Oct 2025' },
];

export default function CartasScreen() {
  const [pestanaActiva, setPestanaActiva] = useState<'Lebebe' | 'Darian'>('Lebebe');

  const documentos = pestanaActiva === 'Lebebe' ? documentosLebebe : documentosDarian;

  const abrirDocumento = (documento: DocumentoCarta) => {
    console.log('Abrir documento:', documento.titulo);
  };

  const renderTarjeta = (documento: DocumentoCarta) => (
    <Pressable
      key={documento.id}
      style={styles.tarjeta}
      onPress={() => abrirDocumento(documento)}
    >
      <Image
        source={require('../../assets/icon-carta.png')}
        style={styles.tarjetaIcono}
      />
      <View style={styles.tarjetaContent}>
        <Text style={styles.tarjetaTitulo}>{documento.titulo}</Text>
        <Text style={styles.tarjetaSubtitulo}>
          {documento.remitente} • {documento.fecha}
        </Text>
      </View>
    </Pressable>
  );

  return (
    <View style={styles.container}>
      <View style={styles.header}>
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
        {documentos.map(renderTarjeta)}
        {documentos.length === 0 && (
          <View style={styles.emptyContainer}>
            <Text style={styles.emptyText}>Sin documentos todavía</Text>
          </View>
        )}
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: 'rgba(255, 245, 248, 0.95)',
  },
  header: {
    paddingTop: 5,
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
    fontWeight: '600',
    color: '#666666',
  },
  pestanaTextoActivo: {
    color: '#FFFFFF',
  },
  lista: {
    flex: 1,
  },
  listaContent: {
    paddingHorizontal: 15,
    paddingBottom: 20,
  },
  tarjeta: {
    flexDirection: 'row',
    backgroundColor: '#FFFFFF',
    borderRadius: 15,
    padding: 15,
    marginBottom: 12,
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.08,
    shadowRadius: 4,
    elevation: 2,
  },
  tarjetaIcono: {
    width: 40,
    height: 40,
    marginRight: 12,
  },
  tarjetaContent: {
    flex: 1,
  },
  tarjetaTitulo: {
    fontSize: 16,
    fontWeight: '600',
    color: '#000000',
    marginBottom: 4,
  },
  tarjetaSubtitulo: {
    fontSize: 12,
    color: '#8E8E93',
  },
  emptyContainer: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingTop: 50,
  },
  emptyText: {
    fontSize: 16,
    color: '#8E8E93',
  },
});