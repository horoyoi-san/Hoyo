import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import dns from 'node:dns/promises';
import { isBlockedAddress, ipv4ToNumber, assertPublicUrl, BlockedTargetError } from '../src/lib/net/guard.ts';

const dnsAvailable = async () => {
  try {
    const addresses = await dns.lookup('example.com', { all: true });
    return addresses.length > 0;
  } catch {
    return false;
  }
};

// /api/proxy is public, so the addresses it may reach are a security boundary:
// host names alone are not enough because 127-0-0-1.sslip.io and
// 10-0-0-1.nip.io resolve to private space while looking public.

describe('proxy target guard', () => {
  it('blocks loopback, private, link-local, CGNAT, multicast and reserved IPv4 space', () => {
    for (const ip of [
      '0.0.0.0', '127.0.0.1', '127.10.20.30',
      '10.0.0.1', '172.16.0.1', '172.31.255.255', '192.168.1.7',
      '169.254.169.254', '100.64.0.1', '192.0.0.1', '198.18.0.1',
      '224.0.0.1', '240.0.0.1', '255.255.255.255',
    ]) {
      assert.equal(isBlockedAddress(ip), true, `${ip} must be blocked`);
    }
  });

  it('allows public IPv4 space', () => {
    for (const ip of ['8.8.8.8', '1.1.1.1', '172.32.0.1', '192.169.0.1', '203.0.114.1']) {
      assert.equal(isBlockedAddress(ip), false, `${ip} must stay reachable`);
    }
  });

  it('blocks IPv6 loopback, unique-local, link-local, multicast and mapped IPv4', () => {
    for (const ip of [
      '::', '::1', 'fe80::1', 'fc00::1', 'fd12:3456::1', 'ff02::1',
      '::ffff:127.0.0.1', '::ffff:10.0.0.1',
    ]) {
      assert.equal(isBlockedAddress(ip), true, `${ip} must be blocked`);
    }
    assert.equal(isBlockedAddress('2606:4700:4700::1111'), false);
    assert.equal(isBlockedAddress('::ffff:8.8.8.8'), false);
  });

  it('treats unparseable addresses as unsafe', () => {
    assert.equal(isBlockedAddress('not-an-ip'), true);
    assert.equal(ipv4ToNumber('999.1.1.1'), null);
    assert.equal(ipv4ToNumber('1.2.3'), null);
  });

  it('rejects non http(s) protocols', async () => {
    for (const url of ['file:///etc/passwd', 'ftp://example.com/x', 'gopher://example.com/']) {
      await assert.rejects(() => assertPublicUrl(url), BlockedTargetError);
    }
  });

  it('rejects literal private targets', async () => {
    for (const url of [
      'http://127.0.0.1:21000/sr-tools',
      'http://[::1]:21000/sr-tools',
      'http://169.254.169.254/latest/meta-data/',
      'http://10.0.0.1/sr-tools',
    ]) {
      await assert.rejects(() => assertPublicUrl(url), BlockedTargetError, `${url} must be blocked`);
    }
  });

  it('rejects DNS names that point at private space', async (t) => {
    // localhost always resolves locally; the wildcard DNS services below only
    // resolve while the machine is online.
    await assert.rejects(() => assertPublicUrl('http://localhost:21000/sr-tools'), BlockedTargetError);

    if (!(await dnsAvailable())) {
      t.skip('DNS unavailable, skipping wildcard host cases');
      return;
    }

    for (const url of [
      'http://127-0-0-1.sslip.io:21000/sr-tools',
      'http://10-0-0-1.sslip.io/sr-tools',
    ]) {
      await assert.rejects(() => assertPublicUrl(url), BlockedTargetError, `${url} must be blocked`);
    }
  });

  it('keeps public targets usable', async (t) => {
    const url = await assertPublicUrl('http://8.8.8.8/');
    assert.equal(url.hostname, '8.8.8.8');

    if (!(await dnsAvailable())) {
      t.skip('DNS unavailable, skipping host name case');
      return;
    }
    assert.equal((await assertPublicUrl('https://example.com/')).hostname, 'example.com');
  });
});
