import { openDB, DBSchema, IDBPDatabase } from 'idb';
import type { Diet, Food, MacroDistribution, User, WeightRecord, ProgressPhoto, DietMacros, WaterRecord, Notification } from '../types';

interface AppDB extends DBSchema {
  diets: {
    key: string;
    value: Diet;
    indexes: { 'by-user': string };
  };
  foods: {
    key: string;
    value: Food;
    indexes: { 'by-category': string };
  };
  users: {
    key: string;
    value: User;
  };
  dietMacros: {
    key: string;
    value: DietMacros;
    indexes: { 'by-diet': string };
  };
  waterIntakeHistory: {
    key: string;
    value: WaterRecord;
    indexes: { 'by-user': string; 'by-date': Date };
  };
  notifications: {
    key: string;
    value: Notification;
    indexes: { 'by-user': string; 'by-read': boolean };
  };
  weightHistory: {
    key: string;
    value: WeightRecord;
    indexes: { 'by-user': string; 'by-date': Date };
  };
  progressPhotos: {
    key: string;
    value: ProgressPhoto;
    indexes: { 'by-user': string; 'by-date': Date };
  };
  pendingChanges: {
    key: string;
    value: {
      id: string;
      table: string;
      operation: 'INSERT' | 'UPDATE' | 'DELETE';
      data: any;
      timestamp: number;
    };
  };
}

let db: IDBPDatabase<AppDB>;

export async function initDB() {
  db = await openDB<AppDB>('nutrition-app', 4, {
    upgrade(db) {
      // Create stores
      if (!db.objectStoreNames.contains('diets')) {
        const dietStore = db.createObjectStore('diets', { keyPath: 'id' });
        dietStore.createIndex('by-user', 'user_id');
      }

      if (!db.objectStoreNames.contains('foods')) {
        const foodStore = db.createObjectStore('foods', { keyPath: 'id' });
        foodStore.createIndex('by-category', 'category_id');
      }

      if (!db.objectStoreNames.contains('users')) {
        db.createObjectStore('users', { keyPath: 'id' });
      }

      if (!db.objectStoreNames.contains('dietMacros')) {
        const macrosStore = db.createObjectStore('dietMacros', { keyPath: 'id' });
        macrosStore.createIndex('by-diet', 'diet_id');
      }

      if (!db.objectStoreNames.contains('waterIntakeHistory')) {
        const waterStore = db.createObjectStore('waterIntakeHistory', { keyPath: 'id' });
        waterStore.createIndex('by-user', 'user_id');
        waterStore.createIndex('by-date', 'created_at');
      }

      if (!db.objectStoreNames.contains('notifications')) {
        const notificationStore = db.createObjectStore('notifications', { keyPath: 'id' });
        notificationStore.createIndex('by-user', 'user_id');
        notificationStore.createIndex('by-read', 'read');
      }

      if (!db.objectStoreNames.contains('weightHistory')) {
        const weightStore = db.createObjectStore('weightHistory', { keyPath: 'id' });
        weightStore.createIndex('by-user', 'user_id');
        weightStore.createIndex('by-date', 'created_at');
      }

      if (!db.objectStoreNames.contains('progressPhotos')) {
        const photoStore = db.createObjectStore('progressPhotos', { keyPath: 'id' });
        photoStore.createIndex('by-user', 'user_id');
        photoStore.createIndex('by-date', 'created_at');
      }

      if (!db.objectStoreNames.contains('pendingChanges')) {
        db.createObjectStore('pendingChanges', { keyPath: 'id', autoIncrement: true });
      }
    },
  });
}

// Initialize DB when module loads
initDB().catch(console.error);

// Helper to ensure DB is initialized
async function getDB() {
  if (!db) {
    await initDB();
  }
  return db;
}

// Generic function to add pending change
async function addPendingChange(table: string, operation: 'INSERT' | 'UPDATE' | 'DELETE', data: any) {
  const db = await getDB();
  await db.add('pendingChanges', {
    id: crypto.randomUUID(),
    table,
    operation,
    data,
    timestamp: Date.now(),
  });
}

// Diet operations
export async function cacheDiet(diet: Diet) {
  const db = await getDB();
  await db.put('diets', diet);
}

export async function getCachedDiet(userId: string): Promise<Diet | undefined> {
  const db = await getDB();
  const tx = db.transaction('diets', 'readonly');
  const index = tx.store.index('by-user');
  return index.get(userId);
}

export async function updateDietOffline(diet: Diet) {
  const db = await getDB();
  await db.put('diets', diet);
  await addPendingChange('diets', 'UPDATE', diet);
}

// Food operations
export async function cacheFoods(foods: Food[]) {
  const db = await getDB();
  const tx = db.transaction('foods', 'readwrite');
  await Promise.all(foods.map(food => tx.store.put(food)));
}

export async function getCachedFoods(): Promise<Food[]> {
  const db = await getDB();
  return db.getAll('foods');
}

// User operations
export async function cacheUser(user: User) {
  const db = await getDB();
  await db.put('users', user);
}

export async function getCachedUser(userId: string): Promise<User | undefined> {
  const db = await getDB();
  return db.get('users', userId);
}

export async function updateUserOffline(user: User) {
  const db = await getDB();
  await db.put('users', user);
  await addPendingChange('users', 'UPDATE', user);
}

// Weight history operations
export async function cacheWeightHistory(records: WeightRecord[]) {
  const db = await getDB();
  const tx = db.transaction('weightHistory', 'readwrite');
  await Promise.all(records.map(record => tx.store.put(record)));
}

export async function addWeightRecordOffline(record: WeightRecord) {
  const db = await getDB();
  await db.put('weightHistory', record);
  await addPendingChange('weightHistory', 'INSERT', record);
}

// Progress photos operations
export async function cacheProgressPhotos(photos: ProgressPhoto[]) {
  const db = await getDB();
  const tx = db.transaction('progressPhotos', 'readwrite');
  await Promise.all(photos.map(photo => tx.store.put(photo)));
}

export async function addProgressPhotoOffline(photo: ProgressPhoto) {
  const db = await getDB();
  await db.put('progressPhotos', photo);
  await addPendingChange('progressPhotos', 'INSERT', photo);
}

// Sync pending changes
export async function syncPendingChanges() {
  const db = await getDB();
  const changes = await db.getAll('pendingChanges');
  
  // Sort changes by timestamp
  changes.sort((a, b) => a.timestamp - b.timestamp);
  
  for (const change of changes) {
    try {
      switch (change.operation) {
        case 'INSERT':
          await handleInsert(change.table, change.data);
          break;
        case 'UPDATE':
          await handleUpdate(change.table, change.data);
          break;
        case 'DELETE':
          await handleDelete(change.table, change.data);
          break;
      }
      
      // Remove processed change
      await db.delete('pendingChanges', change.id);
    } catch (error) {
      console.error(`Error syncing change:`, error);
      // Leave failed change in queue
      continue;
    }
  }
}

async function handleInsert(table: string, data: any) {
  const { error } = await supabase
    .from(table)
    .insert([data]);
  
  if (error) throw error;
}

async function handleUpdate(table: string, data: any) {
  const { error } = await supabase
    .from(table)
    .update(data)
    .eq('id', data.id);
  
  if (error) throw error;
}

async function handleDelete(table: string, data: any) {
  const { error } = await supabase
    .from(table)
    .delete()
    .eq('id', data.id);
  
  if (error) throw error;
}