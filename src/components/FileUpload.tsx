import { useCallback, useState } from "react";
import { useDropzone } from "react-dropzone";
import { Upload, Film, Loader2 } from "lucide-react";
import { Capacitor } from "@capacitor/core";
import { FilePicker } from "@capawesome/capacitor-file-picker";
import { Button } from "@/components/ui/button";
import { Progress } from "@/components/ui/progress";
import { extractAudioFromVideo } from "@/lib/audioProcessor";
import { Track } from "@/pages/Index";

const isNative = Capacitor.isNativePlatform();

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

  const processQueue = async (files: File[]) => {
    if (files.length === 0) return;
    setIsProcessing(true);
    setQueueTotal(files.length);

    for (let i = 0; i < files.length; i++) {
      const file = files[i];
      setQueueIndex(i + 1);
      setCurrentFileName(file.name);
      setProgress(0);
      try {
        const track = await extractAudioFromVideo(file, (p) => setProgress(p));
        onTrackExtracted(track);
      } catch (error) {
        console.error('Error processing video:', file.name, error);
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
    try {
      const result = await FilePicker.pickVideos({ readData: false, limit: 1 });
      const picked = result.files?.[0];
      if (!picked) return;

      const src = picked.path ? Capacitor.convertFileSrc(picked.path) : null;
      if (!src) throw new Error('No file path returned');

      const response = await fetch(src);
      const blob = await response.blob();
      const file = new File([blob], picked.name || 'video.mp4', {
        type: picked.mimeType || 'video/mp4',
      });

      await processQueue([file]);
    } catch (error: any) {
      const msg = String(error?.message || error);
      if (msg.toLowerCase().includes('cancel')) return;
      console.error('Native video picker error:', error);
    }
  };

  const onDrop = useCallback((acceptedFiles: File[]) => {
    if (acceptedFiles && acceptedFiles.length > 0) {
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
        <input {...getInputProps()} />
        
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