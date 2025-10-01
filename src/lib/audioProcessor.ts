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
        
        // Create WAV blob from trimmed audio buffer
        const wavBlob = audioBufferToWav(trimmedBuffer);
        
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
          const track = await audioStorageService.saveAudioTrack(wavBlob, trackData);
          
          onProgress(100);
          resolve(track);
        } catch (error) {
          // Fallback: create track with blob URL only (no persistence)
          const audioUrl = URL.createObjectURL(wavBlob);
          
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

// Convert AudioBuffer to WAV blob
function audioBufferToWav(buffer: AudioBuffer): Blob {
  const length = buffer.length * buffer.numberOfChannels * 2 + 44;
  const arrayBuffer = new ArrayBuffer(length);
  const view = new DataView(arrayBuffer);
  const channels = [];
  let sample;
  let offset = 0;
  let pos = 0;

  // Write WAV header
  const setUint16 = (data: number) => {
    view.setUint16(pos, data, true);
    pos += 2;
  };
  
  const setUint32 = (data: number) => {
    view.setUint32(pos, data, true);
    pos += 4;
  };

  // RIFF identifier
  setUint32(0x46464952);
  // file length
  setUint32(length - 8);
  // WAVE identifier
  setUint32(0x45564157);
  // format chunk identifier
  setUint32(0x20746d66);
  // format chunk length
  setUint32(16);
  // sample format (raw)
  setUint16(1);
  // channel count
  setUint16(buffer.numberOfChannels);
  // sample rate
  setUint32(buffer.sampleRate);
  // byte rate (sample rate * block align)
  setUint32(buffer.sampleRate * 4);
  // block align (channel count * bytes per sample)
  setUint16(buffer.numberOfChannels * 2);
  // bits per sample
  setUint16(16);
  // data chunk identifier
  setUint32(0x61746164);
  // data chunk length
  setUint32(length - pos - 4);

  // Write interleaved data
  for (let i = 0; i < buffer.numberOfChannels; i++) {
    channels.push(buffer.getChannelData(i));
  }

  while (pos < length) {
    for (let i = 0; i < buffer.numberOfChannels; i++) {
      sample = Math.max(-1, Math.min(1, channels[i][offset])); // clamp
      sample = (0.5 + sample < 0 ? sample * 32768 : sample * 32767) | 0; // scale to 16-bit signed int
      view.setInt16(pos, sample, true); // write 16-bit sample
      pos += 2;
    }
    offset++; // next source sample
  }

  return new Blob([arrayBuffer], { type: 'audio/wav' });
}