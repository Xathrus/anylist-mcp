import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import { minutesToSeconds, formatDuration, durationTextToSeconds } from '../src/recipe-time.js';

describe('Recipe time conversion', () => {
  describe('minutesToSeconds', () => {
    it('converts minutes to whole seconds', () => {
      assert.equal(minutesToSeconds(20), 1200);
      assert.equal(minutesToSeconds(1.5), 90);
    });

    it('returns null for empty, zero, negative or non-numeric input', () => {
      for (const v of [undefined, null, '', 0, -5, 'abc']) {
        assert.equal(minutesToSeconds(v), null, `input ${JSON.stringify(v)}`);
      }
    });
  });

  describe('formatDuration', () => {
    it('shows AnyList seconds as minutes', () => {
      assert.equal(formatDuration(1500), '25 min');
      assert.equal(formatDuration(600), '10 min');
    });

    it('rounds to the nearest minute and flags sub-minute values', () => {
      assert.equal(formatDuration(89), '1 min');
      assert.equal(formatDuration(20), '<1 min');
    });

    it('returns null when there is no time', () => {
      assert.equal(formatDuration(0), null);
      assert.equal(formatDuration(null), null);
    });
  });

  describe('durationTextToSeconds', () => {
    it('parses the normalizer "N min" format', () => {
      assert.equal(durationTextToSeconds('20 min'), 1200);
    });

    it('parses ISO 8601 durations', () => {
      assert.equal(durationTextToSeconds('PT1H15M'), 4500);
      assert.equal(durationTextToSeconds('PT45M'), 2700);
      assert.equal(durationTextToSeconds('PT30S'), 30);
    });

    it('parses hours and minutes in words', () => {
      assert.equal(durationTextToSeconds('1 hour 15 minutes'), 4500);
      assert.equal(durationTextToSeconds('2 hrs'), 7200);
    });

    it('treats a bare number as minutes', () => {
      assert.equal(durationTextToSeconds('30'), 1800);
      assert.equal(durationTextToSeconds(30), 1800);
    });

    it('returns null for text it cannot understand', () => {
      assert.equal(durationTextToSeconds('overnight'), null);
      assert.equal(durationTextToSeconds(''), null);
      assert.equal(durationTextToSeconds(null), null);
    });
  });
});
