// AnyList stores recipe prepTime/cookTime as whole seconds (see
// anylist-js/README.md). The MCP tools speak minutes, so convert at the edge.

export function minutesToSeconds(minutes) {
  if (minutes === undefined || minutes === null || minutes === '') return null;
  const n = Number(minutes);
  if (!Number.isFinite(n) || n <= 0) return null;
  return Math.round(n * 60);
}

export function formatDuration(seconds) {
  if (!seconds || seconds <= 0) return null;
  const minutes = Math.round(seconds / 60);
  return minutes < 1 ? '<1 min' : `${minutes} min`;
}

// Converts a free-text or ISO 8601 duration ("20 min", "1 hour 15 minutes",
// "PT1H15M", or a bare number of minutes) to seconds. Returns null if the
// text can't be understood, so a bad value is dropped rather than saved.
export function durationTextToSeconds(text) {
  if (text === undefined || text === null) return null;
  if (typeof text === 'number') return minutesToSeconds(text);
  const s = String(text).trim().toLowerCase();
  if (!s) return null;
  if (/^\d+(\.\d+)?$/.test(s)) return minutesToSeconds(s);

  const iso = s.match(/^pt(?:(\d+(?:\.\d+)?)h)?(?:(\d+(?:\.\d+)?)m)?(?:(\d+(?:\.\d+)?)s)?$/);
  if (iso && (iso[1] || iso[2] || iso[3])) {
    const total = (Number(iso[1] || 0) * 3600) + (Number(iso[2] || 0) * 60) + Number(iso[3] || 0);
    return total > 0 ? Math.round(total) : null;
  }

  const hours = s.match(/(\d+(?:\.\d+)?)\s*(?:h|hr|hrs|hour|hours)\b/);
  const mins = s.match(/(\d+(?:\.\d+)?)\s*(?:m|min|mins|minute|minutes)\b/);
  if (!hours && !mins) return null;
  const total = (hours ? Number(hours[1]) * 3600 : 0) + (mins ? Number(mins[1]) * 60 : 0);
  return total > 0 ? Math.round(total) : null;
}
