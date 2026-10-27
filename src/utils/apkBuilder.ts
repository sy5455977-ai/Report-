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

    let apkBlob: Blob | null = null;
    let finalSizeMb = '14.74 MB';

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

      if (res.ok) {
        apkBlob = await res.blob();
        const sizeHeader = res.headers.get('X-Apk-Size-Mb');
        finalSizeMb = sizeHeader || (apkBlob.size / (1024 * 1024)).toFixed(2) + ' MB';
      } else {
        console.info('[APK Builder] Server endpoint returned ' + res.status + '. Activating in-browser client-side APK compiler...');
      }
    } catch (netErr) {
      console.info('[APK Builder] Server endpoint unreachable. Activating in-browser client-side APK compiler...', netErr);
    }

    // In-browser client-side compilation fallback (Runs seamlessly on Netlify, Vercel & static hosting)
    if (!apkBlob) {
      onProgress?.({
        step: 3,
        totalSteps: 5,
        message: 'Client compiler: Fetching Android binaries & signing keys...',
        isComplete: false
      });

      apkBlob = await buildAndroidApkInBrowser(htmlCode, cleanTitle, logoBase64);
      finalSizeMb = (apkBlob.size / (1024 * 1024)).toFixed(2) + ' MB';
    }

    onProgress?.({
      step: 4,
      totalSteps: 5,
      message: 'Cryptographic v1+v2+v3 signing complete!',
      isComplete: true,
      sizeMb: finalSizeMb
    });

    await new Promise(r => setTimeout(r, 300));

    onProgress?.({
      step: 5,
      totalSteps: 5,
      message: 'APK package ready for download!',
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
 * Compiles and signs a real Android APK directly inside the browser using JSZip and apk_sign_ts.
 */
async function buildAndroidApkInBrowser(
  htmlCode: string,
  appName: string,
  logoBase64?: string
): Promise<Blob> {
  const [JSZipModule, apkSignModule] = await Promise.all([
    import('jszip'),
    import('apk_sign_ts/browser')
  ]);
  const JSZip = JSZipModule.default || JSZipModule;
  const signApk = apkSignModule.signApk;

  // 1. Fetch APK template and signing certificate/keys from static assets
  const [templateRes, keyRes, certRes] = await Promise.all([
    fetch('/templates/webview-template.apk'),
    fetch('/templates/debug.key'),
    fetch('/templates/debug.crt')
  ]);

  if (!templateRes.ok || !keyRes.ok || !certRes.ok) {
    throw new Error('Could not load APK base template or signing keys.');
  }

  const [templateArrayBuffer, keyStr, certStr] = await Promise.all([
    templateRes.arrayBuffer(),
    keyRes.text(),
    certRes.text()
  ]);

  // 2. Open APK base with JSZip
  const zip = await JSZip.loadAsync(templateArrayBuffer);

  // 3. Inject native background engine and title into HTML
  let modifiedHtml = htmlCode;
  if (/<title>[\s\S]*?<\/title>/i.test(modifiedHtml)) {
    modifiedHtml = modifiedHtml.replace(/<title>[\s\S]*?<\/title>/i, `<title>${appName}</title>`);
  } else if (/<head>/i.test(modifiedHtml)) {
    modifiedHtml = modifiedHtml.replace(/<head>/i, `<head>\n  <title>${appName}</title>`);
  }

  const backgroundEngineScript = `
  <script>
    /* Blackbell Native Android Background & Hardware Alarm Engine */
    (function() {
      window.__BLACKBELL_BACKGROUND_ENGINE__ = true;
      var wakeLockInstance = null;
      var audioCtx = null;
      var keepAliveOsc = null;
      var keepAliveGain = null;

      function initAudioKeepAlive() {
        try {
          if (!audioCtx) {
            var AudioContextClass = window.AudioContext || window.webkitAudioContext;
            if (AudioContextClass) audioCtx = new AudioContextClass();
          }
          if (audioCtx && audioCtx.state === 'suspended') audioCtx.resume();
          if (audioCtx && !keepAliveOsc) {
            keepAliveOsc = audioCtx.createOscillator();
            keepAliveGain = audioCtx.createGain();
            keepAliveOsc.type = 'sine';
            keepAliveOsc.frequency.setValueAtTime(25, audioCtx.currentTime);
            keepAliveGain.gain.setValueAtTime(0.0001, audioCtx.currentTime);
            keepAliveOsc.connect(keepAliveGain);
            keepAliveGain.connect(audioCtx.destination);
            keepAliveOsc.start();
          }
        } catch(e) {}
      }

      function acquireWakeLock() {
        if ('wakeLock' in navigator && !wakeLockInstance) {
          navigator.wakeLock.request('screen').then(function(lock) {
            wakeLockInstance = lock;
            lock.addEventListener('release', function() { wakeLockInstance = null; });
          }).catch(function() {});
        }
      }

      window.addEventListener('load', function() {
        acquireWakeLock();
        initAudioKeepAlive();
      });
      document.addEventListener('visibilitychange', function() {
        if (document.visibilityState === 'visible') {
          acquireWakeLock();
          initAudioKeepAlive();
        }
      });
      window.addEventListener('click', initAudioKeepAlive, { once: true });
      window.addEventListener('touchstart', initAudioKeepAlive, { once: true });
    })();
  </script>
  `;

  if (/<\/head>/i.test(modifiedHtml)) {
    modifiedHtml = modifiedHtml.replace(/<\/head>/i, `${backgroundEngineScript}\n</head>`);
  } else {
    modifiedHtml = `${backgroundEngineScript}\n${modifiedHtml}`;
  }

  // 4. Inject modified HTML into all webview root entrypoints
  zip.file('assets/demo/index.html', modifiedHtml);
  zip.file('assets/local/index.html', modifiedHtml);
  zip.file('assets/web/index.html', modifiedHtml);

  // 5. Update Web Manifest & Config
  const webManifest = {
    name: appName,
    short_name: appName,
    start_url: './index.html',
    display: 'standalone',
    background_color: '#0b101b',
    theme_color: '#0b101b',
    orientation: 'portrait'
  };
  const manifestJsonStr = JSON.stringify(webManifest, null, 2);
  zip.file('assets/manifest.json', manifestJsonStr);
  zip.file('assets/demo/manifest.json', manifestJsonStr);
  zip.file('assets/local/manifest.json', manifestJsonStr);
  zip.file('assets/web/manifest.json', manifestJsonStr);

  const localConfig = {
    sites: {
      'demo/index.html': appName,
      'local/index.html': appName,
      'web/index.html': appName
    },
    bundles: [],
    prefix: 'https://appassets.androidplatform.net/sites/'
  };
  zip.file('assets/local/config.json', JSON.stringify(localConfig, null, 2));

  // 6. Update settings.json
  let settingsJson: any = {
    sites: [{ url: 'https://appassets.androidplatform.net/sites/local/index.html', title: appName }],
    local_sites: true,
    remote_debug: false,
    console_log: true,
    web_settings: {
      JavaScriptEnabled: true,
      DomStorageEnabled: true,
      DatabaseEnabled: true,
      AllowFileAccess: true,
      AllowContentAccess: true
    },
    source: 'assets',
    timestamp: new Date().toISOString()
  };
  zip.file('assets/settings.json', JSON.stringify(settingsJson, null, 2));

  // 7. If custom logo is provided, resize via browser canvas and embed
  if (logoBase64) {
    try {
      const cleanBase64 = logoBase64.replace(/^data:image\/[a-zA-Z0-9.-]+;base64,/, '');
      const img = new Image();
      img.src = `data:image/png;base64,${cleanBase64}`;
      await new Promise((resolve, reject) => {
        img.onload = resolve;
        img.onerror = reject;
      });

      const canvas = document.createElement('canvas');
      canvas.width = 512;
      canvas.height = 512;
      const ctx = canvas.getContext('2d');
      if (ctx) {
        ctx.drawImage(img, 0, 0, 512, 512);
        const blob = await new Promise<Blob | null>(r => canvas.toBlob(r, 'image/png'));
        if (blob) {
          const iconBuffer = await blob.arrayBuffer();
          const allLauncherIconPaths = [
            'res/pu.png', 'res/8h.png', 'res/j4.png', 'res/tG.png', 'res/pk.png',
            'res/0Z.png', 'res/9z.png', 'res/Ag.png', 'res/Ck.png', 'res/FW.png',
            'res/Gf.png', 'res/MD.png', 'res/OX1.png', 'res/kp.png', 'res/nf.png',
            'res/p8.png', 'res/5P.png', 'res/7m.png', 'res/OM.png', 'res/Pb.png',
            'res/Y3.png', 'res/aU.png', 'res/zz.png', 'res/6d.png', 'res/6t.png',
            'res/mipmap-xxxhdpi-v4/ic_launcher.png',
            'res/mipmap-xxhdpi-v4/ic_launcher.png',
            'res/mipmap-xhdpi-v4/ic_launcher.png',
            'res/mipmap-hdpi-v4/ic_launcher.png',
            'res/mipmap-mdpi-v4/ic_launcher.png',
            'assets/demo/img/image.png'
          ];
          allLauncherIconPaths.forEach(p => zip.file(p, iconBuffer));
        }
      }
    } catch (iconErr) {
      console.warn('[APK Builder] Icon embedding skipped:', iconErr);
    }
  }

  // 8. Strip old signature files
  const filesToRemove = Object.keys(zip.files).filter(
    f => f.startsWith('META-INF/') && (f.endsWith('.SF') || f.endsWith('.RSA') || f.endsWith('.MF'))
  );
  filesToRemove.forEach(f => zip.remove(f));

  // 9. Generate unsigned APK Uint8Array
  const unsignedBytes = await zip.generateAsync({
    type: 'uint8array',
    compression: 'DEFLATE',
    compressionOptions: { level: 6 }
  });

  // 10. Cryptographically sign the APK using apk_sign_ts
  const signResult = await signApk(unsignedBytes, keyStr, certStr);
  const signedBuffer = signResult.signedApk;

  return new Blob([signedBuffer], { type: 'application/vnd.android.package-archive' });
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
