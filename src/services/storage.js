// ===== GENERIC LOCALSTORAGE CRUD SERVICE =====

export function generateId() {
  return Date.now().toString(36) + Math.random().toString(36).substr(2, 9);
}

export function getCollection(key) {
  try {
    const data = localStorage.getItem(key);
    return data ? JSON.parse(data) : [];
  } catch {
    return [];
  }
}

export function setCollection(key, data) {
  localStorage.setItem(key, JSON.stringify(data));
}

export function addItem(collectionKey, item) {
  const collection = getCollection(collectionKey);
  const newItem = {
    ...item,
    id: generateId(),
    created_at: new Date().toISOString(),
    updated_at: new Date().toISOString(),
  };
  collection.push(newItem);
  setCollection(collectionKey, collection);
  return newItem;
}

export function updateItem(collectionKey, id, updates) {
  const collection = getCollection(collectionKey);
  const index = collection.findIndex(item => item.id === id);
  if (index === -1) return null;
  collection[index] = {
    ...collection[index],
    ...updates,
    updated_at: new Date().toISOString(),
  };
  setCollection(collectionKey, collection);
  return collection[index];
}

export function deleteItem(collectionKey, id) {
  const collection = getCollection(collectionKey);
  const filtered = collection.filter(item => item.id !== id);
  setCollection(collectionKey, filtered);
  return filtered.length < collection.length;
}

export function getItemById(collectionKey, id) {
  const collection = getCollection(collectionKey);
  return collection.find(item => item.id === id) || null;
}

export function queryItems(collectionKey, filterFn) {
  const collection = getCollection(collectionKey);
  return filterFn ? collection.filter(filterFn) : collection;
}

export function exportData() {
  const keys = ['crm_leads', 'crm_visits', 'crm_activities', 'crm_sources', 'crm_users'];
  const data = {};
  keys.forEach(key => { data[key] = getCollection(key); });
  return JSON.stringify(data, null, 2);
}

export function importData(jsonString) {
  try {
    const data = JSON.parse(jsonString);
    Object.entries(data).forEach(([key, value]) => {
      if (Array.isArray(value)) setCollection(key, value);
    });
    return true;
  } catch {
    return false;
  }
}
