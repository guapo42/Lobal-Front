import { describe, it, expect } from 'vitest';
import { degToRad, polarToCartesian, timeToAngle, describeArc } from '../svg-math';

describe('degToRad', () => {
  it('converts 180° to π', () => {
    expect(degToRad(180)).toBeCloseTo(Math.PI);
  });
  it('converts 90° to π/2', () => {
    expect(degToRad(90)).toBeCloseTo(Math.PI / 2);
  });
});

describe('polarToCartesian', () => {
  it('at 0° from origin with r=1 gives (1, 0)', () => {
    const p = polarToCartesian(0, 0, 1, 0);
    expect(p.x).toBeCloseTo(1);
    expect(p.y).toBeCloseTo(0);
  });

  it('at 90° from origin with r=1 gives (0, 1)', () => {
    const p = polarToCartesian(0, 0, 1, 90);
    expect(p.x).toBeCloseTo(0);
    expect(p.y).toBeCloseTo(1);
  });

  it('respects center offset', () => {
    const p = polarToCartesian(100, 100, 50, 0);
    expect(p.x).toBeCloseTo(150);
    expect(p.y).toBeCloseTo(100);
  });
});

describe('timeToAngle', () => {
  it('places 0h at the top (-90°)', () => {
    expect(timeToAngle(0, 0)).toBe(-90);
  });

  it('places 6h at the right (0°)', () => {
    expect(timeToAngle(6, 0)).toBe(0);
  });

  it('places 12h at the bottom (90°)', () => {
    expect(timeToAngle(12, 0)).toBe(90);
  });

  it('handles fractional minutes correctly', () => {
    // 30 minutes past midnight = 1/48 of full rotation past -90
    expect(timeToAngle(0, 30)).toBeCloseTo(-90 + 360 / 48);
  });
});

describe('describeArc', () => {
  it('returns an SVG path string starting with M', () => {
    const d = describeArc(100, 100, 80, 40, 0, 90);
    expect(d.startsWith('M ')).toBe(true);
    expect(d.endsWith('Z')).toBe(true);
  });

  it('sets largeArcFlag=0 for arcs under 180°', () => {
    const d = describeArc(0, 0, 10, 5, 0, 90);
    expect(d).toContain('0 0 1'); // largeArc=0, sweep=1
  });

  it('sets largeArcFlag=1 for arcs over 180°', () => {
    const d = describeArc(0, 0, 10, 5, 0, 270);
    expect(d).toContain('0 1 1'); // largeArc=1, sweep=1
  });
});
