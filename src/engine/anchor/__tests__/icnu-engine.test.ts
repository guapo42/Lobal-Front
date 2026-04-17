import { describe, it, expect } from 'vitest';
import {
  calculateFocusScore,
  rankTasks,
  filterByEnergy,
  wedgeExpansion,
  getWeightProfile,
  type EnergyLevel,
  type ICNUScores,
} from '../icnu-engine';

const mk = (i: number, c: number, n: number, u: number): ICNUScores => ({
  interest: i,
  challenge: c,
  novelty: n,
  urgency: u,
});

describe('calculateFocusScore', () => {
  it('returns 0 for all-zero ICNU at any energy', () => {
    for (const e of [1, 2, 3, 4, 5] as EnergyLevel[]) {
      expect(calculateFocusScore(mk(0, 0, 0, 0), e)).toBe(0);
    }
  });

  it('returns 1 for all-ten ICNU at any energy', () => {
    for (const e of [1, 2, 3, 4, 5] as EnergyLevel[]) {
      expect(calculateFocusScore(mk(10, 10, 10, 10), e)).toBeCloseTo(1);
    }
  });

  it('at Energy 1 (survival), urgency dominates', () => {
    const urgentOnly = calculateFocusScore(mk(0, 0, 0, 10), 1);
    const interestOnly = calculateFocusScore(mk(10, 0, 0, 0), 1);
    expect(urgentOnly).toBeGreaterThan(interestOnly);
    expect(urgentOnly).toBeCloseTo(0.8, 1); // wU = 0.80
  });

  it('at Energy 5 (hyperfocus), interest/challenge/novelty beat urgency', () => {
    const urgentOnly = calculateFocusScore(mk(0, 0, 0, 10), 5);
    const interestOnly = calculateFocusScore(mk(10, 0, 0, 0), 5);
    expect(interestOnly).toBeGreaterThan(urgentOnly);
  });

  it('never returns a value outside [0, 1]', () => {
    for (let i = 0; i <= 10; i++) {
      for (let u = 0; u <= 10; u++) {
        const score = calculateFocusScore(mk(i, 5, 5, u), 3);
        expect(score).toBeGreaterThanOrEqual(0);
        expect(score).toBeLessThanOrEqual(1);
      }
    }
  });
});

describe('rankTasks', () => {
  const tasks = [
    { id: 'low-interest', icnu_score: mk(1, 1, 1, 1) },
    { id: 'high-urgency', icnu_score: mk(1, 1, 1, 10) },
    { id: 'high-interest', icnu_score: mk(10, 1, 1, 1) },
  ];

  it('sorts descending by Focus Score at energy 1 (urgency wins)', () => {
    const ranked = rankTasks(tasks, 1);
    expect(ranked[0].id).toBe('high-urgency');
  });

  it('sorts descending by Focus Score at energy 5 (interest wins)', () => {
    const ranked = rankTasks(tasks, 5);
    expect(ranked[0].id).toBe('high-interest');
  });

  it('attaches focusScore to each returned task', () => {
    const ranked = rankTasks(tasks, 3);
    expect(ranked).toHaveLength(3);
    for (const t of ranked) {
      expect(typeof t.focusScore).toBe('number');
    }
  });
});

describe('filterByEnergy', () => {
  const tasks = [
    { id: 'urgent-simple', icnu_score: mk(3, 2, 3, 8) },     // low challenge, high urgency
    { id: 'interesting-hard', icnu_score: mk(9, 8, 7, 2) },   // hyperfocus candidate
    { id: 'boring-complex', icnu_score: mk(2, 9, 1, 2) },     // high challenge, low interest
    { id: 'boring-mild', icnu_score: mk(2, 2, 2, 3) },        // nothing special
  ];

  it('at energy 1-2 keeps only high-urgency + low-challenge tasks', () => {
    const kept = filterByEnergy(tasks, 2);
    expect(kept.map((t) => t.id)).toContain('urgent-simple');
    expect(kept.map((t) => t.id)).not.toContain('boring-complex');
  });

  it('at energy 3 (balanced) keeps everything', () => {
    expect(filterByEnergy(tasks, 3)).toHaveLength(tasks.length);
  });

  it('at energy 4-5 keeps interesting or challenging tasks', () => {
    const kept = filterByEnergy(tasks, 5);
    expect(kept.map((t) => t.id)).toContain('interesting-hard');
    expect(kept.map((t) => t.id)).toContain('boring-complex'); // high challenge qualifies
    expect(kept.map((t) => t.id)).not.toContain('boring-mild');
  });
});

describe('wedgeExpansion', () => {
  it('maps score 0 to 0.5x', () => {
    expect(wedgeExpansion(0)).toBe(0.5);
  });

  it('maps score 1 to 2.0x', () => {
    expect(wedgeExpansion(1)).toBe(2.0);
  });

  it('uses ease-in (quadratic) — score 0.5 produces < 1.25x linear midpoint', () => {
    const mid = wedgeExpansion(0.5);
    expect(mid).toBeLessThan(1.25); // because curve is x² based
    expect(mid).toBeGreaterThan(0.5);
  });
});

describe('getWeightProfile', () => {
  it('returns weights that sum to 1.0 at every energy level', () => {
    for (const e of [1, 2, 3, 4, 5] as EnergyLevel[]) {
      const w = getWeightProfile(e);
      const sum = w.wI + w.wC + w.wN + w.wU;
      expect(sum).toBeCloseTo(1.0, 5);
    }
  });

  it('Energy 1 has highest urgency weight', () => {
    const w1 = getWeightProfile(1);
    expect(w1.wU).toBeGreaterThan(w1.wI);
    expect(w1.wU).toBeGreaterThan(w1.wC);
    expect(w1.wU).toBeGreaterThan(w1.wN);
  });

  it('Energy 5 has lowest urgency weight', () => {
    const w5 = getWeightProfile(5);
    expect(w5.wU).toBeLessThan(w5.wI);
    expect(w5.wU).toBeLessThan(w5.wC);
  });
});
