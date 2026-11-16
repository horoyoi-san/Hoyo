import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import { buildConnectUrl } from '../src/helper/connectEndpoint.ts';

describe('buildConnectUrl', () => {
  it('appends /sr-tools to a bare host', () => {
    assert.equal(
      buildConnectUrl('March7thHoney', 'http://localhost:21000'),
      'http://localhost:21000/sr-tools'
    );
  });

  it('does not double the path when the user already pasted it', () => {
    assert.equal(
      buildConnectUrl('March7thHoney', 'http://localhost:21000/sr-tools'),
      'http://localhost:21000/sr-tools'
    );
  });

  it('treats a trailing slash as the same endpoint', () => {
    assert.equal(
      buildConnectUrl('March7thHoney', 'http://localhost:21000/sr-tools/'),
      'http://localhost:21000/sr-tools'
    );
    assert.equal(
      buildConnectUrl('March7thHoney', 'http://localhost:21000///'),
      'http://localhost:21000/sr-tools'
    );
  });

  it('ignores case and query strings', () => {
    assert.equal(
      buildConnectUrl('March7thHoney', 'http://localhost:21000/SR-Tools'),
      'http://localhost:21000/SR-Tools'
    );
    assert.equal(
      buildConnectUrl('March7thHoney', 'http://localhost:21000/sr-tools?lang=vi'),
      'http://localhost:21000/sr-tools?lang=vi'
    );
  });

  it('adds the scheme when it is missing', () => {
    assert.equal(
      buildConnectUrl('March7thHoney', '  localhost:21000  '),
      'http://localhost:21000/sr-tools'
    );
  });

  it('keeps https untouched', () => {
    assert.equal(
      buildConnectUrl('March7thHoney', 'https://honey.example.org'),
      'https://honey.example.org/sr-tools'
    );
  });

  it('leaves Other mode exactly as typed', () => {
    assert.equal(
      buildConnectUrl('Other', 'http://127.0.0.1:3125/query_connection'),
      'http://127.0.0.1:3125/query_connection'
    );
  });

  it('keeps the built-in endpoints for FireflyGo and RobinSR', () => {
    assert.equal(buildConnectUrl('FireflyGo', 'ignored'), 'http://localhost:21000/sync');
    assert.equal(buildConnectUrl('RobinSR', 'ignored'), 'http://localhost:21000/srtools');
  });

  it('appends /query_connection for Collapse without doubling it', () => {
    assert.equal(
      buildConnectUrl('Collapse', 'http://127.0.0.1:3125'),
      'http://127.0.0.1:3125/query_connection'
    );
    assert.equal(
      buildConnectUrl('Collapse', 'http://127.0.0.1:3125/query_connection'),
      'http://127.0.0.1:3125/query_connection'
    );
    assert.equal(
      buildConnectUrl('Collapse', 'http://127.0.0.1:3125/query_connection/'),
      'http://127.0.0.1:3125/query_connection'
    );
    assert.equal(
      buildConnectUrl('Collapse', 'localhost:3125'),
      'http://localhost:3125/query_connection'
    );
    assert.equal(
      buildConnectUrl('Collapse', 'https://game.example.org'),
      'https://game.example.org/query_connection'
    );
  });

  it('does not leak one type endpoint suffix into another', () => {
    assert.equal(buildConnectUrl('Collapse', 'http://h:1/sr-tools'), 'http://h:1/sr-tools/query_connection');
    assert.equal(buildConnectUrl('March7thHoney', 'http://h:1/query_connection'), 'http://h:1/query_connection/sr-tools');
  });
});
