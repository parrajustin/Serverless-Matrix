import {
  ResponseCodes,
  type RegisterData,
  type StorageProvider,
  type OpenIdCredentials,
  type GetUserResponse,
  type GetKeyResponse,
  type KeyData,
  KeyResponseCode,
} from './provider';
import { isUndefined } from 'lodash';
import add from 'date-fns/add';

export interface UserDataSchema {
  expires: number;
  loggedOut: boolean;
  openIdCredentials: OpenIdCredentials;
  userId: string;
  token: string;
}

export interface KeyDataSchema {
  expired: boolean;
  expires: number;
  id: string;
  publicKey: string;
  privateKey: string;
}

export class LocalProvider implements StorageProvider {
  public readonly tokenToUserData = new Map<string, UserDataSchema>();
  public readonly idToKeyData = new Map<string, KeyDataSchema>();

  public async getUser(token: string): Promise<GetUserResponse> {
    const userData = this.tokenToUserData.get(token);
    if (isUndefined(userData)) {
      return {
        response: ResponseCodes.UNKNOWN_TOKEN,
      };
    }

    const current = new Date().getTime();
    if (current >= userData.expires) {
      return {
        response: ResponseCodes.TOKEN_EXPIRED,
      };
    }

    if (userData.loggedOut) {
      return {
        response: ResponseCodes.TOKEN_ALREADY_SIGNED_OUT,
      };
    }

    return {
      response: ResponseCodes.SUCCESS,
      userId: userData.userId,
    };
  }

  public async logoutUser(token: string): Promise<ResponseCodes> {
    const userData = this.tokenToUserData.get(token);
    if (isUndefined(userData)) {
      return ResponseCodes.UNKNOWN_TOKEN;
    }

    const current = new Date().getTime();
    if (current >= userData.expires) {
      return ResponseCodes.TOKEN_EXPIRED;
    }

    if (userData.loggedOut) {
      return ResponseCodes.TOKEN_ALREADY_SIGNED_OUT;
    }

    userData.loggedOut = true;

    return ResponseCodes.SUCCESS;
  }

  public async saveRegistration(data: RegisterData): Promise<boolean> {
    const current = new Date();
    const result = add(current, {
      days: 1,
    });

    const constructedUser: UserDataSchema = {
      expires: result.getTime(),
      token: data.token,
      userId: data.userId,
      openIdCredentials: data.openIdCred,
      loggedOut: false,
    };
    this.tokenToUserData.set(data.token, constructedUser);

    return true;
  }

  public async saveKey(key: KeyData): Promise<boolean> {
    const current = new Date();
    const result = add(current, {
      months: 6,
    });

    const dataSchema: KeyDataSchema = {
      expired: false,
      expires: result.getTime(),
      id: key.id,
      publicKey: key.publicKey,
      privateKey: key.privateKey,
    };
    this.idToKeyData.set(key.id, dataSchema);

    return true;
  }

  public async getKey(id: string): Promise<GetKeyResponse> {
    const keyData = this.idToKeyData.get(id);

    if (keyData === undefined) {
      return { code: KeyResponseCode.KEY_NOT_FOUND };
    }

    const current = new Date();
    if (keyData.expires <= current.getTime() && !keyData.expired) {
      return { code: KeyResponseCode.KEY_INVALID };
    }

    return {
      code: KeyResponseCode.SUCCESS,
      key: {
        id: keyData.id,
        publicKey: keyData.publicKey,
        privateKey: keyData.privateKey,
      },
    };
  }

  public async getKeyByPublicKey(publicKey: string): Promise<GetKeyResponse> {
    let keyData: KeyDataSchema | undefined;
    for (const val of this.idToKeyData.values()) {
      if (val.publicKey === publicKey) {
        keyData = val;
        break;
      }
    }

    if (keyData === undefined) {
      return { code: KeyResponseCode.KEY_NOT_FOUND };
    }

    const current = new Date();
    if (keyData.expires <= current.getTime() && !keyData.expired) {
      return { code: KeyResponseCode.KEY_INVALID };
    }

    return {
      code: KeyResponseCode.SUCCESS,
      key: {
        id: keyData.id,
        publicKey: keyData.publicKey,
        privateKey: keyData.privateKey,
      },
    };
  }

  public async getMostRecentKey(algorithm: string): Promise<GetKeyResponse> {
    const re = new RegExp(`^${algorithm}:.*`);
    const current = new Date();
    let keyData: KeyDataSchema | undefined;
    let keyNum = -1;
    for (const val of this.idToKeyData.values()) {
      const valNum = Number.parseInt(val.id.split(':')[1]);
      if (
        val.id.match(re) !== null &&
        val.expires > current.getTime() &&
        !val.expired &&
        valNum < keyNum
      ) {
        keyData = val;
        keyNum = valNum;
        break;
      }
    }

    if (keyData === undefined) {
      return { code: KeyResponseCode.KEY_NOT_FOUND };
    }

    return {
      code: KeyResponseCode.SUCCESS,
      key: {
        id: keyData.id,
        publicKey: keyData.publicKey,
        privateKey: keyData.privateKey,
      },
    };
  }

  public async getLastUsedIdNumber(algorithm: string): Promise<number | null> {
    const re = new RegExp(`^${algorithm}:.*`);
    const current = new Date();
    let keyNum = -1;
    for (const val of this.idToKeyData.values()) {
      const valNum = Number.parseInt(val.id.split(':')[1]);
      if (
        val.id.match(re) !== null &&
        val.expires > current.getTime() &&
        !val.expired &&
        valNum < keyNum
      ) {
        keyNum = valNum;
        break;
      }
    }

    if (keyNum === -1) {
      return null;
    }

    return keyNum;
  }
}
