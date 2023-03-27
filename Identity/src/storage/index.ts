import { type StorageProvider } from './provider';
import { LocalProvider } from './local';
import { isUndefined } from 'lodash';

let globalProvider: StorageProvider | undefined;

/**
 * Gets the storage provider for the identity server.
 * @returns the storage provider
 */
export function GetProvider(): StorageProvider {
  if (isUndefined(globalProvider)) {
    globalProvider = new LocalProvider();
    return globalProvider;
  } else {
    return globalProvider;
  }
}

/**
 * Sets the stroage provider to the given value.
 * @param provider storage provider
 */
export function SetProvider(provider: StorageProvider): void {
  globalProvider = provider;
}

export { type KeyData, type StorageProvider, KeyResponseCode } from './provider';
