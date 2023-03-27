import { describe, beforeAll, test, expect, beforeEach } from '@jest/globals';
import nock from 'nock';
import supertest from 'supertest';
// @ts-expect-error Some weird google cloud functions import type error.
import { getTestServer } from '@google-cloud/functions-framework/testing';
import { type StorageProvider, SetProvider } from '../src/storage';
import { LocalProvider } from '../src/storage/local';
import { has } from 'lodash';

describe('GetAccount Function', () => {
  beforeAll(async () => {
    // load the module that defines HelloTests
    await import('../src/index');
  });

  test('POST Http', async () => {
    // call getTestServer with the name of function you wish to test
    const server = getTestServer('GetAccount');

    // invoke HelloTests with SuperTest
    await supertest(server)
      .post('/')
      .set('Content-Type', 'application/json')
      .expect({ errcode: 'M_NOT_FOUND', error: 'Path: / method: POST not found.' })
      .expect(404);
  });

  test('Missing auth token', async () => {
    // call getTestServer with the name of function you wish to test
    const server = getTestServer('GetAccount');

    // invoke HelloTests with SuperTest
    await supertest(server)
      .get('/')
      .set('Content-Type', 'application/json')
      .expect({
        errcode: 'M_UNAUTHORIZED',
        error: 'credentials are required but missing or invalid.',
      })
      .expect(401);
  });
});

describe('RegisterAccount Function', () => {
  let mockStorageProvider: StorageProvider;

  beforeAll(async () => {
    // load the module that defines HelloTests
    await import('../src/index');
  });

  beforeEach(async () => {
    mockStorageProvider = new LocalProvider();
    SetProvider(mockStorageProvider);
  });

  test('GET Http', async () => {
    // call getTestServer with the name of function you wish to test
    const server = getTestServer('RegisterAccount');

    // invoke HelloTests with SuperTest
    await supertest(server)
      .get('/')
      .set('Content-Type', 'application/json')
      .expect({ errcode: 'M_NOT_FOUND', error: 'Path: / method: GET not found.' })
      .expect(404);
  });

  test('Missing input data', async () => {
    // call getTestServer with the name of function you wish to test
    const server = getTestServer('RegisterAccount');

    // invoke HelloTests with SuperTest
    await supertest(server).post('/').set('Content-Type', 'application/json').expect(403);
  });

  test('Failed to verify auth token', async () => {
    // call getTestServer with the name of function you wish to test
    const server = getTestServer('RegisterAccount');

    const scope = nock('http://server.com')
      .get('/_matrix/federation/v1/openid/userinfo?access_token=token')
      .reply(400);

    // invoke HelloTests with SuperTest
    await supertest(server)
      .post('/')
      .set('Content-Type', 'application/json')
      .send({
        access_token: 'token',
        expires_in: 100,
        matrix_server_name: 'server.com',
        token_type: 'Bearer',
      })
      .expect({
        errcode: 'M_UNAUTHORIZED',
        error: 'Failed to verify the access token.',
      })
      .expect(403);

    expect(scope.isDone()).toBe(true);
  });

  test('Successful Registration', async () => {
    const localProvider = new LocalProvider();
    SetProvider(localProvider);

    // call getTestServer with the name of function you wish to test
    const server = getTestServer('RegisterAccount');

    const scope = nock('http://server.com')
      .get('/_matrix/federation/v1/openid/userinfo?access_token=token')
      .reply(200, { sub: '@user:server.com' });

    // invoke HelloTests with SuperTest
    const result = await supertest(server)
      .post('/')
      .set('Content-Type', 'application/json')
      .send({
        access_token: 'token',
        expires_in: 100,
        matrix_server_name: 'server.com',
        token_type: 'Bearer',
      })
      .expect(200);

    expect(has(result.body, 'token')).toBeTruthy();
    expect(scope.isDone()).toBe(true);

    for (const key of localProvider.idToKeyData) {
      key[1].expired = true;
    }

    const scopeSecondAttempt = nock('http://server.com')
      .get('/_matrix/federation/v1/openid/userinfo?access_token=token')
      .reply(200, { sub: '@user:server.com' });

    // invoke HelloTests with SuperTest
    const resultSecond = await supertest(server)
      .post('/')
      .set('Content-Type', 'application/json')
      .send({
        access_token: 'token',
        expires_in: 100,
        matrix_server_name: 'server.com',
        token_type: 'Bearer',
      })
      .expect(200);

    expect(has(resultSecond.body, 'token')).toBeTruthy();
    expect(scopeSecondAttempt.isDone()).toBe(true);
  });
});

describe('Full e2e', () => {
  beforeAll(async () => {
    // load the module that defines HelloTests
    await import('../src/index');
  });

  test('register, get account, loggout, then attempt get account', async () => {
    const localProvider = new LocalProvider();
    SetProvider(localProvider);

    // call getTestServer with the name of function you wish to test
    const registerServer = getTestServer('RegisterAccount');

    const scope = nock('http://server.com')
      .get('/_matrix/federation/v1/openid/userinfo?access_token=token')
      .reply(200, { sub: '@user:server.com' });

    // invoke HelloTests with SuperTest
    const result = await supertest(registerServer)
      .post('/')
      .set('Content-Type', 'application/json')
      .send({
        access_token: 'token',
        expires_in: 100,
        matrix_server_name: 'server.com',
        token_type: 'Bearer',
      })
      .expect(200);

    expect(has(result.body, 'token')).toBeTruthy();
    expect(scope.isDone()).toBe(true);

    expect(localProvider.tokenToUserData.size).toBe(1);

    const getAccountServer = getTestServer('GetAccount');
    // invoke the get account.
    const getAccountResult = await supertest(getAccountServer)
      .get('/')
      .set('Content-Type', 'application/json')
      // eslint-disable-next-line @typescript-eslint/restrict-template-expressions
      .set('Authorization', `Bearer ${result.body.token}`)
      .expect({
        user_id: '@user:server.com',
      })
      .expect(200);

    expect(has(getAccountResult.body, 'user_id')).toBeTruthy();
    expect(getAccountResult.body.user_id).toBe('@user:server.com');

    const logoutAccountServer = getTestServer('LogoutAccount');
    await supertest(logoutAccountServer)
      .post('/')
      .set('Content-Type', 'application/json')
      // eslint-disable-next-line @typescript-eslint/restrict-template-expressions
      .set('Authorization', `Bearer ${result.body.token}`)
      .expect({})
      .expect(200);

    const getAccountResultSecond = await supertest(getAccountServer)
      .get('/')
      .set('Content-Type', 'application/json')
      // eslint-disable-next-line @typescript-eslint/restrict-template-expressions
      .set('Authorization', `Bearer ${result.body.token}`)
      .expect({ errcode: 'M_UNAUTHORIZED', error: 'Token invalid.' })
      .expect(403);

    expect(has(getAccountResultSecond.body, 'user_id')).toBeTruthy();
    expect(getAccountResultSecond.body.user_id).toBe('@user:server.com');
  });
});
