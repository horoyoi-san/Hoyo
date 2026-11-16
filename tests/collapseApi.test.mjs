import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import axios from 'axios';
import { mapCollapseResponse, SendDataToCollapse, ProbeCollapseConnection } from '../src/lib/api/api.ts';

describe('mapCollapseResponse', () => {
  it('treats retcode 0 as success', () => {
    const mapped = mapCollapseResponse(
      { retcode: 0, message: 'OK', data: { avatars: 1, created: 6, updated: 0, deleted: 0, errors: [] } },
      200
    );

    assert.equal(mapped.status, 200);
    assert.equal(mapped.warnings, undefined, 'no errors means no warning noise');
  });

  it('keeps a partly applied push successful but reports the skipped entries', () => {
    const mapped = mapCollapseResponse(
      {
        retcode: 0,
        message: 'Partly applied',
        data: { avatars: 2, created: 1, updated: 0, deleted: 0, errors: ['Avatars[1] (1310): avatar not owned'] },
      },
      200
    );

    assert.equal(mapped.status, 200, 'the rest was applied, so this is not a failure');
    assert.deepEqual(mapped.warnings, ['Avatars[1] (1310): avatar not owned']);
  });

  it('turns a non-zero retcode into a failure even on HTTP 200', () => {
    const mapped = mapCollapseResponse({ retcode: -3, message: 'Invalid avatar data, nothing was changed' }, 200);

    assert.equal(mapped.status, 400);
    assert.equal(mapped.message, 'Invalid avatar data, nothing was changed');
  });

  it('keeps the upstream 4xx status', () => {
    assert.equal(mapCollapseResponse({ retcode: -2, message: 'Wrong username / password' }, 401).status, 401);
    assert.equal(mapCollapseResponse({ retcode: -4, message: 'Game loop did not answer in time' }, 504).status, 504);
  });

  it('fails closed on a body it cannot read', () => {
    assert.equal(mapCollapseResponse(null, 200).status, 502);
    assert.equal(mapCollapseResponse('<html>nope</html>', 200).status, 502);
    assert.equal(mapCollapseResponse({ message: 'OK' }, 200).status >= 400, true, 'a missing retcode must not pass');
  });
});

describe('SendDataToCollapse', () => {
  it('posts the PascalCase body Collapse deserialises', async () => {
    const post = axios.post;
    let captured;
    axios.post = async (url, body) => {
      captured = { url, body };
      return { status: 200, data: { retcode: 0, message: 'OK', data: { avatars: 1, created: 0, updated: 0, deleted: 0, errors: [] } } };
    };

    try {
      const response = await SendDataToCollapse('acc', 'pw', 'http://127.0.0.1:3125/query_connection', [
        { AvatarID: 1204, Rank: 6, Relics: [] },
      ]);

      assert.equal(captured.url, 'http://127.0.0.1:3125/query_connection');
      assert.deepEqual(captured.body, {
        Username: 'acc',
        Password: 'pw',
        Avatars: [{ AvatarID: 1204, Rank: 6, Relics: [] }],
      });
      assert.equal(response.status, 200);
    } finally {
      axios.post = post;
    }
  });

  it('reports the server message when Collapse rejects the push', async () => {
    const post = axios.post;
    axios.post = async () => {
      throw { response: { status: 400, data: { retcode: -3, message: 'Invalid avatar data, nothing was changed' } } };
    };

    try {
      const response = await SendDataToCollapse('acc', 'pw', 'http://h', []);
      assert.equal(response.status, 400);
      assert.equal(response.message, 'Invalid avatar data, nothing was changed');
    } finally {
      axios.post = post;
    }
  });

  it('returns a string when the network itself fails', async () => {
    const post = axios.post;
    axios.post = async () => {
      throw new Error('Network Error');
    };

    try {
      assert.equal(await SendDataToCollapse('acc', 'pw', 'http://h', []), 'Network Error');
    } finally {
      axios.post = post;
    }
  });
});

describe('ProbeCollapseConnection', () => {
  const withPost = async (impl, run) => {
    const post = axios.post;
    let captured;
    axios.post = async (url, body) => {
      captured = { url, body };
      return impl();
    };
    try {
      return { result: await run(), captured };
    } finally {
      axios.post = post;
    }
  };

  const rejection = (data) => () => {
    throw { response: { status: 400, data } };
  };

  it('counts -3 as a successful handshake whatever the wording', async () => {
    const { result, captured } = await withPost(
      rejection({ retcode: -3, message: 'Invalid avatar data, nothing was changed', data: { avatars: 0, created: 0, updated: 0, deleted: 0, errors: ['Không có avatar nào'] } }),
      () => ProbeCollapseConnection('acc', 'pw', 'http://h/query_connection')
    );

    assert.equal(result.status, 200);
    assert.deepEqual(captured.body, { Username: 'acc', Password: 'pw', Avatars: [] }, 'the probe must send no avatar');
  });

  it('keeps an auth failure as a failure and passes the server reason through', async () => {
    const impl = () => {
      throw { response: { status: 401, data: { retcode: -2, message: 'Wrong username / password, or the player is not online' } } };
    };
    const { result } = await withPost(impl, () => ProbeCollapseConnection('acc', 'pw', 'http://h'));

    assert.equal(result.status, 401);
    assert.equal(result.message, 'Wrong username / password, or the player is not online');
  });

  it('fails closed on a retcode it does not know', async () => {
    const { result } = await withPost(
      rejection({ retcode: -99, message: 'something new' }),
      () => ProbeCollapseConnection('acc', 'pw', 'http://h')
    );

    assert.equal(result.status, 400);
  });

  it('explains a 404 as a wrong URL or a server started without --game', async () => {
    const impl = () => {
      throw { response: { status: 404, data: 'not found' } };
    };
    const { result } = await withPost(impl, () => ProbeCollapseConnection('acc', 'pw', 'http://h/wrong'));

    assert.equal(result.status, 404);
    assert.match(result.message, /query_connection not found/);
  });

  it('accepts a server that answers the empty push with 200', async () => {
    const { result } = await withPost(
      () => ({ status: 200, data: { retcode: 0, message: 'OK', data: { avatars: 0, created: 0, updated: 0, deleted: 0, errors: [] } } }),
      () => ProbeCollapseConnection('acc', 'pw', 'http://h')
    );

    assert.equal(result.status, 200);
  });
});
