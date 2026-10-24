export interface ApkBuildProgress {
  step: number;
  totalSteps: number;
  message: string;
  isComplete: boolean;
  sizeMb?: string;
  error?: string;
}

/**
 * Extracts a descriptive app name from HTML <title> tag, avoiding generic "index.html" names.
 */
export function extractAppTitle(htmlCode: string, fallback: string = 'Boom ai'): string {
  if (!htmlCode) return fallback;
  const match = htmlCode.match(/<title[^>]*>([^<]+)<\/title>/i);
  if (match && match[1]) {
    const title = match[1].trim();
    if (title && title.toLowerCase() !== 'application' && title.toLowerCase() !== 'index.html') {
      return title;
    }
  }
  return fallback && fallback.toLowerCase() !== 'index.html' ? fallback : 'Boom ai';
}

/**
 * Builds a real, compiled, signed Android Application Package (.apk) file containing the single-file HTML app.
 * Utilizes server-side compilation & v1 + v2 + v3 cryptographic signing so Android OS installs it without parse errors.
 */
export async function buildAndroidApk(
  htmlCode: string,
  appName: string = 'Boom ai',
  logoBase64?: string,
  onProgress?: (progress: ApkBuildProgress) => void
): Promise<{ blob: Blob; fileName: string; sizeMb: string }> {
  // Use explicitly provided custom appName from user, or fallback to extracted title
  const cleanTitle = (appName && appName.trim()) ? appName.trim() : extractAppTitle(htmlCode, 'Boom ai');
  const safeName = cleanTitle
    .replace(/[^\w\s-]/g, '')
    .trim()
    .replace(/\s+/g, '_') || 'App';
  const fileName = `${safeName}.apk`;

  onProgress?.({
    step: 1,
    totalSteps: 5,
    message: `Building APK for ${cleanTitle}`,
    isComplete: false
  });

  await new Promise(r => setTimeout(r, 400));

  onProgress?.({
    step: 2,
    totalSteps: 5,
    message: 'Initializing build process...',
    isComplete: false
  });

  await new Promise(r => setTimeout(r, 450));

  onProgress?.({
    step: 3,
    totalSteps: 5,
    message: 'Packaging APK...',
    isComplete: false
  });

  try {
    const res = await fetch('/api/build-apk', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        htmlCode,
        appName: cleanTitle,
        logoBase64
      })
    });

    if (!res.ok) {
      const errText = await res.text();
      throw new Error(errText || 'Failed to generate signed APK on server.');
    }

    const apkBlob = await res.blob();
    const sizeHeader = res.headers.get('X-Apk-Size-Mb');
    const calculatedMb = (apkBlob.size / (1024 * 1024)).toFixed(2) + ' MB';
    const finalSizeMb = sizeHeader || calculatedMb;

    onProgress?.({
      step: 4,
      totalSteps: 5,
      message: 'Build completed successfully!',
      isComplete: true,
      sizeMb: finalSizeMb
    });

    await new Promise(r => setTimeout(r, 300));

    onProgress?.({
      step: 5,
      totalSteps: 5,
      message: 'APK is ready for download',
      isComplete: true,
      sizeMb: finalSizeMb
    });

    return {
      blob: apkBlob,
      fileName,
      sizeMb: finalSizeMb
    };
  } catch (err: any) {
    console.error('Error during APK build:', err);
    throw err;
  }
}

/**
 * Initiates the direct browser download of the generated .apk file.
 */
export function triggerApkDownload(blob: Blob, fileName: string) {
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = fileName.endsWith('.apk') ? fileName : `${fileName}.apk`;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  setTimeout(() => URL.revokeObjectURL(url), 2000);
}
