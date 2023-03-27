/**
 * The open id credentials from the matrix federation api.
 */
export interface OpenIdCredentials {
  /**
   * An access token the consumer may use to verify the identity of the person who generated the
   * token. This is given to the federation API GET /openid/userinfo to verify the user’s identity.
   */
  accessToken: string;
  /**
   * The number of seconds before this token expires and a new one must be generated.
   */
  expiresIn: number;
  /**
   * The homeserver domain the consumer should use when attempting to verify the user’s identity.
   */
  matrixServerName: string;
  tokenType: 'Bearer';
}

/**
 * Data used to save a registration.
 */
export interface RegisterData {
  openIdCred: OpenIdCredentials;
  /**
   * Matrix user id, example: "@alice:example.org".
   */
  userId: string;
  /**
   * Token used to verify the registered access point.
   */
  token: string;
}

export enum ResponseCodes {
  /**
   * Token successfully logged out.
   */
  SUCCESS = 0,
  /**
   * Token not registered or otherwise unknown to the server.
   */
  UNKNOWN_TOKEN,
  /**
   * Signifies the user needs to agree to more terms.
   */
  USER_TERMS_NOT_SIGNED,
  /**
   * Signifies the user token is alredy signed out.
   */
  TOKEN_ALREADY_SIGNED_OUT,
  /**
   * Signifies the token is expired.
   */
  TOKEN_EXPIRED,
}

export interface SuccessfulGetUser {
  response: ResponseCodes.SUCCESS;
  userId: string;
}

export interface FailedGetUser {
  response: Exclude<ResponseCodes, ResponseCodes.SUCCESS>;
}

export type GetUserResponse = SuccessfulGetUser | FailedGetUser;

export interface KeyData {
  id: string;
  privateKey: string;
  publicKey: string;
}

export enum KeyResponseCode {
  SUCCESS = 1,
  KEY_NOT_FOUND,
  KEY_INVALID,
}

export interface SuccessfulGetKey {
  code: KeyResponseCode;
  key: KeyData;
}

export interface FailedGetKey {
  code: Exclude<KeyResponseCode, KeyResponseCode.SUCCESS>;
}

export type GetKeyResponse = SuccessfulGetKey | FailedGetKey;

export interface StorageProvider {
  //
  // Account Management
  //

  /**
   * Gets the User from an identity server token.
   * @param token identity server access token
   * @returns user id registered to token if any
   */
  getUser: (token: string) => Promise<GetUserResponse>;
  /**
   * Attempts to log out the given access token.
   * @param token identity server access token
   * @returns response from attempting to log out token`
   */
  logoutUser: (token: string) => Promise<ResponseCodes>;
  /**
   * Attempts to save the validated registration data.
   * @param data the registration token data.
   * @returns if the save request passed.
   */
  saveRegistration: (data: RegisterData) => Promise<boolean>;

  //
  // Key management
  //

  /**
   * Attempts to save the public/private key pair.
   * @param key the public/private key pair
   * @returns if the save request passed.
   */
  saveKey: (key: KeyData) => Promise<boolean>;
  /**
   * Gets the key by the ID.
   * @param id The ID of the key. This should take the form algorithm:identifier where
   * algorithm identifies the signing algorithm, and the identifier is an opaque string.
   * @returns key information if any found.
   */
  getKey: (id: string) => Promise<GetKeyResponse>;
  /**
   * Gets the key by the public ID.
   * @param publicKey The unpadded base64-encoded public key
   * @returns key information if any found.
   */
  getKeyByPublicKey: (publicKey: string) => Promise<GetKeyResponse>;
  /**
   * Gets the key of type algorithm with the highest identifier that isn't expired.
   * @param algorithm the algorithm found in the ID
   * @returns key information if any found.
   */
  getMostRecentKey: (algorithm: string) => Promise<GetKeyResponse>;
  /**
   * Gets the last created id number for a given algorithm.
   * @param algorithm the algorithm found in the ID
   * @returns last number for algorithm or null if none found..
   */
  getLastUsedIdNumber: (algorithm: string) => Promise<number | null>;
}
