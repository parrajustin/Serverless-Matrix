import { type KeyData, KeyResponseCode, type StorageProvider } from './storage';
import { Env } from './env';
import {
  generateKeyPair,
  type RSAKeyPairOptions,
  type RSAPSSKeyPairOptions,
  type DSAKeyPairOptions,
  type ECKeyPairOptions,
  type ED25519KeyPairOptions,
  type ED448KeyPairOptions,
  type X25519KeyPairOptions,
  type X448KeyPairOptions,
} from 'node:crypto';
import { parallel } from 'async';

type PromiseReolve<T> = (value: T | PromiseLike<T>) => void;
type PromiseReject = (reason?: any) => void;

interface ExternalPromise<T> {
  promise: Promise<T>;
  resolveFunc: PromiseReolve<T>;
  rejectFunc: PromiseReject;
}

/**
 * Construct an externally resolved promise.
 */
function ConstructExternallyResolvedPromise<T>(): ExternalPromise<T> {
  let resolveFunc: PromiseReolve<T> = () => {};
  let rejectFunc: PromiseReject = () => {};
  const promise = new Promise<T>((resolve, reject) => {
    resolveFunc = resolve;
    rejectFunc = reject;
  });
  return { promise, resolveFunc, rejectFunc };
}

interface AlgoOptions {
  rsa: RSAKeyPairOptions<'pem', 'pem'>;
  'rsa-pss': RSAPSSKeyPairOptions<'pem', 'pem'>;
  dsa: DSAKeyPairOptions<'pem', 'pem'>;
  ec: ECKeyPairOptions<'pem', 'pem'>;
  ed25519: ED25519KeyPairOptions<'pem', 'pem'>;
  ed448: ED448KeyPairOptions<'pem', 'pem'>;
  x25519: X25519KeyPairOptions<'pem', 'pem'>;
  x448: X448KeyPairOptions<'pem', 'pem'>;
}

/**
 * The global key manager.
 */
class KeyManager {
  private readonly jobs = new Map<string, ExternalPromise<KeyData | null>>();

  /**
   * Attempts to get the most recent non invalid default alorigthm key data.
   * @param storageProvider storage provider backend for key management.
   * @returns Recent, non invalid default key data
   */
  public async GetDefaultKey(storageProvider: StorageProvider): Promise<KeyData | null> {
    // Get the default key algorithm.
    const algorithm = Env.getVariable('KEY_DEFAULT_ALGORITHM');
    return await this.GetKeyForAlgorithm(storageProvider, algorithm as keyof AlgoOptions, {});
  }

  /**
   * Attempts to get the most recent non invalid alorigthm key data.
   * @param storageProvider storage provider backend for key management.
   * @returns Recent, non invalid key data
   */
  public async GetKeyForAlgorithm<T extends keyof AlgoOptions>(
    storageProvider: StorageProvider,
    algorithm: T,
    options: Omit<AlgoOptions[T], 'publicKeyEncoding' | 'privateKeyEncoding'>,
  ): Promise<KeyData | null> {
    // Check if there is already a job running.
    const jobWaiter = this.jobs.get(algorithm);
    if (jobWaiter !== undefined) {
      return await jobWaiter.promise;
    }

    // Setup job waiter.
    const externalPromise = ConstructExternallyResolvedPromise<KeyData | null>();
    this.jobs.set(algorithm, externalPromise);

    // Attempt to fetch key from storage provider.
    const providerResponse = await storageProvider.getMostRecentKey(algorithm);
    if (providerResponse.code === KeyResponseCode.SUCCESS) {
      return providerResponse.key;
    }

    // Create a key.
    const keyPassphrase = Env.getVariable('KEY_PASSPHRASE');
    options = {
      ...options,
      publicKeyEncoding: {
        type: 'spki',
        format: 'pem',
      },
      privateKeyEncoding: {
        type: 'pkcs8',
        format: 'pem',
        cipher: 'aes-256-cbc',
        passphrase: keyPassphrase,
      },
    };

    const keyPipeline = await new Promise<{
      privateKey: string;
      publicKey: string;
      lastId: number;
    } | null>((resolve) => {
      parallel(
        {
          getKeyId: (callback) => {
            storageProvider
              .getLastUsedIdNumber(algorithm)
              .then((value) => {
                if (value === null) {
                  callback(null, -1);
                } else {
                  callback(null, value);
                }
              })
              .catch((err) => {
                callback(err);
              });
          },
          constructKey: (callback) => {
            generateKeyPair(algorithm as any, options, (err, publicKey, privateKey) => {
              callback(err, { publicKey, privateKey });
            });
          },
        },
        (err, results) => {
          if (err !== undefined && err !== null) {
            resolve(null);
            return;
          }

          const typedResults = results as {
            getKeyId: number;
            constructKey: { publicKey: string; privateKey: string };
          };
          resolve({ lastId: typedResults.getKeyId, ...typedResults.constructKey });
        },
      );
    });

    if (keyPipeline === null) {
      externalPromise.resolveFunc(null);
      return null;
    }

    const newId = `${algorithm}:${keyPipeline.lastId + 1}`;

    const keyData = {
      id: newId,
      publicKey: keyPipeline.publicKey,
      privateKey: keyPipeline.privateKey,
    };

    const success = await storageProvider.saveKey(keyData);
    if (!success) {
      externalPromise.resolveFunc(null);
      return null;
    }
    externalPromise.resolveFunc(keyData);

    return keyData;
  }
}

let globalKeyManager: KeyManager | undefined;
export function GetKeyManager(): KeyManager {
  if (globalKeyManager === undefined) {
    globalKeyManager = new KeyManager();
  }

  return globalKeyManager;
}
