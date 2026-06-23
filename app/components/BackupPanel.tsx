import { useState } from 'react';
import {
  View,
  Text,
  Pressable,
  Modal,
  ActivityIndicator,
  Alert,
  StyleSheet,
} from 'react-native';
import * as DocumentPicker from 'expo-document-picker';
import {
  BackupProgress,
  BackupResult,
  createBackup,
  shareBackup,
  readBackupFile,
  restoreBackup,
  RestoreReport,
} from '../../lib/backup';
import { useTheme } from './ThemeProvider';

type Phase = 'idle' | 'working' | 'success' | 'error';

interface WorkingState {
  title: string;
  progress: BackupProgress;
}

export function BackupPanel() {
  const { theme } = useTheme();
  const [phase, setPhase] = useState<Phase>('idle');
  const [working, setWorking] = useState<WorkingState | null>(null);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [report, setReport] = useState<RestoreReport | null>(null);
  const [lastResult, setLastResult] = useState<BackupResult | null>(null);

  const startWorking = (title: string) => {
    setPhase('working');
    setErrorMsg(null);
    setReport(null);
    setWorking({
      title,
      progress: { phase: 'fetching', current: 0, total: 0, message: '' },
    });
  };

  const updateProgress = (progress: BackupProgress) => {
    setWorking((prev) => (prev ? { ...prev, progress } : prev));
  };

  const finishOk = (next?: BackupResult) => {
    if (next) setLastResult(next);
    setPhase('success');
    setWorking(null);
  };

  const finishErr = (msg: string) => {
    setErrorMsg(msg);
    setPhase('error');
    setWorking(null);
  };

  const handleExport = async (scope: 'db' | 'full') => {
    startWorking(scope === 'db' ? 'Exportando datos…' : 'Exportando todo…');
    try {
      const result = await createBackup(scope, updateProgress);
      finishOk(result);
      try {
        await shareBackup(result);
      } catch (shareErr) {
        console.warn('[backup] share error:', shareErr);
      }
    } catch (e: any) {
      console.error('[backup] export error:', e);
      finishErr(e?.message || 'No se pudo crear el respaldo');
    }
  };

  const handleReshare = async () => {
    if (!lastResult) return;
    try {
      await shareBackup(lastResult);
    } catch (e: any) {
      Alert.alert('Error', e?.message || 'No se pudo compartir');
    }
  };

  const handleImport = async () => {
    Alert.alert(
      'Restaurar respaldo',
      'Esto insertará los datos del respaldo en tu cuenta actual. Las fotos, videos, cartas, bitácora, bingo, mensajes y notificaciones se sobreescribirán con lo del archivo. Tu usuario y sesión no cambian.\n\n¿Continuar?',
      [
        { text: 'Cancelar', style: 'cancel' },
        {
          text: 'Elegir archivo',
          onPress: async () => {
            try {
              const pick = await DocumentPicker.getDocumentAsync({
                type: ['application/json', 'public.json', '*/*'],
                copyToCacheDirectory: true,
              });
              if (pick.canceled || !pick.assets || !pick.assets[0]) return;
              const file = pick.assets[0];
              startWorking('Restaurando respaldo…');
              const manifest = await readBackupFile(file.uri);
              const r = await restoreBackup(manifest, updateProgress);
              setReport(r);
              if (r.errors.length === 0) {
                setPhase('success');
              } else {
                setPhase('error');
                setErrorMsg(`Restaurado con ${r.errors.length} error(es).`);
              }
              setWorking(null);
            } catch (e: any) {
              console.error('[backup] import error:', e);
              finishErr(e?.message || 'No se pudo restaurar');
            }
          },
        },
      ]
    );
  };

  const dismissModal = () => {
    setPhase('idle');
    setErrorMsg(null);
    setReport(null);
  };

  const totalLabel = working?.progress.total
    ? `${working.progress.current}/${working.progress.total}`
    : '';

  return (
    <View style={[styles.section, { backgroundColor: theme.surface }]}>
      <Text style={[styles.sectionTitle, { color: theme.primary }]}>Respaldo</Text>
      <Text style={[styles.help, { color: theme.textSecondary }]}>
        Guarda una copia de seguridad de tus fotos, videos, cartas, bitácora, bingo, mensajes y
        notificaciones. El archivo .json se puede abrir y compartir.
      </Text>

      <Pressable
        style={[styles.button, { backgroundColor: theme.primary }]}
        onPress={() => handleExport('db')}
        disabled={phase === 'working'}
      >
        <Text style={[styles.buttonText, { color: theme.text }]}>Exportar solo datos (.json)</Text>
      </Pressable>

      <Pressable
        style={[styles.button, { backgroundColor: theme.primaryLight }]}
        onPress={() => handleExport('full')}
        disabled={phase === 'working'}
      >
        <Text style={[styles.buttonText, { color: theme.text }]}>
          Exportar todo (datos + archivos multimedia)
        </Text>
      </Pressable>

      <Pressable
        style={[styles.button, styles.buttonSecondary, { borderColor: theme.primary }]}
        onPress={handleImport}
        disabled={phase === 'working'}
      >
        <Text style={[styles.buttonSecondaryText, { color: theme.primary }]}>
          Restaurar desde archivo…
        </Text>
      </Pressable>

      {lastResult && (
        <Pressable
          style={[styles.linkButton]}
          onPress={handleReshare}
          disabled={phase === 'working'}
        >
          <Text style={[styles.linkText, { color: theme.primary }]}>
            Compartir último respaldo de nuevo
          </Text>
        </Pressable>
      )}

      <Modal
        visible={phase !== 'idle'}
        transparent
        animationType="fade"
        onRequestClose={phase === 'working' ? undefined : dismissModal}
      >
        <View style={styles.modalOverlay}>
          <View style={[styles.modalCard, { backgroundColor: theme.surface }]}>
            {phase === 'working' && working && (
              <>
                <ActivityIndicator size="large" color={theme.primary} />
                <Text style={[styles.modalTitle, { color: theme.text }]}>{working.title}</Text>
                <Text style={[styles.modalMessage, { color: theme.textSecondary }]}>
                  {working.progress.message || 'Procesando…'}
                </Text>
                {totalLabel ? (
                  <Text style={[styles.modalSubtle, { color: theme.textTertiary }]}>
                    {totalLabel}
                  </Text>
                ) : null}
              </>
            )}

            {phase === 'success' && (
              <>
                <Text style={[styles.modalIcon, { color: theme.success }]}>✓</Text>
                <Text style={[styles.modalTitle, { color: theme.text }]}>Listo</Text>
                {report ? (
                  <View style={styles.reportBox}>
                    {Object.entries(report.tablesImported).map(([t, n]) => (
                      <Text key={t} style={[styles.modalMessage, { color: theme.textSecondary }]}>
                        {t}: {n} registros
                      </Text>
                    ))}
                    {report.errors.length > 0 && (
                      <Text style={[styles.modalSubtle, { color: theme.error }]}>
                        {report.errors.length} error(es)
                      </Text>
                    )}
                  </View>
                ) : (
                  <Text style={[styles.modalMessage, { color: theme.textSecondary }]}>
                    Respaldo guardado correctamente.
                  </Text>
                )}
                <Pressable
                  style={[styles.modalButton, { backgroundColor: theme.primary }]}
                  onPress={dismissModal}
                >
                  <Text style={[styles.buttonText, { color: theme.text }]}>Cerrar</Text>
                </Pressable>
              </>
            )}

            {phase === 'error' && (
              <>
                <Text style={[styles.modalIcon, { color: theme.error }]}>✗</Text>
                <Text style={[styles.modalTitle, { color: theme.text }]}>Algo salió mal</Text>
                <Text style={[styles.modalMessage, { color: theme.textSecondary }]}>
                  {errorMsg || 'Error desconocido'}
                </Text>
                {report && report.errors.length > 0 && (
                  <View style={styles.reportBox}>
                    {report.errors.slice(0, 5).map((e, i) => (
                      <Text key={i} style={[styles.modalSubtle, { color: theme.error }]}>
                        • {e}
                      </Text>
                    ))}
                  </View>
                )}
                <Pressable
                  style={[styles.modalButton, { backgroundColor: theme.primary }]}
                  onPress={dismissModal}
                >
                  <Text style={[styles.buttonText, { color: theme.text }]}>Cerrar</Text>
                </Pressable>
              </>
            )}
          </View>
        </View>
      </Modal>
    </View>
  );
}

const styles = StyleSheet.create({
  section: {
    borderRadius: 12,
    padding: 16,
    marginBottom: 16,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    marginBottom: 8,
  },
  help: {
    fontSize: 13,
    marginBottom: 12,
    lineHeight: 18,
  },
  button: {
    borderRadius: 8,
    paddingVertical: 12,
    alignItems: 'center',
    marginBottom: 8,
  },
  buttonSecondary: {
    backgroundColor: 'transparent',
    borderWidth: 1,
  },
  buttonText: {
    fontSize: 15,
    fontWeight: '600',
  },
  buttonSecondaryText: {
    fontSize: 15,
    fontWeight: '600',
  },
  linkButton: {
    alignItems: 'center',
    paddingVertical: 8,
  },
  linkText: {
    fontSize: 13,
    textDecorationLine: 'underline',
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.5)',
    justifyContent: 'center',
    alignItems: 'center',
    padding: 24,
  },
  modalCard: {
    width: '100%',
    maxWidth: 360,
    borderRadius: 16,
    padding: 24,
    alignItems: 'center',
  },
  modalIcon: {
    fontSize: 48,
    marginBottom: 8,
  },
  modalTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    marginTop: 12,
    marginBottom: 8,
    textAlign: 'center',
  },
  modalMessage: {
    fontSize: 14,
    textAlign: 'center',
    marginBottom: 4,
  },
  modalSubtle: {
    fontSize: 12,
    textAlign: 'center',
    marginTop: 4,
  },
  modalButton: {
    marginTop: 16,
    borderRadius: 8,
    paddingVertical: 10,
    paddingHorizontal: 24,
  },
  reportBox: {
    width: '100%',
    marginTop: 8,
  },
});

export default BackupPanel;
