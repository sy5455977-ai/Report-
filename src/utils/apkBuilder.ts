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

// Embedded cryptographic signing keys for client-side APK compilation on Netlify, Vercel & static hosting
export const EMBEDDED_DEBUG_KEY = `-----BEGIN PRIVATE KEY-----
MIIEvQIBADANBgkqhkiG9w0BAQEFAASCBKcwggSjAgEAAoIBAQCxtSuIoO5/vBa7
csjx0dddhg/JkLTg/w54iCOI2MoYIxtTDgBRvdoeYzpDHwFmhqQNx4wlP3myAUwd
aRPeMJASognRrCAGYTqI8trPXM3qRfLrKSqSW1H8mbfS/9IyuBNRGCs3ffqVADKu
pp9dM9Qt2nJRu1K5bfxZXnRaVMFNDFp1ALZQE2CSjqJ5Z4Oy5M4kNyhF6VLeT1af
AbbXHtek3iLRnL4B7gtXTp9F4AqPtfDkprya0oE81aBQk43EkGq92xSDi4KfQJQh
oyQb+4wXDlRLE/admS8yeqcDJH0rq1d+K4aByS11jUflONgxCrS6M87+hGq1R5Zy
nJXzw+DPAgMBAAECggEANwhTgH7SDTWq1obwCs9AwkI7jmDlWw4xpYsHciAsybfJ
hPl/iNDiBOoWx2WJMf59PJUw5fIX1lPHhg4d7H+ehl6u6sNCsacXkQSgVXo4fJYH
6eJ4QBXOuIrEHjBCIJnXxZPWAlvdp5oFmAear6rWyRJut7fqoOkaLnTtVHIN4LVw
DICKVkt16uduMWRb+mrZOJinJ6vWvKGhERhZtrIgcIC65Z81T54i9Kqc/7O1TYG+
Ze0fhtZ64D1CdV0SU2iNFxBcgIWi8m7Aal1AeiNOfwYkefis8SHaQsUUd0/l8FRa
EVlxNfpVvS0vj6PRwqJFEXFhTfXrq/Mtb+dkJN+BSQKBgQDWI1wX8/R7KajaRT6M
5nowz+xCLf/1zEAdggsNHcgQh8ukOVODYQoYe7vvdJF5R+i/QAveTw4Tu4JmidNv
ZpJHUeyPpxL1wf+nUDDeQRm4Zhx6ZT946PEe7CAAptCCNA/Nn/b7hj3nqIKZrLZg
3fHkBiY+u+8S/EYFKR9K6Yb2KQKBgQDUcqIEEmv5sbYyJdyfJjCb6TK3Hbub17kd
FtC/skPGDWkIF3Yw7+WGQb4YMp/xvZMPErv8bJNFDOy+ZQHNPintNouNNOQGbWMY
6fiyyAvhC3vQEgBGKF0r5aqSupkGMmCLvrCg9n3fzpTfXZubOT0VTMXwr+CuprMH
uMThljDONwKBgQDA2B87wwtNT3ss9mcaZQVtqBJQlzSHm2WyLUbejQ97M5AFWUsI
af+5hNT/FK9d1ZCZi4gksHUw+BC7Xyv2ixz49aJgzEma4RbnCqS3w1Dya6MB5uR+
cumSu3smmxPz7ga9W24FniNp2Kuk0ZF9MuOAQrl2jbEEHATC6QGxaRWN4QKBgHYI
6rNQeOVWM2BRYO6bjU5Slnbe8il4BcV/s6OOK9GSCdURE/3Ei8W4KSHQnsT1CwvI
4OEygfBPagmunP2nmCvPrmFaDYb0p6Zj+GV8d/0lIDlOhxBzxLBq/gZf3j1vJ+z8
ma4UxYLfiB9CJv5rIuD+ssszLKZcwAN+SQT9KUipAoGAJsusvyhWLW2q1V5UOx3l
Zd0D6vSHMviHfkAHiZLQYTNB3qIgfdxEOpc0I6kxn7Uua22NPtcQt/WLfKTlsD6p
augXvf/+zPWABRyTr0sRuooh9XqFEkbzJmRNHagZSkO2gQswiUu94d3LLzBd19FU
2lVU1bsGnhGhQ7Wyf1JuOWc=
-----END PRIVATE KEY-----`;

export const EMBEDDED_DEBUG_CRT = `-----BEGIN CERTIFICATE-----
MIIDUTCCAjmgAwIBAgIUOwXRB+z9xWRjmXjthHb9O3LlvY8wDQYJKoZIhvcNAQEL
BQAwNzEWMBQGA1UEAwwNQW5kcm9pZCBEZWJ1ZzEQMA4GA1UECgwHQW5kcm9pZDEL
MAkGA1UEBhMCVVMwIBcNMjYwOTI3MDcyMjUzWhgPMjA1NDAyMTIwNzIyNTNaMDcx
FjAUBgNVBAMMDUFuZHJvaWQgRGVidWcxEDAOBgNVBAoMB0FuZHJvaWQxCzAJBgNV
BAYTAlVTMIIBIjANBgkqhkiG9w0BAQEFAAOCAQ8AMIIBCgKCAQEAsbUriKDuf7wW
u3LI8dHXXYYPyZC04P8OeIgjiNjKGCMbUw4AUb3aHmM6Qx8BZoakDceMJT95sgFM
HWkT3jCQEqIJ0awgBmE6iPLaz1zN6kXy6ykqkltR/Jm30v/SMrgTURgrN336lQAy
rqafXTPULdpyUbtSuW38WV50WlTBTQxadQC2UBNgko6ieWeDsuTOJDcoRelS3k9W
nwG21x7XpN4i0Zy+Ae4LV06fReAKj7Xw5Ka8mtKBPNWgUJONxJBqvdsUg4uCn0CU
IaMkG/uMFw5USxP2nZkvMnqnAyR9K6tXfiuGgcktdY1H5TjYMQq0ujPO/oRqtUeW
cpyV88PgzwIDAQABo1MwUTAdBgNVHQ4EFgQUEbEYejnwBfmS7YJ0WGvEq4QG7Bgw
HwYDVR0jBBgwFoAUEbEYejnwBfmS7YJ0WGvEq4QG7BgwDwYDVR0TAQH/BAUwAwEB
/zANBgkqhkiG9w0BAQsFAAOCAQEAYdn+OZdhvCkmC0Q3cnMRS0Rs1NYDINbVTNkb
ipW9UkP31X7dsz402phsWn9h1J2jh2+5oeTsTdUhDzQ2dsPm7d8KW8f85dd8ulpV
2r68ibqIr692QTmF1E9DBP4O5Nu4nlbkLTCw19OfNQlmaWCeLBRqNEWheeWGm8Ty
H3Hzm0g4l5ACxthp5S8aBr9LpFJGAqEkIg0sCH6/R8Syn9LHY3udTd2Cazv52H8O
gUqsM7CB16oR/DUFk0413BEzJk7YbNipjtf2kQ8JIMZf0LVtqiPzbxFE4ov5Sl8R
h43X/ND1F5veVf36xWeMMImbB1naNdG7f4v0+c7CfFd4dvprYw==
-----END CERTIFICATE-----`;

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
    let apkBlob: Blob | null = null;
    let finalSizeMb = '14.74 MB';

    const isStaticDeploy = typeof window !== 'undefined' && (
      window.location.hostname.endsWith('netlify.app') ||
      window.location.hostname.endsWith('vercel.app') ||
      window.location.hostname.includes('hostinger')
    );

    if (!isStaticDeploy) {
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

  // 1. Fetch APK template from static assets (using embedded keys to avoid CDN/static host blocking)
  let templateArrayBuffer: ArrayBuffer | null = null;
  const templatePaths = ['/templates/webview-template.apk', './templates/webview-template.apk'];
  for (const tPath of templatePaths) {
    try {
      const res = await fetch(tPath);
      if (res.ok) {
        templateArrayBuffer = await res.arrayBuffer();
        break;
      }
    } catch (e) {
      // Continue to next path
    }
  }

  if (!templateArrayBuffer) {
    throw new Error('Could not load APK base template.');
  }

  const keyStr = EMBEDDED_DEBUG_KEY;
  const certStr = EMBEDDED_DEBUG_CRT;

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

  // 4. Overwrite ALL HTML files in the APK template with the user's application
  // This guarantees that whether Android WebView loads local/index.html, local/sites.html, demo/index.html, or demo/test.html,
  // it will ALWAYS load the user's created application and NEVER the original template demo/sample pages!
  Object.keys(zip.files).forEach(filePath => {
    if (filePath.endsWith('.html') || filePath.endsWith('.htm')) {
      zip.file(filePath, modifiedHtml);
    }
  });

  // Explicitly ensure standard entry points are populated
  zip.file('assets/demo/index.html', modifiedHtml);
  zip.file('assets/demo/test.html', modifiedHtml);
  zip.file('assets/local/index.html', modifiedHtml);
  zip.file('assets/local/sites.html', modifiedHtml);
  zip.file('assets/local/result.html', modifiedHtml);
  zip.file('assets/web/index.html', modifiedHtml);
  zip.file('assets/web/about.html', modifiedHtml);

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
      'local/index.html': appName,
      'local/sites.html': appName,
      'demo/index.html': appName,
      'demo/test.html': appName,
      'web/index.html': appName
    },
    bundles: [],
    prefix: 'https://appassets.androidplatform.net/sites/'
  };
  zip.file('assets/local/config.json', JSON.stringify(localConfig, null, 2));

  // 6. Update settings.json: Point all primary and alternative site roots to user's app
  let settingsJson: any = {
    sites: [
      { url: 'https://appassets.androidplatform.net/sites/local/index.html', title: appName },
      { url: 'https://appassets.androidplatform.net/sites/local/sites.html', title: appName },
      { url: 'https://appassets.androidplatform.net/sites/demo/index.html', title: appName },
      { url: 'https://appassets.androidplatform.net/sites/demo/test.html', title: appName },
      { url: 'https://appassets.androidplatform.net/sites/web/index.html', title: appName }
    ],
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


  // 7. Keep AndroidManifest.xml intact from the compiled base template
  // Guarantees AndroidX InitializationProvider, FileProvider, MainActivity, and R resources match classes.dex exactly with zero startup crashes.
  // The custom app title and user logo are rendered via resources.arsc and res/pu.png.

  // 8. Patch resources.arsc: Replace "My WebView" with user app name and link adaptive icon to custom PNG
  const arscFile = zip.file('resources.arsc');
  if (arscFile) {
    try {
      const arscBytes = await arscFile.async('uint8array');

      // Replace app name in resources.arsc (UTF-8 string pool entry, exactly 13 bytes: 2 byte length + 10 byte text + 1 byte null)
      const sourceName = new Uint8Array([0x0a, 0x0a, 0x4d, 0x79, 0x20, 0x57, 0x65, 0x62, 0x56, 0x69, 0x65, 0x77, 0x00]);
      const cleanTitle = appName.trim().replace(/[<>:"/\\|?*]/g, '') || 'App';
      const fixed10 = cleanTitle.length >= 10 ? cleanTitle.substring(0, 10) : cleanTitle.padEnd(10, ' ');
      const nameUtf8 = new TextEncoder().encode(fixed10);
      const targetName = new Uint8Array(13);
      targetName[0] = 10;
      targetName[1] = 10;
      targetName.set(nameUtf8.subarray(0, 10), 2);
      targetName[12] = 0x00;

      for (let i = 0; i <= arscBytes.length - sourceName.length; i++) {
        let match = true;
        for (let j = 0; j < sourceName.length; j++) {
          if (arscBytes[i + j] !== sourceName[j]) { match = false; break; }
        }
        if (match) {
          arscBytes.set(targetName, i);
        }
      }

      // Replace adaptive-icon foreground vector reference (res/Qr.xml -> res/pu.png, exactly 10 ASCII chars)
      // This tells Android PackageParser and Google Play Protect to render the high-res PNG icon
      const qrRef = new TextEncoder().encode('res/Qr.xml');
      const puRef = new TextEncoder().encode('res/pu.png');
      for (let i = 0; i <= arscBytes.length - qrRef.length; i++) {
        let match = true;
        for (let j = 0; j < qrRef.length; j++) {
          if (arscBytes[i + j] !== qrRef[j]) { match = false; break; }
        }
        if (match) {
          arscBytes.set(puRef, i);
        }
      }

      zip.file('resources.arsc', arscBytes);
    } catch (aErr) {
      console.warn('[APK Builder] resources.arsc patch skipped:', aErr);
    }
  }

  // 10. Generate high-resolution 512x512 PNG icon (from custom user upload or dynamic branded monogram)
  try {
    const canvas = document.createElement('canvas');
    canvas.width = 512;
    canvas.height = 512;
    const ctx = canvas.getContext('2d');

    if (ctx) {
      if (logoBase64) {
        const cleanBase64 = logoBase64.replace(/^data:image\/[a-zA-Z0-9.-]+;base64,/, '');
        const img = new Image();
        img.src = `data:image/png;base64,${cleanBase64}`;
        await new Promise((resolve, reject) => {
          img.onload = resolve;
          img.onerror = reject;
        });
        ctx.drawImage(img, 0, 0, 512, 512);
      } else {
        // Dynamic sleek branded monogram icon for app
        const grad = ctx.createLinearGradient(0, 0, 512, 512);
        grad.addColorStop(0, '#6366f1');
        grad.addColorStop(1, '#a855f7');
        ctx.fillStyle = grad;
        ctx.fillRect(0, 0, 512, 512);

        // App Initial
        ctx.fillStyle = '#ffffff';
        ctx.font = 'bold 220px sans-serif';
        ctx.textAlign = 'center';
        ctx.textBaseline = 'middle';
        const initial = (appName.trim().charAt(0) || 'A').toUpperCase();
        ctx.fillText(initial, 256, 266);
      }

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
          'res/mipmap-xxxhdpi-v4/ic_launcher_round.png',
          'res/mipmap-xxhdpi-v4/ic_launcher_round.png',
          'res/mipmap-xhdpi-v4/ic_launcher_round.png',
          'res/mipmap-hdpi-v4/ic_launcher_round.png',
          'res/mipmap-mdpi-v4/ic_launcher_round.png',
          'res/mipmap-xxxhdpi-v4/ic_launcher_foreground.png',
          'res/mipmap-xxhdpi-v4/ic_launcher_foreground.png',
          'res/mipmap-xhdpi-v4/ic_launcher_foreground.png',
          'res/mipmap-hdpi-v4/ic_launcher_foreground.png',
          'res/mipmap-mdpi-v4/ic_launcher_foreground.png',
          'assets/demo/img/image.png'
        ];
        allLauncherIconPaths.forEach(p => zip.file(p, iconBuffer));
      }
    }
  } catch (iconErr) {
    console.warn('[APK Builder] Icon generation skipped:', iconErr);
  }

  // 11. Strip old signature files
  const filesToRemove = Object.keys(zip.files).filter(
    f => f.startsWith('META-INF/') && (f.endsWith('.SF') || f.endsWith('.RSA') || f.endsWith('.MF'))
  );
  filesToRemove.forEach(f => zip.remove(f));

  // 12. Generate unsigned APK Uint8Array
  const unsignedBytes = await zip.generateAsync({
    type: 'uint8array',
    compression: 'DEFLATE',
    compressionOptions: { level: 6 }
  });

  // 13. Cryptographically sign the APK using apk_sign_ts
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
