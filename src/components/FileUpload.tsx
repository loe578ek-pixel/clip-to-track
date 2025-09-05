import { useCallback, useState } from "react";
import { useDropzone } from "react-dropzone";
import { Upload, Film, Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Progress } from "@/components/ui/progress";
import { extractAudioFromVideo } from "@/lib/audioProcessor";
import { Track } from "@/pages/Index";

interface FileUploadProps {
  onTrackExtracted: (track: Track) => void;
  isProcessing: boolean;
  setIsProcessing: (processing: boolean) => void;
}

export const FileUpload = ({ onTrackExtracted, isProcessing, setIsProcessing }: FileUploadProps) => {
  const [progress, setProgress] = useState(0);
  const [currentFileName, setCurrentFileName] = useState("");

  const processVideoFile = async (file: File) => {
    setIsProcessing(true);
    setCurrentFileName(file.name);
    setProgress(0);

    try {
      const track = await extractAudioFromVideo(file, (progress) => {
        setProgress(progress);
      });
      
      onTrackExtracted(track);
    } catch (error) {
      console.error('Error processing video:', error);
    } finally {
      setIsProcessing(false);
      setProgress(0);
      setCurrentFileName("");
    }
  };

  const onDrop = useCallback((acceptedFiles: File[]) => {
    const videoFile = acceptedFiles[0];
    if (videoFile) {
      processVideoFile(videoFile);
    }
  }, []);

  const { getRootProps, getInputProps, isDragActive } = useDropzone({
    onDrop,
    accept: {
      'video/*': ['.mp4', '.avi', '.mov', '.mkv', '.webm', '.m4v']
    },
    maxFiles: 1,
    disabled: isProcessing
  });

  return (
    <div className="w-full">
      <div
        {...getRootProps()}
        className={`
          relative border-2 border-dashed rounded-xl p-12 text-center cursor-pointer
          transition-all duration-300 hover:scale-[1.02]
          ${isDragActive ? 'border-primary bg-primary/5' : 'border-glass hover:border-primary/50'}
          ${isProcessing ? 'cursor-not-allowed opacity-50' : ''}
        `}
      >
        <input {...getInputProps()} />
        
        <div className="flex flex-col items-center space-y-4">
          {isProcessing ? (
            <>
              <div className="relative">
                <Loader2 className="h-16 w-16 text-primary animate-spin" />
                <div className="absolute inset-0 bg-gradient-primary rounded-full opacity-20 animate-pulse" />
              </div>
              <div className="space-y-2 w-full max-w-sm">
                <p className="text-lg font-medium">Processing {currentFileName}</p>
                <Progress value={progress} className="w-full" />
                <p className="text-sm text-muted-foreground">{Math.round(progress)}% complete</p>
              </div>
            </>
          ) : (
            <>
              <div className="relative">
                <div className="p-4 bg-gradient-primary rounded-full shadow-glow">
                  <Film className="h-12 w-12 text-white" />
                </div>
                <Upload className="absolute -top-2 -right-2 h-6 w-6 text-primary" />
              </div>
              
              <div className="space-y-2">
                <h3 className="text-xl font-semibold">
                  {isDragActive ? "Drop your video here" : "Upload Video File"}
                </h3>
                <p className="text-muted-foreground">
                  Drag & drop a video file or click to select
                </p>
                <p className="text-sm text-muted-foreground">
                  Supports MP4, AVI, MOV, MKV, WebM, M4V
                </p>
              </div>
              
              <Button 
                variant="outline" 
                className="mt-4 border-primary/20 hover:bg-primary/10"
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