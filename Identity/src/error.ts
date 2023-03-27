import { type Response } from '@google-cloud/functions-framework';

/**
 * Supported error codes.
 */
export enum ErrorCode {
  // The resource requested could not be located.
  M_NOT_FOUND = 'M_NOT_FOUND',
  // The request was missing one or more parameters.
  M_MISSING_PARAMS = 'M_MISSING_PARAMS',
  // The request contained one or more invalid parameters.
  M_INVALID_PARAM = 'M_INVALID_PARAM',
  // The session has not been validated.
  M_SESSION_NOT_VALIDATED = 'M_SESSION_NOT_VALIDATED',
  // A session could not be located for the given parameters.
  M_NO_VALID_SESSION = 'M_NO_VALID_SESSION',
  // The session has expired and must be renewed.
  M_SESSION_EXPIRED = 'M_SESSION_EXPIRED',
  // The email address provided was not valid.
  M_INVALID_EMAIL = 'M_INVALID_EMAIL',
  // There was an error sending an email. Typically seen when attempting to verify ownership of a
  // given email address.
  M_EMAIL_SEND_ERROR = 'M_EMAIL_SEND_ERROR',
  // The provided third party address was not valid.
  M_INVALID_ADDRESS = 'M_INVALID_ADDRESS',
  // There was an error sending a notification. Typically seen when attempting to verify ownership
  // of a given third party address.
  M_SEND_ERROR = 'M_SEND_ERROR',
  // The request contained an unrecognised value, such as an unknown token or medium.
  M_UNRECOGNIZED = 'M_UNRECOGNIZED',
  // The third party identifier is already in use by another user. Typically this error will have
  // an additional mxid property to indicate who owns the third party identifier.
  M_THREEPID_IN_USE = 'M_THREEPID_IN_USE',
  // An unknown error has occurred.
  M_UNKNOWN = 'M_UNKNOWN',
  // crentials are required but missing or invalid. Accompanied by http code 401.
  M_UNAUTHORIZED = 'M_UNAUTHORIZED',
  // Indicate that the user must accept new terms of service before being able to continue.
  // Accompanied by http code 403.
  M_TERMS_NOT_SIGNED = 'M_TERMS_NOT_SIGNED ',
  // Token is unknown.
  M_UNKNOWN_TOKEN = 'M_UNKNOWN_TOKEN',
}

export interface ErrorResponseOptions {
  /**
   * The http error code to set the status, defaults to 400.
   */
  httpCode: number;
  /**
   * The error code to return in the json, defaults to M_UNKNOWN.
   */
  errorCode: ErrorCode;
  /**
   * The error message to return in the json, defaults to ''.
   */
  errorMsg: string;
}

/**
 * Fill out the error responses data.
 * @param res the functions framework response
 * @param options options to set in the error response.
 */
export function FillOutErrorResponse(
  res: Response,
  options: ErrorResponseOptions = {
    httpCode: 400,
    errorCode: ErrorCode.M_UNKNOWN,
    errorMsg: '',
  },
): void {
  res.status(options.httpCode).json({
    errcode: options.errorCode,
    error: options.errorMsg,
  });
}
