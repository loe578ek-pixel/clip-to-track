/**
 * TikTok outro recognition by audio fingerprint.
 *
 * Every downloaded TikTok ends with the same jingle (identical waveform across
 * the supplied samples, normalized correlation >= 0.978). We search for that
 * exact sound in the last seconds of the track with an FFT cross-correlation.
 * When it is found, audio and video are cut slightly before it so neither the
 * beep nor the logo end card remain. When it is not found, nothing is cut.
 */
import { OUTRO_REFERENCE_B64, OUTRO_REFERENCE_RATE } from './outroReference';

export interface AudioBufferLike {
  duration: number;
  sampleRate: number;
  numberOfChannels?: number;
  getChannelData(channel: number): Float32Array;
}

export const ANALYSIS_RATE = OUTRO_REFERENCE_RATE;
/** Only the end of the track is searched. */
export const OUTRO_SEARCH_SECONDS = 8;
/** Minimum normalized correlation to accept a match. Real matches score >= 0.97, music ~0.25. */
export const OUTRO_MATCH_THRESHOLD = 0.8;
/** The logo end card can appear up to ~0.35 s before the jingle; cut this much earlier. */
export const OUTRO_VISUAL_LEAD_SECONDS = 0.45;
/** The jingle always sits near the very end of the file. */
const OUTRO_MIN_FROM_END = 0.5;
const OUTRO_MAX_FROM_END = 6.5;

let cachedReference: Float64Array | null = null;

function decodeReference(): Float64Array {
  if (cachedReference) return cachedReference;
  const bin = typeof atob === 'function'
    ? atob(OUTRO_REFERENCE_B64)
    : Buffer.from(OUTRO_REFERENCE_B64, 'base64').toString('binary');
  const ref = new Float64Array(bin.length);
  let mean = 0;
  for (let i = 0; i < bin.length; i++) {
    const b = bin.charCodeAt(i);
    ref[i] = (b > 127 ? b - 256 : b) / 127;
    mean += ref[i];
  }
  mean /= ref.length;
  for (let i = 0; i < ref.length; i++) ref[i] -= mean;
  cachedReference = ref;
  return ref;
}

/** Mixes to mono and resamples [startSec, end] to ANALYSIS_RATE with box-filter anti-aliasing. */
export function downsampleTail(buffer: AudioBufferLike, startSec: number, targetRate = ANALYSIS_RATE): Float64Array {
  const sr = buffer.sampleRate;
  const channels = Math.max(1, Math.min(2, buffer.numberOfChannels ?? 1));
  const data = [buffer.getChannelData(0)];
  if (channels > 1) data.push(buffer.getChannelData(1));
  const total = data[0].length;
  const startSample = Math.max(0, Math.floor(startSec * sr));
  const ratio = sr / targetRate;
  const outLen = Math.max(0, Math.floor((total - startSample) / ratio));
  const out = new Float64Array(outLen);
  for (let o = 0; o < outLen; o++) {
    const a = startSample + Math.floor(o * ratio);
    const b = Math.min(total, startSample + Math.floor((o + 1) * ratio));
    let sum = 0;
    for (let i = a; i < b; i++) {
      let v = data[0][i];
      if (channels > 1) v = (v + data[1][i]) * 0.5;
      sum += v;
    }
    out[o] = b > a ? sum / (b - a) : 0;
  }
  return out;
}

function fft(re: Float64Array, im: Float64Array, inverse: boolean) {
  const n = re.length;
  for (let i = 1, j = 0; i < n; i++) {
    let bit = n >> 1;
    for (; j & bit; bit >>= 1) j ^= bit;
    j ^= bit;
    if (i < j) {
      let t = re[i]; re[i] = re[j]; re[j] = t;
      t = im[i]; im[i] = im[j]; im[j] = t;
    }
  }
  for (let len = 2; len <= n; len <<= 1) {
    const ang = (2 * Math.PI / len) * (inverse ? 1 : -1);
    const wr = Math.cos(ang), wi = Math.sin(ang);
    const half = len >> 1;
    for (let i = 0; i < n; i += len) {
      let cr = 1, ci = 0;
      for (let k = 0; k < half; k++) {
        const a = i + k, b = a + half;
        const xr = re[b] * cr - im[b] * ci;
        const xi = re[b] * ci + im[b] * cr;
        re[b] = re[a] - xr; im[b] = im[a] - xi;
        re[a] += xr; im[a] += xi;
        const ncr = cr * wr - ci * wi;
        ci = cr * wi + ci * wr;
        cr = ncr;
      }
    }
  }
  if (inverse) for (let i = 0; i < n; i++) { re[i] /= n; im[i] /= n; }
}

export interface OutroMatch {
  /** Best normalized correlation in the searched zone (0..1). */
  score: number;
  /** Time (seconds, from track start) where the reference jingle begins. */
  time: number;
}

/** Finds the best match of the TikTok jingle in the last OUTRO_SEARCH_SECONDS. */
export function findOutroJingle(buffer: AudioBufferLike): OutroMatch | null {
  const duration = buffer.duration;
  if (!Number.isFinite(duration) || !Number.isFinite(buffer.sampleRate) || buffer.sampleRate <= 0) return null;
  const ref = decodeReference();
  const searchStart = Math.max(0, duration - OUTRO_SEARCH_SECONDS);
  const x = downsampleTail(buffer, searchStart);
  const m = ref.length;
  if (x.length < m + 1) return null;

  let n = 1;
  while (n < x.length + m) n <<= 1;
  const xr = new Float64Array(n), xi = new Float64Array(n);
  const rr = new Float64Array(n), ri = new Float64Array(n);
  xr.set(x);
  rr.set(ref);
  fft(xr, xi, false);
  fft(rr, ri, false);
  for (let k = 0; k < n; k++) {
    // X * conj(R)
    const a = xr[k], b = xi[k], c = rr[k], d = -ri[k];
    xr[k] = a * c - b * d;
    xi[k] = a * d + b * c;
  }
  fft(xr, xi, true);

  let refEnergy = 0;
  for (let i = 0; i < m; i++) refEnergy += ref[i] * ref[i];
  const refNorm = Math.sqrt(refEnergy);
  if (refNorm === 0) return null;

  // Sliding window energy of x.
  const cum = new Float64Array(x.length + 1);
  for (let i = 0; i < x.length; i++) cum[i + 1] = cum[i] + x[i] * x[i];

  let best = 0, bestLag = -1;
  for (let lag = 0; lag + m <= x.length; lag++) {
    const energy = cum[lag + m] - cum[lag];
    if (energy < 1e-6) continue;
    const score = xr[lag] / (refNorm * Math.sqrt(energy));
    if (score > best) { best = score; bestLag = lag; }
  }
  if (bestLag < 0) return null;
  return { score: best, time: searchStart + bestLag / ANALYSIS_RATE };
}

/**
 * Returns the time where the real music ends. Cuts only when the exact TikTok
 * jingle is recognized near the end; otherwise returns the full duration.
 * The same endpoint is used for the audio and the background video.
 */
export function detectOutroEndTime(buffer: AudioBufferLike): number {
  const duration = buffer.duration;
  const match = findOutroJingle(buffer);
  if (!match || match.score < OUTRO_MATCH_THRESHOLD) return duration;
  const fromEnd = duration - match.time;
  if (fromEnd < OUTRO_MIN_FROM_END || fromEnd > OUTRO_MAX_FROM_END) return duration;
  const cut = match.time - OUTRO_VISUAL_LEAD_SECONDS;
  if (cut < 1) return duration;
  return cut;
}
