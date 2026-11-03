import { describe, it, expect } from 'vitest';
import { normalizeGap, normalizeUzbek } from '../src/lib/normalize';
import { processSeedRow, generateSentenceId } from '../scripts/import-sentences';

describe('Sentence Importer & Normalization', () => {
  it('normalizes typographic apostrophes and quotes correctly', () => {
    const raw = "I’m learning “English” right now… isn‘t it great?";
    const normalized = normalizeGap(raw);
    expect(normalized).toBe("I'm learning \"English\" right now... isn't it great?");
  });

  it('collapses multiple whitespace characters and trims', () => {
    const raw = "  She   works    in   a hospital.  ";
    expect(normalizeGap(raw)).toBe("She works in a hospital.");
  });

  it('generates deterministic uuid v5 for identical week and normalized gap', () => {
    const id1 = generateSentenceId(1, "I'm a student.");
    const id2 = generateSentenceId(1, "I'm a student.");
    const id3 = generateSentenceId(2, "I'm a student.");

    expect(id1).toBe(id2);
    expect(id1).not.toBe(id3);
    // Standard UUID format
    expect(id1).toMatch(/^[0-9a-f]{8}-[0-9a-f]{4}-5[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i);
  });

  it('splits paired sentences with " / " properly when both sides have matching parts', () => {
    const rawRow = {
      id: 99,
      hafta: 7,
      gap: "I work in a shop. / I'm working in a shop this month.",
      tarjima: "Men do'konda ishlayman. / Men bu oy do'konda ishlayapman.",
      grammatika: "Present Simple vs Continuous"
    };

    const { items, wasSplit } = processSeedRow(rawRow);
    expect(wasSplit).toBe(true);
    expect(items.length).toBe(2);

    expect(items[0].gap).toBe("I work in a shop.");
    expect(items[0].tarjima).toBe("Men do'konda ishlayman.");
    expect(items[0].week).toBe(7);
    expect(items[0].grammar_tag).toBe("Present Simple vs Continuous");

    expect(items[1].gap).toBe("I'm working in a shop this month.");
    expect(items[1].tarjima).toBe("Men bu oy do'konda ishlayapman.");
    expect(items[1].week).toBe(7);
  });

  it('does not split if parts count do not match', () => {
    const rawRow = {
      id: 100,
      hafta: 2,
      gap: "He likes apples / oranges.",
      tarjima: "U olmalarni yaxshi ko'radi.",
      grammatika: "vocabulary"
    };

    const { items, wasSplit } = processSeedRow(rawRow);
    expect(wasSplit).toBe(false);
    expect(items.length).toBe(1);
  });
});
