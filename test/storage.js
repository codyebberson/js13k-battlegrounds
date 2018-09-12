const assert = require('assert');
const storage = require('../lib/storage');
const interface = storage.interface;

describe('storage', () => {

    const key = 'test';
    const value = 'árvíztűrő tükörfúrógép';
    const length = Buffer.byteLength(key + value, 'utf8');
    const key2 = 'test2';
    const value2 = 'Test 2';
    const length2 = Buffer.byteLength(key + value2, 'utf8');
    const limit = new Array(13313).join('+');

    describe('init()', () => {
        it('inited', async () => {
            await storage.init('sqlite:test/storage.sqlite');
        });
    });

    describe('set() / get()', () => {
        it ('get default value', async () => {
            await interface.clear();
            assert.equal(await interface.get(key, value), value);
        });
        it ('set value', async () => {
            assert.equal(await interface.set(key, value, false), true);
        });
        it ('get value', async () => {
            assert.equal(await interface.get(key, '', false), value);
        });
        it ('size match', async () => {
            assert.equal(await interface.size(), length);
        });
        it ('update value', async () => {
            assert.equal(await interface.set(key, value2, false), true);
        });
        it ('value updated', async () => {
            assert.equal(await interface.get(key, '', false), value2);
        });
        it ('size updated', async () => {
            assert.equal(await interface.size(), length2);
        });
        it ('get default json', async () => {
            await interface.clear();
            assert.equal(await interface.get(key, true), true);
        });
        it ('set json', async () => {
            assert.equal(await interface.set(key, true), true);
        });
        it ('get json', async () => {
            assert.equal(await interface.get(key, true), true);
        });
        it ('update json', async () => {
            assert.equal(await interface.set(key, false), true);
        });
        it ('value json', async () => {
            assert.equal(await interface.get(key, false), false);
        });
    });

    describe('key()', () => {
        it('first key', async () => {
            await interface.clear();
            assert.equal(await interface.set(key, value), true);
            assert.equal(await interface.set(key2, value2), true);
            assert.equal(await interface.key(0), key);
        });
        it('last key', async () => {
            assert.equal(await interface.key(1), key2);
        });
    });

    describe('length()', () => {
        it('one key', async () => {
            await interface.clear();
            assert.equal(await interface.set(key, value), true);
            assert.equal(await interface.length(), 1);
        });
        it('two key', async () => {
            assert.equal(await interface.set(key2, value2), true);
            assert.equal(await interface.length(), 2);
        });
    });

    describe('remove()', () => {
        it('remove key', async () => {
            await interface.clear();
            assert.equal(await interface.set(key, value), true);
            await interface.remove(key);
            assert.equal(await interface.get(key), undefined);
        });
        it('length 0', async () => {
            assert.equal(await interface.size(), 0);
        });
        it('size 0', async () => {
            assert.equal(await interface.length(), 0);
        });
    });

    describe('clear()', () => {
        it('empty storage', async () => {
            assert.equal(await interface.set(key, value), true);
            assert.equal(await interface.set(key2, value2), true);
            await interface.clear();
        });
        it('remove key', async () => {
            assert.equal(await interface.get(key), undefined);
        });
        it('length 0', async () => {
            assert.equal(await interface.size(), 0);
        });
        it('size 0', async () => {
            assert.equal(await interface.length(), 0);
        });
    });

    describe('13k limit', () => {
        it ('set max key', async () => {
            await interface.clear();
            assert.equal(await interface.set(limit, '', false), true);
        });
        it ('set max value', async () => {
            await interface.clear();
            assert.equal(await interface.set('', limit, false), true);
        });
        it ('too big key', async () => {
            await interface.clear();
            assert.equal(await interface.set(limit, '1', false), false);
        });
        it ('too big value', async () => {
            await interface.clear();
            assert.equal(await interface.set('1', limit, false), false);
        });
    });
    
});
