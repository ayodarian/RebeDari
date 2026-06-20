import { getClient } from './insforge';

/**
 * Convierte un URI de archivo local a Blob (necesario para InsForge Storage)
 */
async function uriToBlob(uri: string): Promise<Blob> {
  return new Promise((resolve, reject) => {
    const xhr = new XMLHttpRequest();
    xhr.responseType = 'blob';
    xhr.open('GET', uri, true);
    xhr.onload = () => {
      if (xhr.status === 200) {
        resolve(xhr.response as Blob);
      } else {
        reject(new Error(`Network request failed with status ${xhr.status}`));
      }
    };
    xhr.onerror = () => reject(new Error('Network request failed'));
    xhr.send();
  });
}

/**
 * Detecta el MIME type basado en la extension del path
 */
function getMimeType(path: string): string {
  const ext = path.split('.').pop()?.toLowerCase() || '';
  const mimeMap: Record<string, string> = {
    mp4: 'video/mp4',
    mov: 'video/mp4',
    webm: 'video/webm',
    jpg: 'image/jpeg',
    jpeg: 'image/jpeg',
    png: 'image/png',
    pdf: 'application/pdf',
  };
  return mimeMap[ext] || 'application/octet-stream';
}

/**
 * Sube un archivo a InsForge Storage y retorna la URL publica
 */
export async function uploadFile(uri: string, path: string): Promise<string> {
  const client = getClient();
  const blob = await uriToBlob(uri);

  const { data, error } = await client.storage
    .from('media')
    .upload(path, blob);

  if (error) throw new Error(error.message || 'Error subiendo archivo');
  if (!data) throw new Error('No se recibio respuesta del servidor');
  return data.url;
}

/**
 * Elimina un archivo de InsForge Storage
 */
export async function deleteFile(path: string): Promise<void> {
  const client = getClient();
  const { error } = await client.storage.from('media').remove(path);
  if (error) throw new Error(error.message || 'Error eliminando archivo');
}
