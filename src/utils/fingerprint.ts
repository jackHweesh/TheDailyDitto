import FingerprintJS from '@fingerprintjs/fingerprintjs';

let cachedFingerprint: string | null = null;

export const getBrowserFingerprint = async (): Promise<string> => {
  if (cachedFingerprint) {
    return cachedFingerprint;
  }

  try {
    const fp = await FingerprintJS.load();
    const result = await fp.get();
    cachedFingerprint = result.visitorId;
    return cachedFingerprint;
  } catch (error) {
    console.error('Error generating fingerprint:', error);
    // Fallback to a random string if fingerprinting fails
    const fallback = Math.random().toString(36).substring(2);
    cachedFingerprint = fallback;
    return fallback;
  }
}; 