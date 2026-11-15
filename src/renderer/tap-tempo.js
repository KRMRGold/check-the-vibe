export function createTapTempo({ maxIntervals = 4, resetAfterMs = 2000 } = {}) {
  let taps = [];

  return {
    tap(timestamp = Date.now()) {
      if (!Number.isFinite(timestamp)) return null;
      const previous = taps.at(-1);
      if (previous !== undefined && (timestamp <= previous || timestamp - previous > resetAfterMs)) {
        taps = [];
      }
      taps.push(timestamp);
      if (taps.length > maxIntervals + 1) taps.shift();
      if (taps.length < 2) return null;

      const intervals = taps.slice(1).map((time, index) => time - taps[index]);
      const averageInterval = intervals.reduce((sum, value) => sum + value, 0) / intervals.length;
      if (averageInterval <= 0) return null;
      return Math.min(400, Math.max(1, Math.round(60000 / averageInterval)));
    },
    reset() {
      taps = [];
    }
  };
}
