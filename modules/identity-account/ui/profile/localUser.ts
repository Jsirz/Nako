import type * as React from 'react';
import { preferenceStorage } from '../../../project/api/ui/persistence/preferenceStore';

// The same-device sync profile used this key; keeping it carries names and avatar colours over.
const LOCAL_USER_KEY = 'nako-collab-user';

export interface LocalUser {
  id: string;
  no: string;
  name: string;
}

function numberLabel(value: unknown) {
  if (typeof value === 'number' && Number.isFinite(value)) return String(Math.trunc(value));
  return typeof value === 'string' ? (value.trim().match(/(\d+)$/)?.[1] ?? '') : '';
}

/** Display-only profile of the person at this canvas; authentication never reads it. */
export function readLocalUser(storage = preferenceStorage()): LocalUser {
  try {
    const stored = JSON.parse(storage.getItem(LOCAL_USER_KEY) || 'null');
    if (stored && typeof stored === 'object') {
      return {
        id: typeof stored.id === 'string' && stored.id ? stored.id : 'local',
        no: numberLabel(stored.no) || numberLabel(stored.name) || numberLabel(stored.id) || '1',
        name: typeof stored.name === 'string' ? stored.name : '',
      };
    }
  } catch {
    // A malformed preference must not prevent entering the canvas.
  }
  return { id: 'local', no: '1', name: '' };
}

export function useLocalUser(R: Pick<typeof React, 'useState' | 'useCallback' | 'useEffect'>) {
  const [user, setUser] = R.useState(() => readLocalUser());
  const setName = R.useCallback((value: string) => {
    const next = { ...readLocalUser(), name: String(value ?? '').slice(0, 64) };
    preferenceStorage().setItem(LOCAL_USER_KEY, JSON.stringify(next));
    setUser(next);
  }, []);
  return { ...user, setName };
}
