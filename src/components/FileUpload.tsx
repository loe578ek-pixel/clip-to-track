import { useCallback, useEffect, useState } from "react";
import { useDropzone } from "react-dropzone";
import { Upload, Film, Loader2 } from "lucide-react";
import { Capacitor } from "@capacitor/core";
import { Filesystem } from "@capacitor/filesystem";
import { FilePicker } from "@capawesome/capacitor-file-picker";
import { Button } from "@/components/ui/button";
import { Progress } from "@/components/ui/progress";
import { extractAudioFromVideo } from "@/lib/audioProcessor";
import { Track } from "@/pages/Index";
import { toast } from "sonner";
import { normalizeNativeFilePath, reportImportDiagnostic, runImportStage, subscribeImportDiagnostics } from '@/lib/importDiagnostics';

const isNative = Capacitor.isNativePlatform();

function describeError(error: unknown): string {
  if (error instanceof Error) return `${error.name}: ${error.message}`;
  if (typeof error === 'object' && error !== null) {
    const detail = error as { message?: unknown; code?: unknown };
    return `${String(detail.message ?? JSON.stringify(error))}${detail.code ? ` (code: ${String(detail.code)})` : ''}`;
  }
  return String(error);
}

function base64ToBlob(base64: string, mimeType: string): Blob {
  const binary = atob(base64);
  const bytes = new Uint8Array(binary.length);
  for (let i = 0; i < binary.length; i++) bytes[i] = binary.charCodeAt(i);
  return new Blob([bytes], { type: mimeType });
}

function blobToBase64(blob: Blob): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(String(reader.result).split(',')[1] ?? '');
    reader.onerror = () => reject(reader.error ?? new Error('Could not convert video data'));
    reader.readAsDataURL(blob);
  });
}

interface FileUploadProps {
  onTrackExtracted: (track: Track) => void;
  isProcessing: boolean;
  setIsProcessing: (processing: boolean) => void;
}

export const FileUpload = ({ onTrackExtracted, isProcessing, setIsProcessing }: FileUploadProps) => {
  const [progress, setProgress] = useState(0);
  const [currentFileName, setCurrentFileName] = useState("");
  const [queueTotal, setQueueTotal] = useState(0);
  const [queueIndex, setQueueIndex] = useState(0);
  const [diagnostics, setDiagnostics] = useState<string[]>([]);
  useEffect(() => subscribeImportDiagnostics(message => {
    setDiagnostics(previous => [...previous.slice(-4), message]);
  }), []);

  const processQueue = async (files: File[], nativeSourcePath?: string) => {
    if (files.length === 0) return;
    setIsProcessing(true);
    setQueueTotal(files.length);

    for (let i = 0; i < files.length; i++) {
      const file = files[i];
      setQueueIndex(i + 1);
      setCurrentFileName(file.name);
      setProgress(0);
      try {
        const track = await extractAudioFromVideo(file, (p) => setProgress(p), nativeSourcePath);
        onTrackExtracted(track);
      } catch (error) {
        console.error('Error processing video:', file.name, error);
        toast.error(reportImportDiagnostic(error), { duration: 15000 });
      }
      // Give the WebView a beat to release memory between videos (iOS)
      await new Promise((r) => setTimeout(r, 300));
    }

    setIsProcessing(false);
    setProgress(0);
    setCurrentFileName("");
    setQueueTotal(0);
    setQueueIndex(0);
  };

  // Native (iOS/Android): use the system video picker (gallery only, no camera)
  const pickNativeVideo = async () => {
    if (isProcessing) return;
    setDiagnostics([]);
    setIsProcessing(true);
    try {
      const result = await runImportStage('File selection', () => FilePicker.pickVideos({ readData: false, limit: 1 }));
      const picked = result.files?.[0];
      if (!picked) return;

      const file = await runImportStage('Reading video for audio extraction', async () => {
        if (!picked.path) throw new Error('No file path returned by the video picker');
        const nativePath = normalizeNativeFilePath(picked.path);
        try {
          // iOS WKWebView rejects fetch() on convertFileSrc URLs (HTTP 0): read via the native bridge instead.
          const { data } = await Filesystem.readFile({ path: nativePath });
          const base64 = typeof data === 'string' ? data : await blobToBase64(data);
          const blob = base64ToBlob(base64, picked.mimeType || 'video/mp4');
          return new File([blob], picked.name || 'video.mp4', {
            type: picked.mimeType || 'video/mp4',
          });
        } catch (error) {
          const size = picked.size != null ? `${picked.size} bytes` : 'unknown size';
          throw new Error(`Could not read "${nativePath}" (${size}): ${describeError(error)}`);
        }
      });

      await processQueue([file], picked.path);
    } catch (error: unknown) {
      const msg = error instanceof Error ? error.message : String(error);
      if (msg.toLowerCase().includes('cancel')) return;
      console.error('Native video picker error:', error);
      toast.error(reportImportDiagnostic(error), { duration: 15000 });
    } finally {
      setIsProcessing(false);
    }
  };

  const onDrop = useCallback((acceptedFiles: File[]) => {
    if (acceptedFiles && acceptedFiles.length > 0) {
      setDiagnostics([]);
      processQueue(acceptedFiles);
    }
  }, []);

  const { getRootProps, getInputProps, isDragActive } = useDropzone({
    onDrop,
    accept: {
      'video/*': ['.mp4', '.avi', '.mov', '.mkv', '.webm', '.m4v']
    },
    multiple: true,
    disabled: isProcessing || isNative
  });

  const rootProps = isNative
    ? { onClick: pickNativeVideo }
    : getRootProps();

  return (
    <div className="w-full">
      {diagnostics.length > 0 && (
        <div role="alert" className="mb-4 space-y-2 rounded-md border border-destructive/50 bg-card p-3 text-sm text-foreground select-text">
          <p className="font-semibold">Import diagnostics (temporary)</p>
          {diagnostics.map((message, index) => <p key={index} className="whitespace-pre-wrap break-words">{message}</p>)}
        </div>
      )}
      <div
        {...rootProps}
        className={`
          relative overflow-hidden rounded-2xl p-10 text-center cursor-pointer
          transition-all duration-300
          bg-gradient-to-br from-primary/10 via-card to-card
          border border-white/[0.06]
          shadow-[inset_0_1px_0_0_hsl(var(--primary)/0.08)]
          hover:border-primary/40 hover:shadow-[0_8px_30px_-10px_hsl(var(--primary)/0.4)]
          ${isDragActive ? 'border-primary/60 bg-primary/10 scale-[1.01]' : ''}
          ${isProcessing ? 'cursor-not-allowed opacity-60' : ''}
        `}
      >
        {/* Decorative glow */}
        <div className="pointer-events-none absolute -top-16 -right-16 w-48 h-48 rounded-full bg-primary/20 blur-3xl" />
        <div className="pointer-events-none absolute -bottom-20 -left-10 w-40 h-40 rounded-full bg-primary/10 blur-3xl" />
        {!isNative && <input {...getInputProps()} />}
        
        <div className="flex flex-col items-center space-y-4">
          {isProcessing ? (
            <>
              <div className="relative">
                <Loader2 className="h-16 w-16 text-primary animate-spin" />
                <div className="absolute inset-0 bg-gradient-primary rounded-full opacity-20 animate-pulse" />
              </div>
              <div className="space-y-2 w-full max-w-sm">
                <p className="text-lg font-medium truncate">Processing {currentFileName}</p>
                <Progress value={progress} className="w-full" />
                <p className="text-sm text-muted-foreground">
                  {Math.round(progress)}% complete{queueTotal > 1 ? ` • ${queueIndex}/${queueTotal}` : ''}
                </p>
              </div>
            </>
          ) : (
            <>
              <div className="relative">
                <div className="p-5 bg-gradient-to-br from-primary to-primary/60 rounded-2xl shadow-[0_10px_40px_-10px_hsl(var(--primary)/0.6)]">
                  <Film className="h-10 w-10 text-primary-foreground" />
                </div>
                <div className="absolute -top-1.5 -right-1.5 p-1.5 bg-card rounded-full border border-primary/40">
                  <Upload className="h-3.5 w-3.5 text-primary" />
                </div>
              </div>

              <div className="space-y-1.5">
                <h3 className="text-xl font-semibold tracking-tight">
                  {isDragActive ? "Drop your video here" : "Add a video"}
                </h3>
                <p className="text-sm text-muted-foreground">
                  Drag & drop or pick a file to extract the audio
                </p>
                <p className="text-[11px] text-muted-foreground/70 uppercase tracking-wider pt-1">
                  MP4 · MOV · MKV · WEBM · AVI · M4V
                </p>
              </div>

              <Button
                size="lg"
                className="mt-2 rounded-full px-6 bg-primary hover:bg-primary/90 text-primary-foreground shadow-[0_6px_20px_-6px_hsl(var(--primary)/0.6)]"
              >
                <Upload className="mr-2 h-4 w-4" />
                Choose File
              </Button>
            </>
          )}
        </div>
      </div>
    </div>
  );
};