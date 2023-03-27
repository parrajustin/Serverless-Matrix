import type { Response } from '@google-cloud/functions-framework';

/**
 * Fill out the cors header response for the identity service.
 * @param res
 */
export function FillCors(res: Response): void {
  res.set('Access-Control-Allow-Origin', '*');
  res.set('Access-Control-Allow-Methods', 'GET, POST, PUT, DELETE, OPTIONS');
  res.set(
    'Access-Control-Allow-Headers',
    'Origin, X-Requested-With, Content-Type, Accept, Authorization',
  );
}
