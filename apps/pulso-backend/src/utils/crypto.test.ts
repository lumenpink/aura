import { describe, expect, it } from 'bun:test';
import { deepSortObject, calculateRowHash, calculatePayloadHash } from './crypto';

describe('Aura Pulso Crypto Utilities', () => {
  describe('deepSortObject', () => {
    it('should recursively sort object keys alphabetically', () => {
      const input = {
        z: 1,
        a: {
          y: 2,
          b: 3,
        },
        c: [
          { q: 1, p: 2 },
          { x: 3, a: 4 }
        ]
      };

      const expected = {
        a: {
          b: 3,
          y: 2,
        },
        c: [
          { p: 2, q: 1 },
          { a: 4, x: 3 }
        ],
        z: 1,
      };

      const sorted = deepSortObject(input);
      expect(JSON.stringify(sorted)).toBe(JSON.stringify(expected));
    });

    it('should handle primitives and null values correctly', () => {
      expect(deepSortObject(null)).toBeNull();
      expect(deepSortObject(42)).toBe(42);
      expect(deepSortObject("hello")).toBe("hello");
      expect(deepSortObject([])).toEqual([]);
    });
  });

  describe('calculateRowHash', () => {
    it('should generate a valid SHA-256 hex string', async () => {
      const payload = { test: 'data', number: 123 };
      const previousHash = 'previous-hash-stub';
      const createdAt = 1780650000000;

      const hash = await calculateRowHash(payload, previousHash, createdAt);
      expect(hash).toHaveLength(64);
      expect(/^[0-9a-f]{64}$/.test(hash)).toBe(true);
    });

    it('should be deterministic and generate identical hash for same inputs', async () => {
      const payloadA = { z: 1, a: 2 };
      const payloadB = { a: 2, z: 1 };
      const previousHash = 'prev-hash';
      const createdAt = 123456789;

      const hashA = await calculateRowHash(payloadA, previousHash, createdAt);
      const hashB = await calculateRowHash(payloadB, previousHash, createdAt);

      expect(hashA).toBe(hashB);
    });

    it('should change hash when payload, previousHash or createdAt change', async () => {
      const payload = { a: 1 };
      const previousHash = 'prev';
      const createdAt = 123;

      const baseHash = await calculateRowHash(payload, previousHash, createdAt);

      const differentPayloadHash = await calculateRowHash({ a: 2 }, previousHash, createdAt);
      const differentPrevHash = await calculateRowHash(payload, 'prev2', createdAt);
      const differentTimeHash = await calculateRowHash(payload, previousHash, 124);

      expect(differentPayloadHash).not.toBe(baseHash);
      expect(differentPrevHash).not.toBe(baseHash);
      expect(differentTimeHash).not.toBe(baseHash);
    });
  });

  describe('calculatePayloadHash', () => {
    it('should generate a deterministic payload hash', async () => {
      const payload = { b: 2, a: 1 };
      const hash = await calculatePayloadHash(payload);
      expect(hash).toHaveLength(64);

      const hashSame = await calculatePayloadHash({ a: 1, b: 2 });
      expect(hash).toBe(hashSame);
    });
  });
});
