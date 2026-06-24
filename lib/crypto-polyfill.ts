import * as ExpoCrypto from 'expo-crypto';

// Polyfill sessionStorage for React Native (used by InsForge SDK for PKCE verifier)
if (typeof sessionStorage === 'undefined') {
  const store: Record<string, string> = {};
  (globalThis as any).sessionStorage = {
    getItem: (key: string) => store[key] ?? null,
    setItem: (key: string, value: string) => { store[key] = String(value); },
    removeItem: (key: string) => { delete store[key]; },
    clear: () => { Object.keys(store).forEach(k => delete store[k]); },
    get length() { return Object.keys(store).length; },
    key: (i: number) => Object.keys(store)[i] ?? null,
  };
}

if (
  typeof globalThis.crypto === 'undefined' ||
  typeof globalThis.crypto.getRandomValues !== 'function' ||
  !globalThis.crypto.subtle
) {
  const subtle = {
    async digest(
      algorithm: AlgorithmIdentifier,
      data: BufferSource
    ): Promise<ArrayBuffer> {
      const algo =
        typeof algorithm === 'string' ? algorithm : algorithm.name;
      const algoMap: Record<string, ExpoCrypto.CryptoDigestAlgorithm> = {
        'SHA-256': ExpoCrypto.CryptoDigestAlgorithm.SHA256,
        'SHA-384': ExpoCrypto.CryptoDigestAlgorithm.SHA384,
        'SHA-512': ExpoCrypto.CryptoDigestAlgorithm.SHA512,
      };
      const digestAlgo = algoMap[algo] || ExpoCrypto.CryptoDigestAlgorithm.SHA256;

      let bytes: Uint8Array;
      if (data instanceof ArrayBuffer) {
        bytes = new Uint8Array(data);
      } else if (ArrayBuffer.isView(data)) {
        bytes = new Uint8Array(data.buffer as ArrayBuffer, data.byteOffset, data.byteLength);
      } else {
        bytes = new Uint8Array(data as unknown as ArrayBuffer);
      }

      const result = await ExpoCrypto.digest(digestAlgo, new Uint8Array(bytes));
      return result;
    },
  };

  Object.defineProperty(globalThis, 'crypto', {
    value: {
      getRandomValues: ExpoCrypto.getRandomValues,
      subtle,
    },
    writable: true,
    configurable: true,
  });
}
