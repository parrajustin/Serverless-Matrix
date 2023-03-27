import { describe, beforeAll, test } from '@jest/globals';
import supertest from 'supertest';
// @ts-expect-error Some weird google cloud functions import type error.
import { getTestServer } from '@google-cloud/functions-framework/testing';

describe('Versions GCP function', () => {
  beforeAll(async () => {
    // load the module that defines HelloTests
    await import('../src/index');
  });

  test('Post HTTP Method', async () => {
    // call getTestServer with the name of function you wish to test
    const server = getTestServer('Versions');

    // invoke HelloTests with SuperTest
    await supertest(server)
      .post('/')
      .set('Content-Type', 'application/json')
      .expect({ errcode: 'M_NOT_FOUND', error: 'Path: / method: POST not found.' })
      .expect(404);
  });

  test('Get HTTP Method', async () => {
    // call getTestServer with the name of function you wish to test
    const server = getTestServer('Versions');

    // invoke HelloTests with SuperTest
    await supertest(server)
      .get('/')
      .set('Content-Type', 'application/json')
      .expect({ versions: ['v1.6'] })
      .expect(200);
  });
});
