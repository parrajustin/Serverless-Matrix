import { type Request, type Response } from '@google-cloud/functions-framework/build/src/functions';
import { get } from 'lodash';
import { ErrorCode, FillOutErrorResponse } from './error';

type MethodHandler = (req: Request, res: Response) => void;

interface MethodHandlers {
  GET?: MethodHandler;
  POST?: MethodHandler;
}

const defaultHandler: MethodHandler = (req: Request, res: Response) => {
  FillOutErrorResponse(res, {
    httpCode: 404,
    errorCode: ErrorCode.M_NOT_FOUND,
    errorMsg: `Path: ${req.path} method: ${req.method} not found.`,
  });
};

/**
 * Handles methods from the http request, all non specified requests will return 404.
 * @param req the gcp functions framework request
 * @param res the gcp functions framework response
 * @param methodHandlers the method handlers
 */
export function HandleMethod(req: Request, res: Response, methodHandlers: MethodHandlers): void {
  switch (req.method) {
    case 'GET':
      get(methodHandlers, 'GET', defaultHandler)(req, res);
      break;
    case 'POST':
      get(methodHandlers, 'POST', defaultHandler)(req, res);
      break;
    default:
      defaultHandler(req, res);
      break;
  }
}
