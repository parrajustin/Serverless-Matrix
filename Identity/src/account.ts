import type { Request, Response } from '@google-cloud/functions-framework';
import { GetAuthToken } from './authToken';
import { GetProvider } from './storage/index';
import { typeGuard } from 'tsafe';
import { ErrorCode, FillOutErrorResponse } from './error';
import { ResponseCodes, type SuccessfulGetUser } from './storage/provider';
import { type Static, Type } from '@sinclair/typebox';
import { Value } from '@sinclair/typebox/value';
import { has } from 'lodash';
import { GetKeyManager } from './keyManager';
import { sign } from 'jsonwebtoken';
import { Env } from './env';
import hoursToSeconds from 'date-fns/hoursToSeconds';
import axios from 'axios';

export async function GetAccount(req: Request, res: Response): Promise<void> {
  const authToken = GetAuthToken(req);
  if (authToken === null) {
    FillOutErrorResponse(res, {
      httpCode: 401,
      errorCode: ErrorCode.M_UNAUTHORIZED,
      errorMsg: 'credentials are required but missing or invalid.',
    });
    return;
  }

  const storageProvider = GetProvider();
  const response = await storageProvider.getUser(authToken);
  if (typeGuard<SuccessfulGetUser>(response, response.response === ResponseCodes.SUCCESS)) {
    res.status(200).json({
      user_id: response.userId,
    });
    return;
  }

  switch (response.response) {
    case ResponseCodes.UNKNOWN_TOKEN:
      FillOutErrorResponse(res, {
        httpCode: 401,
        errorCode: ErrorCode.M_UNKNOWN_TOKEN,
        errorMsg: 'Token unknown.',
      });
      break;
    case ResponseCodes.TOKEN_EXPIRED:
    case ResponseCodes.TOKEN_ALREADY_SIGNED_OUT:
      FillOutErrorResponse(res, {
        httpCode: 403,
        errorCode: ErrorCode.M_UNAUTHORIZED,
        errorMsg: 'Token invalid.',
      });
      break;
  }
}

export async function LogoutAccount(req: Request, res: Response): Promise<void> {
  const authToken = GetAuthToken(req);
  if (authToken === null) {
    FillOutErrorResponse(res, {
      httpCode: 401,
      errorCode: ErrorCode.M_UNAUTHORIZED,
      errorMsg: 'credentials are required but missing or invalid.',
    });
    return;
  }

  const storageProvider = GetProvider();
  const response = await storageProvider.logoutUser(authToken);

  switch (response) {
    case ResponseCodes.SUCCESS:
      res.status(200).json({});
      break;
    case ResponseCodes.UNKNOWN_TOKEN:
      FillOutErrorResponse(res, {
        httpCode: 401,
        errorCode: ErrorCode.M_UNKNOWN_TOKEN,
        errorMsg: 'Token unknown.',
      });
      break;
    case ResponseCodes.TOKEN_EXPIRED:
    case ResponseCodes.TOKEN_ALREADY_SIGNED_OUT:
      FillOutErrorResponse(res, {
        httpCode: 403,
        errorCode: ErrorCode.M_UNAUTHORIZED,
        errorMsg: 'Token invalid.',
      });
      break;
  }
}

const RegisterAccountData = Type.Object({
  access_token: Type.String(),
  expires_in: Type.Integer({ exclusiveMinimum: 0 }),
  matrix_server_name: Type.String(),
  token_type: Type.String({ pattern: '^Bearer$' }),
});
type BodyType = Static<typeof RegisterAccountData>;

export async function RegisterAccount(req: Request, res: Response): Promise<void> {
  const body = req.body as unknown;
  if (!Value.Check(RegisterAccountData, body)) {
    const errors = Value.Errors(RegisterAccountData, body);
    const errorValues = [];
    for (const error of errors) {
      // eslint-disable-next-line @typescript-eslint/restrict-template-expressions
      errorValues.push(`${error.path} invalid because "${error.message}" but got "${error.value}"`);
    }

    FillOutErrorResponse(res, {
      httpCode: 403,
      errorCode: ErrorCode.M_INVALID_PARAM,
      errorMsg: `Errors: ${errorValues.join('\n')}`,
    });
    return;
  }
  const validatedBody: BodyType = body;

  // Fetch the user id from the federation api.
  const userId = await new Promise<string | null>((resolve) => {
    axios
      .get(
        `http://${validatedBody.matrix_server_name}/_matrix/federation/v1/openid/userinfo?access_token=${validatedBody.access_token}`,
        {
          method: 'GET',
        },
      )
      .then((resp) => {
        if (typeGuard<{ sub: string }>(resp.data, has(resp.data, 'sub'))) {
          resolve(resp.data.sub);
        } else {
          resolve(null);
        }
      })
      .catch(() => {
        resolve(null);
      });
  });

  if (userId === null) {
    FillOutErrorResponse(res, {
      httpCode: 403,
      errorCode: ErrorCode.M_UNAUTHORIZED,
      errorMsg: 'Failed to verify the access token.',
    });
    return;
  }

  // Get global class data.
  const storageProvider = GetProvider();
  const keyManager = GetKeyManager();

  // Try to get a key for the rsa algorithm.
  const keyData = await keyManager.GetKeyForAlgorithm(storageProvider, 'rsa', {
    modulusLength: 4096,
  });
  if (keyData === null) {
    FillOutErrorResponse(res, {
      httpCode: 500,
      errorCode: ErrorCode.M_UNKNOWN,
      errorMsg: 'Unknown internal error',
    });
    return;
  }

  // Attempt to create a jwt.
  const keyPassphrase = Env.getVariable('KEY_PASSPHRASE');
  const token = sign(
    { userId },
    { key: keyData.privateKey, passphrase: keyPassphrase },
    { algorithm: 'RS256', keyid: keyData.id, expiresIn: hoursToSeconds(24) },
  );
  const finalToken = Buffer.from(token).toString('base64');

  // Attempt to save the registered data to the storage provider.
  const successSaveRegistration = await storageProvider.saveRegistration({
    userId,
    token,
    openIdCred: {
      accessToken: validatedBody.access_token,
      expiresIn: validatedBody.expires_in,
      matrixServerName: validatedBody.matrix_server_name,
      tokenType: validatedBody.token_type as 'Bearer',
    },
  });
  if (!successSaveRegistration) {
    FillOutErrorResponse(res, {
      httpCode: 500,
      errorCode: ErrorCode.M_UNKNOWN,
      errorMsg: 'Unknown internal error',
    });
    return;
  }

  res.status(200).json({
    token: finalToken,
  });
}
