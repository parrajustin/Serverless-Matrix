/* eslint-disable @typescript-eslint/no-extraneous-class */
import { mapValues } from 'lodash';

/**
 * Helper class for parsing an configurable option from provided CLI flags
 * or environment variables.
 */
class ConfigurableOption<T> {
  constructor(
    /**
     * The name of the environment variable used to configure this option.
     */
    private readonly envVar: string,
    /**
     * The default value used when this option is not configured via a CLI flag
     * or environment variable.
     */
    private readonly defaultValue: T,
    /**
     * A function used to valid the user provided value.
     */
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    private readonly validator: (x: string | T) => T = (x) => x as T,
  ) {}

  parse(envVars: NodeJS.ProcessEnv): T {
    return this.validator(envVars[this.envVar] ?? this.defaultValue);
  }
}

const EnvironmentVars = {
  // The user policy version.
  USER_CONSENT_VERSION: new ConfigurableOption<string>('USER_CONSENT_VERSION', 'UNKNOWN'),
  // User policy base url usually matrix homedomain.
  USER_CONSENT_BASEURL: new ConfigurableOption<string>('USER_CONSENT_BASEURL', 'parrajust.in'),
  // Private/public key pair algorithm,
  // https://nodejs.org/api/crypto.html#cryptogeneratekeypairtype-options-callback.
  KEY_DEFAULT_ALGORITHM: new ConfigurableOption<string>('KEY_DEFAULT_ALGORITHM', 'ed25519'),
  // Private key passphrase
  KEY_PASSPHRASE: new ConfigurableOption<string>('KEY_PASSPHRASE', 'default'),
};
type EnvironmentVarsMap = typeof EnvironmentVars;

type Store = Record<any, ConfigurableOption<any>>;
type ValueOf<T extends keyof EnvironmentVarsMap> = EnvironmentVarsMap[T];

type extractGeneric<Type> = Type extends ConfigurableOption<infer X> ? X : never;

type GetStoreData<T extends Store> = {
  [K in keyof T]: extractGeneric<T[K]>;
};

export class Env {
  private static environmentVars: GetStoreData<EnvironmentVarsMap>;

  public static getVariable<K extends keyof EnvironmentVarsMap>(
    key: K,
  ): extractGeneric<ValueOf<K>> {
    this.CheckEnvVars();
    return this.environmentVars[key];
  }

  private static CheckEnvVars(): void {
    if (Env.environmentVars === undefined) {
      this.environmentVars = mapValues(EnvironmentVars, (option) => {
        return option.parse(process.env);
      });
    }
  }
}
