import { openDB, DBSchema, IDBPDatabase } from 'idb';
import { ParabolicRallyAnalysis } from './parabolicRallyEngine';

interface ParabolicDB extends DBSchema {
  daily_hits: {
    key: string;
    value: {
      date: string;
      updatedAt: number;
      hits: ParabolicRallyAnalysis[];
    };
  };
}

let dbPromise: Promise<IDBPDatabase<ParabolicDB>> | null = null;

if (typeof window !== 'undefined') {
  dbPromise = openDB<ParabolicDB>('parabolic-rally-db', 1, {
    upgrade(db) {
      if (!db.objectStoreNames.contains('daily_hits')) {
        db.createObjectStore('daily_hits', { keyPath: 'date' });
      }
    },
  });
}

export async function saveDailyHits(date: string, hits: ParabolicRallyAnalysis[]) {
  if (!dbPromise || !date) return;
  const db = await dbPromise;
  
  // Filter for only strong hits to save space (score >= 9)
  const strongHits = hits.filter(h => h.score >= 9);
  
  if (strongHits.length === 0) return;
  
  await db.put('daily_hits', {
    date,
    updatedAt: Date.now(),
    hits: strongHits
  });
}

export async function getHistoricalHits() {
  if (!dbPromise) return [];
  const db = await dbPromise;
  const allRecords = await db.getAll('daily_hits');
  
  // Sort from recent to past (by date descending)
  return allRecords.sort((a, b) => b.date.localeCompare(a.date));
}
