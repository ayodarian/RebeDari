import { getClient, getAccessToken, isUnauthorizedError, withAuthRetry } from './insforge';
import { readAsStringAsync, getInfoAsync } from 'expo-file-system/legacy';

const STORAGE_BUCKET = 'media';
const MAX_FILE_SIZE_BYTES = 50 * 1024 * 1024;

const MIME_BY_EXT: Record<string, string> = {
  mp4: 'video/mp4',
  mov: 'video/mp4',
  webm: 'video/webm',
  jpg: 'image/jpeg',
  jpeg: 'image/jpeg',
  png: 'image/png',
  gif: 'image/gif',
  webp: 'image/webp',
  pdf: 'application/pdf',
  m4a: 'audio/mp4',
  aac: 'audio/aac',
  mp3: 'audio/mpeg',
};

function getMimeType(path: string): string {
  const ext = path.split('.').pop()?.toLowerCase() || '';
  return MIME_BY_EXT[ext] || 'application/octet-stream';
}

function assertSafePath(path: string): void {
  if (!path) throw new Error('Upload path is required');
  if (path.includes('..')) throw new Error('Invalid upload path');
  if (path.startsWith('/')) throw new Error('Upload path must be relative');
}

async function readAsBase64(uri: string): Promise<string> {
  return readAsStringAsync(uri, { encoding: 'base64' });
}

const B64_CHARS = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789+/';
const B64_LOOKUP = (() => {
  const table = new Uint8Array(256);
  for (let i = 0; i < B64_CHARS.length; i++) table[B64_CHARS.charCodeAt(i)] = i;
  return table;
})();

function base64ToBytes(base64: string): Uint8Array {
  const cleaned = base64.replace(/[\r\n\t ]/g, '');
  const len = cleaned.length;
  let bufferLength = Math.floor((len * 3) / 4);
  if (cleaned[len - 1] === '=') bufferLength--;
  if (cleaned[len - 2] === '=') bufferLength--;

  const bytes = new Uint8Array(bufferLength);
  let p = 0;
  for (let i = 0; i < len; i += 4) {
    const e1 = B64_LOOKUP[cleaned.charCodeAt(i)];
    const e2 = B64_LOOKUP[cleaned.charCodeAt(i + 1)];
    const c3 = cleaned.charCodeAt(i + 2);
    const c4 = cleaned.charCodeAt(i + 3);
    const e3 = c3 === 61 ? 0 : B64_LOOKUP[c3];
    const e4 = c4 === 61 ? 0 : B64_LOOKUP[c4];
    bytes[p++] = (e1 << 2) | (e2 >> 4);
    if (c3 !== 61) bytes[p++] = ((e2 & 15) << 4) | (e3 >> 2);
    if (c4 !== 61) bytes[p++] = ((e3 & 3) << 6) | e4;
  }
  return bytes;
}

function encodeUTF8(text: string): Uint8Array {
  const out: number[] = [];
  for (let i = 0; i < text.length; i++) {
    let c = text.charCodeAt(i);
    if (c < 0x80) {
      out.push(c);
    } else if (c < 0x800) {
      out.push(0xc0 | (c >> 6), 0x80 | (c & 0x3f));
    } else if (c < 0xd800 || c >= 0xe000) {
      out.push(0xe0 | (c >> 12), 0x80 | ((c >> 6) & 0x3f), 0x80 | (c & 0x3f));
    } else {
      i++;
      const c2 = text.charCodeAt(i);
      const cp = 0x10000 + (((c & 0x3ff) << 10) | (c2 & 0x3ff));
      out.push(
        0xf0 | (cp >> 18),
        0x80 | ((cp >> 12) & 0x3f),
        0x80 | ((cp >> 6) & 0x3f),
        0x80 | (cp & 0x3f)
      );
    }
  }
  return new Uint8Array(out);
}

function buildMultipartBody(
  fields: Record<string, string>,
  fileBytes: Uint8Array,
  fileName: string,
  fileMimeType: string
): { body: Uint8Array; boundary: string } {
  const boundary =
    '----ExpoUploadBoundary' + Math.random().toString(36).slice(2, 12);

  const chunks: Uint8Array[] = [];

  for (const [key, value] of Object.entries(fields)) {
    chunks.push(
      encodeUTF8(
        `--${boundary}\r\n` +
          `Content-Disposition: form-data; name="${key}"\r\n` +
          `\r\n` +
          `${value}\r\n`
      )
    );
  }

  chunks.push(
    encodeUTF8(
      `--${boundary}\r\n` +
        `Content-Disposition: form-data; name="file"; filename="${fileName}"\r\n` +
        `Content-Type: ${fileMimeType}\r\n` +
        `\r\n`
    ),
    fileBytes,
    encodeUTF8('\r\n')
  );

  chunks.push(encodeUTF8(`--${boundary}--\r\n`));

  let totalLength = 0;
  for (const chunk of chunks) totalLength += chunk.length;

  const body = new Uint8Array(totalLength);
  let offset = 0;
  for (const chunk of chunks) {
    body.set(chunk, offset);
    offset += chunk.length;
  }

  return { body, boundary };
}

export async function uploadFile(uri: string, path: string): Promise<string> {
  assertSafePath(path);

  const accessToken = getAccessToken();
  if (!accessToken) {
    throw new Error('No access token available. Please login first.');
  }

  const contentType = getMimeType(path);
  const fileInfo = await getInfoAsync(uri);
  const fileSize =
    fileInfo.exists && 'size' in fileInfo && typeof fileInfo.size === 'number'
      ? fileInfo.size
      : 0;

  if (fileSize > MAX_FILE_SIZE_BYTES) {
    throw new Error(
      `El archivo excede el límite de ${MAX_FILE_SIZE_BYTES / 1024 / 1024} MB`
    );
  }

  const baseUrl = process.env.EXPO_PUBLIC_INSFORGE_URL || '';

  const strategy = await withAuthRetry(async () => {
    const res = await fetch(`${baseUrl}/api/storage/buckets/${STORAGE_BUCKET}/upload-strategy`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${accessToken}`,
        'x-insforge-anon-key': process.env.EXPO_PUBLIC_INSFORGE_ANON_KEY || '',
      },
      body: JSON.stringify({
        filename: path,
        contentType,
        size: fileSize,
      }),
    });
    if (!res.ok) {
      throw new Error(`Failed to get upload strategy: ${res.status}`);
    }
    return res.json();
  });

  const objectUrl = `${baseUrl}/api/storage/buckets/${STORAGE_BUCKET}/objects/${encodeURIComponent(path)}`;

  if (strategy.method === 'presigned' && strategy.uploadUrl) {
    const base64 = await readAsStringAsync(uri, { encoding: 'base64' });
    const fileBytes = base64ToBytes(base64);
    const fileName = path.split('/').pop() || 'file';
    const fields: Record<string, string> = {};
    if (strategy.fields) {
      for (const [key, value] of Object.entries(strategy.fields)) {
        fields[key] = String(value);
      }
    }
    const { body, boundary } = buildMultipartBody(fields, fileBytes, fileName, contentType);

    const uploadRes = await fetch(strategy.uploadUrl, {
      method: 'POST',
      headers: {
        'Content-Type': `multipart/form-data; boundary=${boundary}`,
      },
      body: body.buffer as ArrayBuffer,
    });
    if (!uploadRes.ok) {
      const errText = await uploadRes.text().catch(() => '');
      throw new Error(
        `Presigned upload failed: ${uploadRes.status}${errText ? ` - ${errText}` : ''}`
      );
    }

    if (strategy.confirmRequired && strategy.confirmUrl) {
      const confirmRes = await fetch(`${baseUrl}${strategy.confirmUrl}`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${accessToken}`,
        },
        body: JSON.stringify({ size: fileSize, contentType }),
      });
      if (!confirmRes.ok && !isUnauthorizedError({ status: confirmRes.status })) {
        throw new Error(`Confirm failed: ${confirmRes.status}`);
      }
    }
    return objectUrl;
  }

  if (strategy.method === 'direct') {
    const base64 = await readAsStringAsync(uri, { encoding: 'base64' });
    const fileBytes = base64ToBytes(base64);
    const fileName = path.split('/').pop() || 'file';
    const { body, boundary } = buildMultipartBody(
      {},
      fileBytes,
      fileName,
      contentType
    );

    const uploadRes = await fetch(objectUrl, {
      method: 'PUT',
      headers: {
        'Content-Type': `multipart/form-data; boundary=${boundary}`,
        Authorization: `Bearer ${accessToken}`,
      },
      body: body.buffer as ArrayBuffer,
    });
    if (!uploadRes.ok) {
      const errText = await uploadRes.text().catch(() => '');
      throw new Error(
        `Direct upload failed: ${uploadRes.status}${errText ? ` - ${errText}` : ''}`
      );
    }
    return objectUrl;
  }

  throw new Error(`Unsupported upload method: ${strategy.method}`);
}

export async function deleteFile(path: string): Promise<void> {
  assertSafePath(path);
  const { error } = await withAuthRetry(() =>
    getClient().storage.from(STORAGE_BUCKET).remove(path)
  );
  if (error) throw new Error(error.message || 'Error eliminando archivo');
}
