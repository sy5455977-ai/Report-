import fs from 'fs';
import path from 'path';
import { BLACK_TALKING_MP4_BASE64 } from './blackTalkingData';
import { BLACK_SUNNA_MP4_BASE64 } from './blackSunnaData';
import { BELL_TALKING_MP4_BASE64 } from './bellTalkingData';
import { BELL_SUNNA_MP4_BASE64 } from './bellSunnaData';
import { BELL_TALKING_1_MP4_BASE64 } from './bellTalking1Data';

export interface EmbeddedVideoAsset {
  filename: string;
  personality: 'black' | 'bell';
  type: 'talking' | 'sunna';
  base64: string;
}

export const EMBEDDED_VIDEOS: Record<string, string> = {
  'black_talking.mp4': BLACK_TALKING_MP4_BASE64,
  'black_sunna.mp4': BLACK_SUNNA_MP4_BASE64,
  'talking.mp4': BELL_TALKING_MP4_BASE64,
  'sunna.mp4': BELL_SUNNA_MP4_BASE64,
  'talking_1.mp4': BELL_TALKING_1_MP4_BASE64,
};

// Cached decoded Buffers for high-speed streaming
const bufferCache: Map<string, Buffer> = new Map();

export function getVideoBuffer(filename: string): Buffer | null {
  const cleanName = path.basename(filename);
  if (bufferCache.has(cleanName)) {
    return bufferCache.get(cleanName)!;
  }
  const b64 = EMBEDDED_VIDEOS[cleanName];
  if (!b64) return null;
  const buf = Buffer.from(b64, 'base64');
  bufferCache.set(cleanName, buf);
  return buf;
}

/**
 * Ensures that all 5 essential MP4 videos exist in the public/videos directory.
 * Even after Google AI Studio Remix or cold container spinup, this recreates the
 * physical MP4 files from the embedded source code.
 */
export function ensureDefaultVideosExist(): void {
  try {
    const videosDir = path.join(process.cwd(), 'public', 'videos');
    if (!fs.existsSync(videosDir)) {
      fs.mkdirSync(videosDir, { recursive: true });
    }

    for (const [filename, base64] of Object.entries(EMBEDDED_VIDEOS)) {
      const targetPath = path.join(videosDir, filename);
      // If file doesn't exist or is 0 bytes, restore it from permanent code
      if (!fs.existsSync(targetPath) || fs.statSync(targetPath).size < 1000) {
        const buf = Buffer.from(base64, 'base64');
        fs.writeFileSync(targetPath, buf);
        console.log(`[Permanent Video Restore] Recreated ${filename} (${buf.length} bytes) from code.`);
      }
    }
  } catch (err) {
    console.error('[Permanent Video Restore] Error ensuring videos on disk:', err);
  }
}
