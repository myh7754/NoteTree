import { useEffect, useState } from 'react';
import { getStorageUsed, STORAGE_CHANGED } from '../db/storage';

/**
 * 클라우드에 쓴 용량(바이트). 로그인하지 않았거나 읽지 못하면 null.
 * 처음 한 번 읽고, 올리기·동기화가 끝날 때마다 다시 읽는다.
 */
export function useStorageUsed(): number | null {
  const [used, setUsed] = useState<number | null>(null);
  useEffect(() => {
    let alive = true;
    const read = () =>
      getStorageUsed()
        .then((v) => alive && setUsed(v))
        .catch(() => alive && setUsed(null));
    read();
    window.addEventListener(STORAGE_CHANGED, read);
    return () => {
      alive = false;
      window.removeEventListener(STORAGE_CHANGED, read);
    };
  }, []);
  return used;
}
