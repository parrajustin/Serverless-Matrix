import { type Request } from '@google-cloud/functions-framework';
import { isString } from 'lodash';

/**
 * Attempts to get the query string token if there is one.
 * @param req the functions framework request
 * @returns the header token if any, null if none
 */
function AttemptGetHeaderToken(req: Request): string | null {
  const headerToken = req.get('Authorization');
  if (headerToken === undefined) {
    return null;
  }
  const splitHeaderToken = headerToken.split(' ');
  if (splitHeaderToken[0] !== 'Bearer') {
    return null;
  }
  if (splitHeaderToken.length !== 2) {
    return null;
  }

  return Buffer.from(splitHeaderToken[1], 'base64').toString('ascii');
}

/**
 * Attempts to get the header token if there is one.
 * @param req the functions framework request
 * @returns the header token if any, null if none
 */
function AttemptGetQueryToken(req: Request): string | null {
  const queryToken = req.query.access_token;
  if (isString(queryToken)) {
    return queryToken;
  }

  return null;
}

/**
 * Attempts to get the auth token frist from header then from query string.
 * @param req the functions framework request
 * @returns the header token if any, null if none
 */
export function GetAuthToken(req: Request): string | null {
  const headerToken = AttemptGetHeaderToken(req);
  if (headerToken !== null) {
    return headerToken;
  }
  const queryToken = AttemptGetQueryToken(req);
  if (queryToken !== null) {
    return queryToken;
  }
  return null;
}
