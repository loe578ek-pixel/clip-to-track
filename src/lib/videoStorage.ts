import { Capacitor } from '@capacitor/core';
import { Directory, Filesystem } from '@capacitor/filesystem';
import { normalizeNativeFilePath } from './importDiagnostics';

const VIDEO_DIRECTORY = 'tkplaylist-video';
const DATABASE = 'tkplaylist-video';
const STORE = 'videos';

async function openDatabase(): Promise<IDBDatabase> {
  return new Promise((resolve, reject) => {
    const request = indexedDB.open(DATABASE, 1);
    request.onupgradeneeded = () => request.result.createObjectStore(STORE);
    request.onsuccess = () => resolve(request.result);
    request.onerror = () => reject(request.error ?? new Error('Video storage unavailable'));
  });
}

async function videoRequest<T>(mode: IDBTransactionMode, operation: (store: IDBObjectStore) => IDBRequest<T>): Promise<T> {
  const database = await openDatabase();
  try {
    return await new Promise<T>((resolve, reject) => {
      const transaction = database.transaction(STORE, mode);
      const request = operation(transaction.objectStore(STORE));
      transaction.oncomplete = () => resolve(request.result);
      transaction.onerror = () => reject(transaction.error ?? new Error('Video storage failed'));
      transaction.onabort = () => reject(transaction.error ?? new Error('Video storage interrupted'));
    });
  } finally {
    database.close();
  }
}

export const videoStorage = {
  async save(file: File, trackId: string, nativeSourcePath?: string): Promise<string> {
    const extension = file.name.match(/\.([a-z0-9]{1,8})$/i)?.[1] ?? 'mp4';
    const path = `${VIDEO_DIRECTORY}/${trackId}.${extension}`;
    if (Capacitor.isNativePlatform()) {
      if (!nativeSourcePath) throw new Error('Original video path is unavailable');
      try {
        await Filesystem.mkdir({ path: VIDEO_DIRECTORY, directory: Directory.Data, recursive: true });
      } catch {
        // Accept only an existing directory; surface real storage/permission errors.
        const existing = await Filesystem.stat({ path: VIDEO_DIRECTORY, directory: Directory.Data });
        if (existing.type !== 'directory') throw new Error('Video storage path is not a directory');
      }
      await Filesystem.copy({ from: normalizeNativeFilePath(nativeSourcePath), to: path, toDirectory: Directory.Data });
    } else {
      await videoRequest('readwrite', store => store.put(file, path));
    }
    return path;
  },

  async resolve(path: string): Promise<string> {
    if (Capacitor.isNativePlatform()) {
      const { uri } = await Filesystem.getUri({ path, directory: Directory.Data });
      return Capacitor.convertFileSrc(uri);
    }
    const blob = await videoRequest<Blob | undefined>('readonly', store => store.get(path));
    if (!(blob instanceof Blob)) throw new Error('Original video is no longer available');
    return URL.createObjectURL(blob);
  },

  release(url?: string) {
    if (url?.startsWith('blob:')) URL.revokeObjectURL(url);
  },

  async delete(path: string): Promise<void> {
    if (Capacitor.isNativePlatform()) {
      await Filesystem.deleteFile({ path, directory: Directory.Data });
    } else {
      await videoRequest('readwrite', store => store.delete(path));
    }
  },

  async clear(): Promise<void> {
    if (Capacitor.isNativePlatform()) {
      try {
        await Filesystem.rmdir({ path: VIDEO_DIRECTORY, directory: Directory.Data, recursive: true });
      } catch (error) {
        // Missing directory is normal when no videos have been retained.
        const message = String((error as { message?: string })?.message ?? error);
        if (!/not exist|not found|no such|doesn't exist/i.test(message)) throw error;
      }
    } else {
      await videoRequest('readwrite', store => store.clear());
    }
  },

  async stats(): Promise<{ files: number; bytes: number }> {
    if (Capacitor.isNativePlatform()) {
      try {
        const { files } = await Filesystem.readdir({ path: VIDEO_DIRECTORY, directory: Directory.Data });
        return { files: files.length, bytes: files.reduce((total, file) => total + file.size, 0) };
      } catch {
        return { files: 0, bytes: 0 };
      }
    }
    const files = await videoRequest<Blob[]>('readonly', store => store.getAll());
    return { files: files.length, bytes: files.reduce((total, file) => total + file.size, 0) };
  },
};