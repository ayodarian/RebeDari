import {
  documentDirectory,
  getInfoAsync,
  makeDirectoryAsync,
  writeAsStringAsync,
  readAsStringAsync,
  deleteAsync,
  readDirectoryAsync,
  downloadAsync,
} from 'expo-file-system/legacy';
import { getClient, withAuthRetry, getAccessToken } from './insforge';
import { useAppStore } from '../store/index';
import * as Sharing from 'expo-sharing';
import { Alert } from 'react-native';

export type BackupScope = 'db' | 'full';

export interface BackupProgress {
  phase: 'fetching' | 'downloading' | 'writing' | 'done' | 'error';
  current: number;
  total: number;
  message: string;
}

export type ProgressCallback = (p: BackupProgress) => void;

const TABLES: Array<{ key: string; table: string }> = [
  { key: 'users', table: 'users' },
  { key: 'sessions', table: 'sessions' },
  { key: 'fotos', table: 'fotos' },
  { key: 'videos', table: 'videos' },
  { key: 'cartas', table: 'cartas' },
  { key: 'bitacora', table: 'bitacora' },
  { key: 'bingo_cells', table: 'bingo_cells' },
  { key: 'bingo_meta', table: 'bingo_meta' },
  { key: 'messages', table: 'messages' },
  { key: 'notifications', table: 'notifications' },
  { key: 'invites', table: 'invites' },
];

export interface BackupManifest {
  app: 'RebeDari';
  version: 1;
  generatedAt: string;
  scope: BackupScope;
  userId: string;
  counts: Record<string, number>;
  // When scope==='db' we inline the data here. When scope==='full' we keep a sidecar dir.
  data?: Record<string, unknown[]>;
}

async function fetchAllRows(table: string, sessionId: string | null): Promise<unknown[]> {
  const PAGE = 500;
  const rows: unknown[] = [];
  let from = 0;
  const hasSessionFilter = !['users', 'invites', 'sessions'].includes(table);

  while (true) {
    let query = getClient().database.from(table).select('*').range(from, from + PAGE - 1);
    if (hasSessionFilter && sessionId) {
      query = query.eq('session_id', sessionId);
    }
    const { data, error } = await withAuthRetry(() => query);
    if (error) throw error;
    const batch = (data as unknown[]) || [];
    rows.push(...batch);
    if (batch.length < PAGE) break;
    from += PAGE;
  }
  return rows;
}

function isStorageUrl(url: unknown): url is string {
  return typeof url === 'string' && (url.startsWith('http://') || url.startsWith('https://'));
}

function fileNameFromUrl(url: string, prefix: string): string {
  try {
    const u = new URL(url);
    const last = u.pathname.split('/').filter(Boolean).pop() || 'file';
    const safe = last.replace(/[^a-zA-Z0-9._-]/g, '_');
    return `${prefix}_${safe}`;
  } catch {
    return `${prefix}_${Date.now()}`;
  }
}

async function ensureDir(uri: string): Promise<void> {
  const info = await getInfoAsync(uri);
  if (!info.exists) {
    await makeDirectoryAsync(uri, { intermediates: true });
  }
}

async function safeDelete(uri: string): Promise<void> {
  try {
    await deleteAsync(uri, { idempotent: true });
  } catch {
    /* ignore */
  }
}

function nowStamp(): string {
  const d = new Date();
  const pad = (n: number) => String(n).padStart(2, '0');
  return `${d.getFullYear()}${pad(d.getMonth() + 1)}${pad(d.getDate())}_${pad(d.getHours())}${pad(d.getMinutes())}${pad(d.getSeconds())}`;
}

function pickStorageUrl(row: Record<string, unknown>): string | null {
  const url = row.url ?? row.image_url ?? row.avatar_url;
  return isStorageUrl(url as string) ? (url as string) : null;
}

export interface BackupResult {
  /** Path to a single shareable file (the .json manifest). */
  shareFile: string;
  /** Path to the sidecar directory containing downloaded binaries (full only). */
  filesDir?: string;
  manifest: BackupManifest;
}

export async function createBackup(
  scope: BackupScope,
  onProgress?: ProgressCallback
): Promise<BackupResult> {
  const userId = useAppStore.getState().user?.id;
  const sessionId = useAppStore.getState().sessionId;
  if (!userId) throw new Error('No hay usuario autenticado');

  const baseName = `rebedari_backup_${nowStamp()}`;
  const baseDir = `${documentDirectory}${baseName}/`;
  const filesDir = `${baseDir}files/`;
  const token = getAccessToken() || '';

  await safeDelete(baseDir);
  await ensureDir(baseDir);
  if (scope === 'full') {
    await ensureDir(filesDir);
  }

  const data: Record<string, unknown[]> = {};
  const fileMap: Array<{ originalUrl: string; localPath: string; table: string }> = [];
  const counts: Record<string, number> = {};

  onProgress?.({ phase: 'fetching', current: 0, total: TABLES.length, message: 'Recolectando datos…' });
  for (let i = 0; i < TABLES.length; i++) {
    const { key, table } = TABLES[i];
    onProgress?.({
      phase: 'fetching',
      current: i,
      total: TABLES.length,
      message: `Leyendo ${table}…`,
    });
    try {
      data[key] = await fetchAllRows(table, sessionId);
      counts[table] = data[key].length;

      if (scope === 'full') {
        for (const row of data[key] as Array<Record<string, unknown>>) {
          const url = pickStorageUrl(row);
          if (url && !fileMap.find((f) => f.originalUrl === url)) {
            const fname = fileNameFromUrl(url, key);
            fileMap.push({ table: key, originalUrl: url, localPath: `${filesDir}${fname}` });
          }
        }
      }
    } catch (e) {
      console.warn(`[backup] failed to fetch ${table}:`, e);
      data[key] = [];
      counts[table] = 0;
    }
  }

  if (scope === 'full' && fileMap.length > 0) {
    onProgress?.({
      phase: 'downloading',
      current: 0,
      total: fileMap.length,
      message: 'Descargando archivos…',
    });
    for (let i = 0; i < fileMap.length; i++) {
      const f = fileMap[i];
      onProgress?.({
        phase: 'downloading',
        current: i,
        total: fileMap.length,
        message: `Descargando ${i + 1}/${fileMap.length}…`,
      });
      try {
        await downloadAsync(f.originalUrl, f.localPath, {
          headers: token ? { Authorization: `Bearer ${token}` } : undefined,
        });
      } catch (e) {
        console.warn(`[backup] failed to download ${f.originalUrl}:`, e);
      }
    }
  }

  const manifest: BackupManifest = {
    app: 'RebeDari',
    version: 1,
    generatedAt: new Date().toISOString(),
    scope,
    userId,
    counts,
    data: scope === 'db' ? data : undefined,
  };

  onProgress?.({
    phase: 'writing',
    current: 0,
    total: 1,
    message: 'Escribiendo respaldo…',
  });
  const shareFile = `${baseDir}backup.json`;
  await writeAsStringAsync(shareFile, JSON.stringify(manifest, null, 2));

  onProgress?.({
    phase: 'done',
    current: 1,
    total: 1,
    message: 'Respaldo completo',
  });

  return {
    shareFile,
    filesDir: scope === 'full' ? filesDir : undefined,
    manifest,
  };
}

export async function shareBackup(result: BackupResult): Promise<void> {
  const available = await Sharing.isAvailableAsync();
  if (!available) {
    Alert.alert(
      'Respaldo listo',
      `El respaldo se guardó en:\n${result.shareFile}\n${result.filesDir ? `Archivos en:\n${result.filesDir}` : ''}`
    );
    return;
  }
  await Sharing.shareAsync(result.shareFile, {
    dialogTitle: 'Compartir respaldo RebeDari',
    mimeType: 'application/json',
  });
  if (result.filesDir) {
    Alert.alert(
      'Respaldo completo',
      `El archivo .json con los datos está listo para compartir.\n\nLos archivos multimedia descargados están en:\n${result.filesDir}\n\nPara conservar todo, abre el sheet de compartir y guarda/copiar el .json a una ubicación segura.`
    );
  }
}

export interface RestoreReport {
  tablesImported: Record<string, number>;
  errors: string[];
}

const RESTOREABLE = TABLES.filter((t) => !['users', 'sessions', 'invites'].includes(t.table));

export async function readBackupFile(uri: string): Promise<BackupManifest> {
  const info = await getInfoAsync(uri);
  if (!info.exists) throw new Error('Archivo no encontrado');
  const raw = await readAsStringAsync(uri);
  let parsed: BackupManifest;
  try {
    parsed = JSON.parse(raw);
  } catch {
    throw new Error('Archivo de respaldo inválido');
  }
  if (!parsed || parsed.app !== 'RebeDari') {
    throw new Error('El archivo no es un respaldo de RebeDari');
  }
  return parsed;
}

export async function restoreBackup(
  manifest: BackupManifest,
  onProgress?: ProgressCallback
): Promise<RestoreReport> {
  if (!manifest.data) {
    throw new Error('Este respaldo no contiene datos embebidos. Usa un respaldo tipo "Solo datos".');
  }

  const report: RestoreReport = {
    tablesImported: {},
    errors: [],
  };

  for (let i = 0; i < RESTOREABLE.length; i++) {
    const { table } = RESTOREABLE[i];
    const rows = manifest.data[table];
    if (!Array.isArray(rows) || rows.length === 0) continue;
    onProgress?.({
      phase: 'writing',
      current: i,
      total: RESTOREABLE.length,
      message: `Restaurando ${table}…`,
    });
    try {
      const batchSize = 100;
      for (let j = 0; j < rows.length; j += batchSize) {
        const batch = rows.slice(j, j + batchSize);
        const { error } = await withAuthRetry(() =>
          getClient()
            .database
            .from(table)
            .upsert(batch as never[], { onConflict: 'id' })
        );
        if (error) throw error;
      }
      report.tablesImported[table] = rows.length;
    } catch (e: any) {
      report.errors.push(`${table}: ${e?.message || String(e)}`);
    }
  }

  onProgress?.({
    phase: 'done',
    current: 1,
    total: 1,
    message: 'Restauración completa',
  });
  return report;
}

export async function listBackupDirs(): Promise<string[]> {
  const root = documentDirectory;
  if (!root) return [];
  const rootInfo = await getInfoAsync(root);
  if (!rootInfo.exists) return [];
  try {
    const entries = await readDirectoryAsync(root);
    return entries
      .filter((name) => name.startsWith('rebedari_backup_'))
      .map((name) => `${root}${name}/`);
  } catch {
    return [];
  }
}
