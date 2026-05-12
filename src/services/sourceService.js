// ===== SOURCE SERVICE =====
import { getCollection, setCollection, generateId } from './storage';

const COLLECTION = 'crm_sources';

export function getAllSources() {
  return getCollection(COLLECTION);
}

export function getSourceById(id) {
  return getCollection(COLLECTION).find(s => s.id === id) || null;
}

export function getSourceName(id) {
  const source = getSourceById(id);
  return source ? source.source_name : 'Unknown';
}

export function addCustomSource(name) {
  const sources = getCollection(COLLECTION);
  const existing = sources.find(
    s => s.source_name.toLowerCase() === name.toLowerCase()
  );
  if (existing) return existing;

  const newSource = {
    id: 'src_' + generateId(),
    source_name: name,
    is_custom: true,
  };
  sources.push(newSource);
  setCollection(COLLECTION, sources);
  return newSource;
}
