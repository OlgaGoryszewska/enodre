export const BEFORE_COLOR = "#B9BECF";
export const TRACK_COLOR = "#EDEDF2";

/**
 * Progress-fill charts (bullet, radial gauge) need fill length to represent
 * "how much achieved," not the raw pct. For reduction-is-better metrics
 * (afterPct < beforePct, e.g. crash rate, error count) a small afterPct
 * would otherwise render as a small/weak-looking fill despite being a big
 * win — so those get mirrored onto a 0-100 "progress toward goal" scale.
 * Growth-is-better metrics (afterPct >= beforePct) are left as-is.
 */
export function achievementScale(metric: { beforePct: number; afterPct: number }) {
  if (metric.afterPct >= metric.beforePct) {
    return { before: metric.beforePct, after: metric.afterPct };
  }
  return { before: 100 - metric.beforePct, after: 100 - metric.afterPct };
}
