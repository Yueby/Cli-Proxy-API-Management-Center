import { evaluateApiKeyStrength } from './apiKeyStrength';

const API_KEY_PREFIX = 'sk-';
const API_KEY_RANDOM_LENGTH = 48;
const API_KEY_CHARSET = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789';
const MAX_UNBIASED_BYTE = Math.floor(256 / API_KEY_CHARSET.length) * API_KEY_CHARSET.length;

const MAX_API_KEY_GENERATION_ATTEMPTS = 32;

/** Generates a cryptographically secure, uniformly distributed API key. */
export function generateSecureApiKey(
  maxAttempts: number = MAX_API_KEY_GENERATION_ATTEMPTS
): string {
  const attemptsLimit = Math.max(1, maxAttempts);

  for (let attempt = 1; attempt <= attemptsLimit; attempt += 1) {
    const characters: string[] = [];

    while (characters.length < API_KEY_RANDOM_LENGTH) {
      const remaining = API_KEY_RANDOM_LENGTH - characters.length;
      const randomBytes = new Uint8Array(Math.ceil(remaining * 1.1));
      globalThis.crypto.getRandomValues(randomBytes);

      for (const byte of randomBytes) {
        if (byte >= MAX_UNBIASED_BYTE) continue;

        characters.push(API_KEY_CHARSET[byte % API_KEY_CHARSET.length]);
        if (characters.length === API_KEY_RANDOM_LENGTH) break;
      }
    }

    const randomBody = characters.join('');
    if (evaluateApiKeyStrength(randomBody).tier === 'strong') {
      return `${API_KEY_PREFIX}${randomBody}`;
    }
  }

  throw new Error(
    `Failed to generate a sufficiently strong API key after ${attemptsLimit} attempts. Please check the randomness source.`
  );
}
