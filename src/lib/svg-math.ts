/**
 * Shared SVG geometry helpers for clock/dial/graph rendering.
 *
 * Keeps polar-coordinate math in one place — any dial component
 * that draws arcs, ticks, or radial markers imports these rather
 * than re-implementing the trig.
 */

export interface Point {
  x: number;
  y: number;
}

/** Degrees to radians. */
export function degToRad(deg: number): number {
  return (deg * Math.PI) / 180;
}

/**
 * Convert polar coordinates (centered at cx,cy) to cartesian.
 * Angle is in degrees, 0° points along the +x axis.
 */
export function polarToCartesian(
  cx: number,
  cy: number,
  r: number,
  angleDeg: number
): Point {
  const rad = degToRad(angleDeg);
  return {
    x: cx + r * Math.cos(rad),
    y: cy + r * Math.sin(rad),
  };
}

/**
 * Convert a 24-hour time (hours + minutes) to a dial angle in
 * degrees, with 0 hours rendered at the top (-90°) and moving
 * clockwise.
 */
export function timeToAngle(hours: number, minutes: number = 0): number {
  const totalHours = hours + minutes / 60;
  return (totalHours / 24) * 360 - 90;
}

/**
 * Build an SVG path string describing a donut-shaped arc between
 * two angles. Used for task wedges on the Radial Dial.
 */
export function describeArc(
  cx: number,
  cy: number,
  outerR: number,
  innerR: number,
  startAngle: number,
  endAngle: number
): string {
  const outerStart = polarToCartesian(cx, cy, outerR, startAngle);
  const outerEnd = polarToCartesian(cx, cy, outerR, endAngle);
  const innerStart = polarToCartesian(cx, cy, innerR, endAngle);
  const innerEnd = polarToCartesian(cx, cy, innerR, startAngle);

  const largeArcFlag = endAngle - startAngle > 180 ? 1 : 0;

  return [
    `M ${outerStart.x} ${outerStart.y}`,
    `A ${outerR} ${outerR} 0 ${largeArcFlag} 1 ${outerEnd.x} ${outerEnd.y}`,
    `L ${innerStart.x} ${innerStart.y}`,
    `A ${innerR} ${innerR} 0 ${largeArcFlag} 0 ${innerEnd.x} ${innerEnd.y}`,
    'Z',
  ].join(' ');
}
