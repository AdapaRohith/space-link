// ===== SOURCE SERVICE — API BACKED =====
import { apiGet, apiPost } from './storage';

let _sourcesCache = null;

export async function getAllSources() {
  try {
    const sources = await apiGet('/sources');
    _sourcesCache = sources;
    return sources;
  } catch {
    return _sourcesCache || [];
  }
}

export function getSourceName(id, sourcesCache) {
  const sources = sourcesCache || _sourcesCache || [];
  const source = sources.find(s => s.id === id);
  return source ? source.source_name : 'Unknown';
}

export async function addCustomSource(name) {
  const source = await apiPost('/sources', { source_name: name });
  _sourcesCache = null; // invalidate cache
  return source;
}
