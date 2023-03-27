import { Env } from './env';

export function GetPolicy(): unknown {
  return {
    policies: {
      privacy_policy: {
        version: Env.getVariable('USER_CONSENT_VERSION'),
        en: {
          name: 'Privacy Policy',
          url: `${Env.getVariable('USER_CONSENT_BASEURL')}/_matrix/consent?v=${Env.getVariable(
            'USER_CONSENT_VERSION',
          )}`,
        },
      },
    },
  };
}
