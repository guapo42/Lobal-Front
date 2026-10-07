'use client';

/**
 * Performance instrumentation for design exploration.
 * Logs render_time, interaction_latency, and capture click counts.
 */

const PREFIX = '[ExternalLobe:Perf]';

export function logRenderTime(component: string, ms: number) {
  console.log(`${PREFIX} render_time | ${component} | ${ms.toFixed(2)}ms`);
}

export function logInteractionLatency(component: string, action: string, ms: number) {
  console.log(`${PREFIX} interaction_latency | ${component} | ${action} | ${ms.toFixed(2)}ms`);
}

export function logCaptureClicks(variation: string, clicks: number) {
  console.log(`${PREFIX} capture_clicks | ${variation} | ${clicks} clicks for full cycle`);
}

/**
 * Hook-friendly: call at mount to measure time from render start to paint.
 * Returns a ref callback to stamp the start time.
 */
export function measureRender(component: string): { markStart: () => number; markEnd: (start: number) => void } {
  return {
    markStart: () => performance.now(),
    markEnd: (start: number) => {
      const elapsed = performance.now() - start;
      logRenderTime(component, elapsed);
    },
  };
}
