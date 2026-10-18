export type ImportStage = 'File selection' | 'Native video copy' | 'Video storage' | 'Reading video for audio extraction' | 'Audio decoding' | 'Audio encoding' | 'Audio saving' | 'Thumbnail generation';

const EVENT = 'tkplaylist-import-diagnostic';

function errorMessage(error: unknown): string {
  if (error instanceof Error) return error.message;
  if (typeof error === 'object' && error !== null) {
    const detail = error as { message?: unknown; code?: unknown };
    return `${String(detail.message ?? JSON.stringify(error))}${detail.code ? ` (code: ${String(detail.code)})` : ''}`;
  }
  return String(error);
}

export class ImportStageError extends Error {
  constructor(public stage: ImportStage, public originalError: unknown) {
    super(`${stage}: ${errorMessage(originalError)}`);
    this.name = 'ImportStageError';
  }
}

export function reportImportDiagnostic(error: unknown, stage?: ImportStage): string {
  const message = stage && !(error instanceof ImportStageError)
    ? new ImportStageError(stage, error).message : errorMessage(error);
  console.error(`[Import diagnostic] ${message}`, error);
  if (typeof window !== 'undefined') window.dispatchEvent(new CustomEvent(EVENT, { detail: message }));
  return message;
}

export function subscribeImportDiagnostics(listener: (message: string) => void): () => void {
  const handler = (event: Event) => listener((event as CustomEvent<string>).detail);
  window.addEventListener(EVENT, handler);
  return () => window.removeEventListener(EVENT, handler);
}

export async function runImportStage<T>(stage: ImportStage, operation: () => Promise<T>): Promise<T> {
  try { return await operation(); } catch (error) {
    throw error instanceof ImportStageError ? error : new ImportStageError(stage, error);
  }
}

export async function runOptionalImportStage<T>(stage: ImportStage, operation: () => Promise<T>): Promise<T | undefined> {
  try { return await runImportStage(stage, operation); } catch (error) {
    reportImportDiagnostic(error);
    return undefined;
  }
}

// Filesystem accepts absolute file URLs; never pass a WebView-converted URL to copy().
export function normalizeNativeFilePath(path: string): string {
  if (path.startsWith('/')) return new URL(`file://${path}`).href;
  if (/^file:\/\//i.test(path)) return new URL(path).href;
  if (/^content:\/\//i.test(path)) return path;
  throw new Error('The picker did not return an absolute native file path');
}