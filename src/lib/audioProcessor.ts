import { Track } from "@/pages/Index";
import { audioStorageService } from "./audioStorage";

export const extractAudioFromVideo = async (
  videoFile: File,
  onProgress: (progress: number) => void
): Promise<Track> => {
  return new Promise((resolve, reject) => {
    // Create audio context
    const audioContext = new (window.AudioContext || (window as any).webkitAudioContext)();
    const fileReader = new FileReader();
    
    fileReader.onload = async (e) => {
      try {
        const arrayBuffer = e.target?.result as ArrayBuffer;
        const audioBuffer = await audioContext.decodeAudioData(arrayBuffer);
        
        // Remove last 3 seconds from audio (app requirement)
        const trimmedBuffer = trimAudioBuffer(audioContext, audioBuffer, 3);
        
        // Convert to compressed format using MediaRecorder
        const compressedBlob = await audioBufferToCompressed(audioContext, trimmedBuffer);
        
        try {
          // Create basic track data (without thumbnailUrl)
          const trackData = {
            id: crypto.randomUUID(),
            title: videoFile.name.replace(/\.[^/.]+$/, ""), // Remove extension
            duration: trimmedBuffer.duration,
            originalFileName: videoFile.name,
            createdAt: new Date()
          };
          
          // Save audio file to local storage and get complete track
          const track = await audioStorageService.saveAudioTrack(compressedBlob, trackData);
          
          onProgress(100);
          resolve(track);
        } catch (error) {
          // Fallback: create track with blob URL only (no persistence)
          const audioUrl = URL.createObjectURL(compressedBlob);
          
          const track: Track = {
            id: crypto.randomUUID(),
            title: videoFile.name.replace(/\.[^/.]+$/, ""),
            duration: trimmedBuffer.duration,
            audioUrl,
            originalFileName: videoFile.name,
            createdAt: new Date()
          };
          
          onProgress(100);
          resolve(track);
        }
      } catch (error) {
        reject(error);
      }
    };
    
    fileReader.onerror = () => reject(new Error('File reading failed'));
    
    // Simulate progress
    let progress = 0;
    const progressInterval = setInterval(() => {
      progress += 10;
      onProgress(Math.min(progress, 90));
      if (progress >= 90) {
        clearInterval(progressInterval);
      }
    }, 200);
    
    fileReader.readAsArrayBuffer(videoFile);
  });
};

// Trim audio buffer by removing specified seconds from the end
function trimAudioBuffer(audioContext: AudioContext, buffer: AudioBuffer, secondsToRemove: number): AudioBuffer {
  const sampleRate = buffer.sampleRate;
  const samplesToRemove = Math.floor(secondsToRemove * sampleRate);
  const newLength = Math.max(0, buffer.length - samplesToRemove);
  
  // If the audio is shorter than the trim amount, return a minimal buffer
  if (newLength <= 0) {
    return audioContext.createBuffer(buffer.numberOfChannels, sampleRate, sampleRate);
  }
  
  const trimmedBuffer = audioContext.createBuffer(
    buffer.numberOfChannels,
    newLength,
    sampleRate
  );
  
  // Copy the trimmed audio data
  for (let channel = 0; channel < buffer.numberOfChannels; channel++) {
    const sourceData = buffer.getChannelData(channel);
    const trimmedData = trimmedBuffer.getChannelData(channel);
    
    for (let i = 0; i < newLength; i++) {
      trimmedData[i] = sourceData[i];
    }
  }
  
  return trimmedBuffer;
}

// Convert AudioBuffer to compressed format using MediaRecorder
async function audioBufferToCompressed(audioContext: AudioContext, buffer: AudioBuffer): Promise<Blob> {
  return new Promise((resolve, reject) => {
    // Create an offline audio context to render the buffer
    const offlineContext = new OfflineAudioContext(
      buffer.numberOfChannels,
      buffer.length,
      buffer.sampleRate
    );
    
    // Create a buffer source
    const source = offlineContext.createBufferSource();
    source.buffer = buffer;
    
    // Create a destination for MediaRecorder
    const destination = audioContext.createMediaStreamDestination();
    
    // Try different MIME types in order of preference (best compression)
    const mimeTypes = [
      'audio/webm;codecs=opus',  // Best compression, widely supported
      'audio/webm',
      'audio/ogg;codecs=opus',
      'audio/mp4'
    ];
    
    let selectedMimeType = mimeTypes.find(type => MediaRecorder.isTypeSupported(type));
    
    if (!selectedMimeType) {
      reject(new Error('No supported audio codec found'));
      return;
    }
    
    // Create MediaRecorder with the best available codec
    const mediaRecorder = new MediaRecorder(destination.stream, {
      mimeType: selectedMimeType,
      audioBitsPerSecond: 128000  // 128 kbps - good quality, reasonable size
    });
    
    const audioChunks: Blob[] = [];
    
    mediaRecorder.ondataavailable = (event) => {
      if (event.data.size > 0) {
        audioChunks.push(event.data);
      }
    };
    
    mediaRecorder.onstop = () => {
      const audioBlob = new Blob(audioChunks, { type: selectedMimeType });
      resolve(audioBlob);
    };
    
    mediaRecorder.onerror = (event) => {
      reject(new Error('MediaRecorder error: ' + event));
    };
    
    // Connect and start recording
    const realSource = audioContext.createBufferSource();
    realSource.buffer = buffer;
    realSource.connect(destination);
    
    mediaRecorder.start();
    realSource.start(0);
    
    // Stop recording when buffer finishes playing
    realSource.onended = () => {
      mediaRecorder.stop();
    };
  });
}