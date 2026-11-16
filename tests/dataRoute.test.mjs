import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import { GET } from '../src/app/api/data/[name]/route.ts';

describe('data HTTP cache validation', () => {
  it('returns content ETags, accepts conditional requests', async () => {
    const context = { params: Promise.resolve({ name: 'as' }) };
    const response = await GET(new Request('http://localhost/api/data/as'), context);
    assert.equal(response.status, 200);
    assert.equal(response.headers.get('Content-Encoding'), 'br');
    const etag = response.headers.get('etag');
    assert.ok(etag);
    assert.match(response.headers.get('Cache-Control'), /no-cache/);
    const cached = await GET(new Request('http://localhost/api/data/as', { headers: { 'If-None-Match': `W/${etag}` } }), context);
    assert.equal(cached.status, 304);
    assert.equal(await cached.text(), '');
    const missing = await GET(new Request('http://localhost/api/data/missing'), { params: Promise.resolve({ name: 'missing' }) });
    assert.equal(missing.status, 404);
  });
});

describe('metadata views', () => {
  it('serves a core view without Stage and a separate stage view, with content ETags', async () => {
    const { brotliDecompressSync } = await import('node:zlib');
    const read = async name => {
      const res = await GET(new Request(`http://localhost/api/data/${name}`), { params: Promise.resolve({ name }) });
      assert.equal(res.status, 200);
      assert.equal(res.headers.get('Content-Encoding'), 'br');
      return JSON.parse(brotliDecompressSync(Buffer.from(await res.arrayBuffer())).toString());
    };
    const [core, stage] = await Promise.all(['metadata_core', 'metadata_stage'].map(read));
    assert.equal('Stage' in core, false);
    assert.ok(Object.keys(core).length > 0);
    assert.ok(Object.keys(stage).length > 0);
    const etag = (await GET(new Request('http://localhost/api/data/metadata_core'), { params: Promise.resolve({ name: 'metadata_core' }) })).headers.get('etag');
    const cached = await GET(new Request('http://localhost/api/data/metadata_core', { headers: { 'If-None-Match': etag } }), { params: Promise.resolve({ name: 'metadata_core' }) });
    assert.equal(cached.status, 304);
  });
});

describe('avatar views', () => {
  it('has one detail per indexed avatar, holding the heavy parts the index leaves out', async () => {
    const { brotliDecompressSync } = await import('node:zlib');
    const read = async name => {
      const res = await GET(new Request(`http://localhost/api/data/${name}`), { params: Promise.resolve({ name }) });
      assert.equal(res.status, 200);
      return JSON.parse(brotliDecompressSync(Buffer.from(await res.arrayBuffer())).toString());
    };
    const index = await read('avatar_index');
    const ids = Object.keys(index);
    assert.ok(ids.length > 0);
    const detail = Object.fromEntries(await Promise.all(ids.map(async id => [id, await read(`avatar_detail_${id}`)])));
    const missing = await GET(new Request('http://localhost/api/data/avatar_detail_0'), { params: Promise.resolve({ name: 'avatar_detail_0' }) });
    assert.equal(missing.status, 404);
    for (const id of ids) {
      assert.deepEqual(Object.keys(detail[id]).sort(), ['Enhanced', 'ExRanks', 'Memosprite', 'Ranks', 'SkillTrees', 'Skills'], id);
      assert.deepEqual(index[id].Skills, {}, id);
      assert.deepEqual(index[id].Ranks, {}, id);
      // What converterToAvatarStore and the importers read from each tree: the index keeps it.
      const firstPoint = tree => Object.values(tree)[0] && { id: Object.values(tree)[0].PointID, max: Object.values(tree)[0].MaxLevel };
      for (const [treeId, tree] of Object.entries(detail[id].SkillTrees)) {
        assert.deepEqual(firstPoint(index[id].SkillTrees[treeId]), firstPoint(tree), `${id}/${treeId}`);
      }
    }
  });
});

describe('subfolder documents', () => {
  it('serves data/<folder>/<file> as <folder>_<file> and never walks the filesystem by name', async () => {
    const get = name => GET(new Request(`http://localhost/api/data/${name}`), { params: Promise.resolve({ name }) });
    assert.equal((await get('avatar_detail_1001')).status, 200);
    for (const name of ['avatar_detail', 'avatar_detail/1001', '..%2Fpackage', '../package', 'avatar_detail_']) {
      assert.equal((await get(name)).status, 404, name);
    }
  });
});
