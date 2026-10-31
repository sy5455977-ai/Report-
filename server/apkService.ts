import fs from 'fs';
import path from 'path';
import JSZip from 'jszip';
import { signApk } from 'apk_sign_ts';
import sharp from 'sharp';

let cachedTemplate: Buffer | null = null;
let cachedKey: string | null = null;
let cachedCert: string | null = null;

function loadTemplateFiles() {
  const templateDir = path.join(process.cwd(), 'server', 'templates');
  const templatePath = path.join(templateDir, 'webview-template.apk');
  const keyPath = path.join(templateDir, 'debug.key');
  const certPath = path.join(templateDir, 'debug.crt');

  if (!cachedTemplate && fs.existsSync(templatePath)) {
    cachedTemplate = fs.readFileSync(templatePath);
  }
  if (!cachedKey && fs.existsSync(keyPath)) {
    cachedKey = fs.readFileSync(keyPath, 'utf-8');
  }
  if (!cachedCert && fs.existsSync(certPath)) {
    cachedCert = fs.readFileSync(certPath, 'utf-8');
  }

  return {
    template: cachedTemplate,
    key: cachedKey,
    cert: cachedCert
  };
}

/**
 * Dynamically overrides the web manifest, meta headers, icons, and site title
 * during build time based on user customization.
 */
export function overrideManifestAndSiteHeaders(
  htmlCode: string,
  appName: string,
  logoBase64?: string
): { modifiedHtml: string; webManifest: any; localConfig: any } {
  const cleanBase64 = logoBase64 ? logoBase64.replace(/^data:image\/[a-zA-Z0-9.-]+;base64,/, '') : '';
  const iconDataUri = cleanBase64 ? `data:image/png;base64,${cleanBase64}` : './img/image.png';

  const webManifest = {
    name: appName,
    short_name: appName,
    start_url: './index.html',
    display: 'standalone',
    background_color: '#0b101b',
    theme_color: '#0b101b',
    orientation: 'portrait',
    icons: [
      {
        src: iconDataUri,
        sizes: '192x192',
        type: 'image/png',
        purpose: 'any maskable'
      },
      {
        src: iconDataUri,
        sizes: '512x512',
        type: 'image/png',
        purpose: 'any maskable'
      }
    ]
  };

  const localConfig = {
    sites: {
      'demo/index.html': appName,
      'local/index.html': appName,
      'web/index.html': appName
    },
    bundles: [],
    prefix: 'https://appassets.androidplatform.net/sites/'
  };

  let modifiedHtml = htmlCode;

  // 1. Update or inject <title>
  if (/<title>[\s\S]*?<\/title>/i.test(modifiedHtml)) {
    modifiedHtml = modifiedHtml.replace(/<title>[\s\S]*?<\/title>/i, `<title>${appName}</title>`);
  } else if (/<head>/i.test(modifiedHtml)) {
    modifiedHtml = modifiedHtml.replace(/<head>/i, `<head>\n  <title>${appName}</title>`);
  }

  // 2. Build injection tags for head including Background Alarm & Keepalive Engine
  const backgroundEngineScript = `
  <script>
    /* Blackbell Native Android Background & Hardware Alarm Engine */
    (function() {
      window.__BLACKBELL_BACKGROUND_ENGINE__ = true;
      var wakeLockInstance = null;
      var audioCtx = null;
      var keepAliveOsc = null;
      var keepAliveGain = null;

      // 1. Audio keepalive to prevent Android OS CPU sleep & timer throttling when screen is turned off
      function initAudioKeepAlive() {
        try {
          if (!audioCtx) {
            var AudioContextClass = window.AudioContext || window.webkitAudioContext;
            if (AudioContextClass) {
              audioCtx = new AudioContextClass();
            }
          }
          if (audioCtx && audioCtx.state === 'suspended') {
            audioCtx.resume();
          }
          if (audioCtx && !keepAliveOsc) {
            keepAliveOsc = audioCtx.createOscillator();
            keepAliveGain = audioCtx.createGain();
            // Virtually silent 25Hz sub-audible carrier
            keepAliveOsc.type = 'sine';
            keepAliveOsc.frequency.setValueAtTime(25, audioCtx.currentTime);
            keepAliveGain.gain.setValueAtTime(0.0001, audioCtx.currentTime);
            keepAliveOsc.connect(keepAliveGain);
            keepAliveGain.connect(audioCtx.destination);
            keepAliveOsc.start();
          }
        } catch(e) {}
      }

      // 2. Screen WakeLock API
      async function requestScreenWakeLock() {
        try {
          if ('wakeLock' in navigator && !wakeLockInstance) {
            wakeLockInstance = await navigator.wakeLock.request('screen');
            wakeLockInstance.addEventListener('release', function() {
              wakeLockInstance = null;
            });
          }
        } catch(e) {}
      }

      // 3. User interaction listener to immediately unlock Audio & Wakelock for screen-off execution
      var hasUnlocked = false;
      function unlockHardware() {
        if (!hasUnlocked) {
          hasUnlocked = true;
          initAudioKeepAlive();
          requestScreenWakeLock();
          if ('Notification' in window && Notification.permission === 'default') {
            Notification.requestPermission();
          }
        }
      }
      window.addEventListener('click', unlockHardware, { passive: true });
      window.addEventListener('touchstart', unlockHardware, { passive: true });
      window.addEventListener('keydown', unlockHardware, { passive: true });

      // 4. Background Alarm Dispatcher
      window.dispatchNativeAlarm = function(title, body) {
        unlockHardware();
        try {
          if (navigator.vibrate) {
            navigator.vibrate([1000, 400, 1000, 400, 1500, 500, 2000]);
          }
        } catch(e) {}
        try {
          if ('Notification' in window && Notification.permission === 'granted') {
            new Notification(title || 'Alarm Alert', {
              body: body || 'Your alarm is ringing!',
              icon: './manifest.json',
              requireInteraction: true
            });
          }
        } catch(e) {}
      };

      // 5. Native Permissions Helper
      window.requestAppPermissions = async function() {
        unlockHardware();
        if ('Notification' in window && Notification.permission !== 'granted') {
          await Notification.requestPermission();
        }
        return true;
      };

      // Auto-unlock when visibility changes
      document.addEventListener('visibilitychange', function() {
        if (document.visibilityState === 'visible') {
          requestScreenWakeLock();
          if (audioCtx && audioCtx.state === 'suspended') {
            audioCtx.resume();
          }
        }
      });
    })();
  </script>`;

  const headTags = [
    `<meta name="application-name" content="${appName}">`,
    `<meta name="apple-mobile-web-app-title" content="${appName}">`,
    `<meta name="apple-mobile-web-app-capable" content="yes">`,
    `<meta name="mobile-web-app-capable" content="yes">`,
    `<meta name="theme-color" content="#0b101b">`,
    `<link rel="manifest" href="./manifest.json">`,
    backgroundEngineScript
  ];

  if (cleanBase64) {
    headTags.push(`<link rel="icon" type="image/png" href="${iconDataUri}">`);
    headTags.push(`<link rel="apple-touch-icon" href="${iconDataUri}">`);
  }

  const tagBlock = headTags.join('\n  ');

  if (/<head>/i.test(modifiedHtml)) {
    modifiedHtml = modifiedHtml.replace(/<head>/i, `<head>\n  ${tagBlock}`);
  } else {
    modifiedHtml = `<head>\n  ${tagBlock}\n</head>\n${modifiedHtml}`;
  }

  return { modifiedHtml, webManifest, localConfig };
}

/**
 * Injects required Android permissions (WakeLock, Exact Alarm, Notifications, Vibrate, etc.)
 * and safely updates package name in Android binary XML (AXML).
 */
function injectPermissionsAndPackage(manifestBuf: Buffer, targetPackage: string): Buffer {
  const sourcePkgU16 = Buffer.from('net.mikespub.mywebview', 'utf16le');
  const targetPkgU16 = Buffer.from(targetPackage, 'utf16le');
  const mainActivityU16 = Buffer.from('net.mikespub.mywebview.MainActivity', 'utf16le');

  // 1. Replace package name safely in manifest buffer
  let m = Buffer.from(manifestBuf);
  let idx = m.indexOf(sourcePkgU16);
  while (idx !== -1) {
    const isMainActivity =
      idx + mainActivityU16.length <= m.length &&
      m.subarray(idx, idx + mainActivityU16.length).equals(mainActivityU16);

    if (!isMainActivity) {
      targetPkgU16.copy(m, idx);
    }
    idx = m.indexOf(sourcePkgU16, idx + (isMainActivity ? mainActivityU16.length : targetPkgU16.length));
  }

  // 2. Parse string pool from AXML
  const strChunkSize = m.readUInt32LE(12);
  const strCount = m.readUInt32LE(16);
  const strOffset = m.readUInt32LE(28);

  const strings: string[] = [];
  for (let i = 0; i < strCount; i++) {
    const off = m.readUInt32LE(36 + i * 4);
    const sStart = 8 + strOffset + off;
    const len = m.readUInt16LE(sStart);
    strings.push(m.toString('utf16le', sStart + 2, sStart + 2 + len * 2));
  }

  // Complete list of modern Android permissions for background alarms, screen-off keepalive, and accessibility
  const newPermissions = [
    'android.permission.WAKE_LOCK',
    'android.permission.SCHEDULE_EXACT_ALARM',
    'android.permission.USE_EXACT_ALARM',
    'android.permission.POST_NOTIFICATIONS',
    'android.permission.VIBRATE',
    'android.permission.SYSTEM_ALERT_WINDOW',
    'android.permission.REQUEST_IGNORE_BATTERY_OPTIMIZATIONS',
    'android.permission.RECORD_AUDIO',
    'android.permission.CAMERA',
    'android.permission.ACCESS_FINE_LOCATION',
    'android.permission.ACCESS_COARSE_LOCATION',
    'android.permission.FOREGROUND_SERVICE',
    'android.permission.RECEIVE_BOOT_COMPLETED',
    'android.permission.MODIFY_AUDIO_SETTINGS',
    'android.permission.ACCESS_NETWORK_STATE',
    'android.permission.BIND_ACCESSIBILITY_SERVICE'
  ];

  const addedIndices: number[] = [];
  for (const perm of newPermissions) {
    let sIdx = strings.indexOf(perm);
    if (sIdx === -1) {
      sIdx = strings.length;
      strings.push(perm);
    }
    addedIndices.push(sIdx);
  }

  // Build new string pool buffer
  const strOffsets: number[] = [];
  const strDataBufs: Buffer[] = [];
  let curDataOff = 0;
  for (const s of strings) {
    strOffsets.push(curDataOff);
    const b = Buffer.from(s, 'utf16le');
    const item = Buffer.alloc(2 + b.length + 2);
    item.writeUInt16LE(s.length, 0);
    b.copy(item, 2);
    item.writeUInt16LE(0, 2 + b.length);
    strDataBufs.push(item);
    curDataOff += item.length;
  }

  const padLen = (4 - (curDataOff % 4)) % 4;
  if (padLen > 0) {
    strDataBufs.push(Buffer.alloc(padLen));
    curDataOff += padLen;
  }

  const newStrOffset = 28 + strings.length * 4;
  const newPoolSize = newStrOffset + curDataOff;

  const poolBuf = Buffer.alloc(newPoolSize);
  poolBuf.writeUInt16LE(0x0001, 0);
  poolBuf.writeUInt16LE(0x001c, 2);
  poolBuf.writeUInt32LE(newPoolSize, 4);
  poolBuf.writeUInt32LE(strings.length, 8);
  poolBuf.writeUInt32LE(0, 12);
  poolBuf.writeUInt32LE(0, 16);
  poolBuf.writeUInt32LE(newStrOffset, 20);
  poolBuf.writeUInt32LE(0, 24);

  for (let i = 0; i < strOffsets.length; i++) {
    poolBuf.writeUInt32LE(strOffsets[i], 28 + i * 4);
  }

  let p = newStrOffset;
  for (const item of strDataBufs) {
    item.copy(poolBuf, p);
    p += item.length;
  }

  const usesPermIdx = strings.indexOf('uses-permission');
  const androidUriIdx = strings.indexOf('http://schemas.android.com/apk/res/android');
  const nameIdx = strings.indexOf('name');

  const permBlocks: Buffer[] = [];
  for (const strIdx of addedIndices) {
    const startEl = Buffer.alloc(56);
    startEl.writeUInt16LE(0x0102, 0);
    startEl.writeUInt16LE(0x0010, 2);
    startEl.writeUInt32LE(56, 4);
    startEl.writeUInt32LE(11, 8);
    startEl.writeInt32LE(-1, 12);
    startEl.writeInt32LE(-1, 16);
    startEl.writeInt32LE(usesPermIdx !== -1 ? usesPermIdx : 95, 20);
    startEl.writeUInt16LE(20, 24);
    startEl.writeUInt16LE(20, 26);
    startEl.writeUInt16LE(1, 28);
    startEl.writeUInt16LE(0, 30);
    startEl.writeUInt16LE(0, 32);
    startEl.writeUInt16LE(0, 34);

    startEl.writeInt32LE(androidUriIdx !== -1 ? androidUriIdx : 76, 36);
    startEl.writeInt32LE(nameIdx !== -1 ? nameIdx : 3, 40);
    startEl.writeInt32LE(strIdx, 44);
    startEl.writeUInt32LE(0x08000003, 48);
    startEl.writeUInt32LE(strIdx, 52);

    const endEl = Buffer.alloc(24);
    endEl.writeUInt16LE(0x0103, 0);
    endEl.writeUInt16LE(0x0010, 2);
    endEl.writeUInt32LE(24, 4);
    endEl.writeUInt32LE(11, 8);
    endEl.writeInt32LE(-1, 12);
    endEl.writeInt32LE(-1, 16);
    endEl.writeInt32LE(usesPermIdx !== -1 ? usesPermIdx : 95, 20);

    permBlocks.push(startEl, endEl);
  }

  const permTotalBuf = Buffer.concat(permBlocks);
  const appStart = 7624;
  const restOfManifestBeforeApp = m.subarray(8 + strChunkSize, appStart);
  const restOfManifestFromApp = m.subarray(appStart);

  const newManifestBody = Buffer.concat([
    poolBuf,
    restOfManifestBeforeApp,
    permTotalBuf,
    restOfManifestFromApp
  ]);

  const newManifestTotal = Buffer.alloc(8 + newManifestBody.length);
  newManifestTotal.writeUInt16LE(0x0003, 0);
  newManifestTotal.writeUInt16LE(0x0008, 2);
  newManifestTotal.writeUInt32LE(newManifestTotal.length, 4);
  newManifestBody.copy(newManifestTotal, 8);

  return newManifestTotal;
}

/**
 * Builds a real, signed Android APK with unique Package Name,
 * customized launcher logo, dynamic manifest, and untouched classes.dex for flawless runtime.
 */
export async function generateSignedApk(
  htmlCode: string,
  rawAppName: string = 'Boom ai',
  logoBase64?: string
): Promise<{ buffer: Buffer; fileName: string; sizeMb: string }> {
  const { template, key, cert } = loadTemplateFiles();
  if (!template || !key || !cert) {
    throw new Error('APK template or signing keys are not found on the server.');
  }

  // Clean and prepare app title & filename
  const cleanTitle = rawAppName.trim().replace(/[<>:"/\\|?*]/g, '') || 'Blackbell App';
  const fileSafeName = cleanTitle.replace(/\s+/g, '_');
  const fileName = `${fileSafeName}.apk`;

  // 1. Load the real compiled WebView APK base
  const zip = await JSZip.loadAsync(template);

  // 2. Prepare dynamic HTML, Manifest, and Config
  const { modifiedHtml, webManifest, localConfig } = overrideManifestAndSiteHeaders(
    htmlCode,
    cleanTitle,
    logoBase64
  );

  // 3. Inject Unique Standalone Package Name into AndroidManifest.xml and resources.arsc
  // Matches exact 22-character byte length of 'net.mikespub.mywebview'.
  // This guarantees Android treats every distinct app as a separate app (never asks to "Update this app"),
  // while keeping classes.dex MainActivity and resources.arsc completely synchronized without crash!
  const cleanAlnum = cleanTitle.toLowerCase().replace(/[^a-z0-9]/g, '');
  const prefix3 = (cleanAlnum.slice(0, 3) || 'app').padEnd(3, 'a');
  let titleHash = 0;
  for (let i = 0; i < cleanTitle.length; i++) {
    titleHash = ((titleHash << 5) - titleHash + cleanTitle.charCodeAt(i)) | 0;
  }
  const hashHex = (Math.abs(titleHash).toString(36) + '0000').slice(0, 4);
  const targetPkg = `com.blackbell.a${prefix3}${hashHex}`.toLowerCase(); // exactly 22 characters

  const sourceU16 = Buffer.from('net.mikespub.mywebview', 'utf16le');
  const targetU16 = Buffer.from(targetPkg, 'utf16le');
  const mainActivityU16 = Buffer.from('net.mikespub.mywebview.MainActivity', 'utf16le');

  const manifestFile = zip.file('AndroidManifest.xml');
  if (manifestFile) {
    try {
      const manifestBuf = await manifestFile.async('nodebuffer');
      const modifiedManifest = Buffer.from(manifestBuf);

      let idx = 0;
      while ((idx = modifiedManifest.indexOf(sourceU16, idx)) !== -1) {
        const isMainActivity = (idx + mainActivityU16.length <= modifiedManifest.length) &&
          modifiedManifest.subarray(idx, idx + mainActivityU16.length).equals(mainActivityU16);

        if (!isMainActivity) {
          targetU16.copy(modifiedManifest, idx);
          idx += targetU16.length;
        } else {
          idx += mainActivityU16.length;
        }
      }

      zip.file('AndroidManifest.xml', modifiedManifest);
    } catch (mErr) {
      console.warn('[Server APK Builder] AndroidManifest package patch warning:', mErr);
    }
  }

  // 5. Update resources.arsc: package name, app name string, and adaptive icon foreground
  const arscFile = zip.file('resources.arsc');
  if (arscFile) {
    const arscBuf = await arscFile.async('nodebuffer');
    let newArsc = Buffer.from(arscBuf);

    // A. Synchronize Package Name in ResTable_package (offset 73008) so AssetManager binds resources perfectly
    let arscPkgIdx = newArsc.indexOf(sourceU16);
    while (arscPkgIdx !== -1) {
      targetU16.copy(newArsc, arscPkgIdx);
      arscPkgIdx = newArsc.indexOf(sourceU16, arscPkgIdx + targetU16.length);
    }

    // B. Replace app name in resources.arsc (UTF-8 string pool entry)
    const sourceArscName = Buffer.from([0x0a, 0x0a, 0x4d, 0x79, 0x20, 0x57, 0x65, 0x62, 0x56, 0x69, 0x65, 0x77, 0x00]);
    const nameBuffer = Buffer.from(cleanTitle.substring(0, 10), 'utf8');
    const nameLen = nameBuffer.length;
    const targetArscName = Buffer.alloc(13);
    targetArscName[0] = nameLen;
    targetArscName[1] = nameLen;
    nameBuffer.copy(targetArscName, 2);

    let nameIdx = newArsc.indexOf(sourceArscName);
    while (nameIdx !== -1) {
      targetArscName.copy(newArsc, nameIdx);
      nameIdx = newArsc.indexOf(sourceArscName, nameIdx + targetArscName.length);
    }

    // C. Replace adaptive-icon foreground vector reference (res/Qr.xml -> res/pu.png)
    const arrowVectorRef = Buffer.from('res/Qr.xml', 'utf8');
    const targetPngRef = Buffer.from('res/pu.png', 'utf8');

    let xIdx = newArsc.indexOf(arrowVectorRef);
    while (xIdx !== -1) {
      targetPngRef.copy(newArsc, xIdx);
      xIdx = newArsc.indexOf(arrowVectorRef, xIdx + targetPngRef.length);
    }

    zip.file('resources.arsc', newArsc);
  }

  // 6. Replace all Launcher Icon PNGs across the APK with crystal clear, 512x512 multi-density sharp PNGs
  if (logoBase64) {
    try {
      const cleanBase64 = logoBase64.replace(/^data:image\/[a-zA-Z0-9.-]+;base64,/, '');
      const rawLogoBuffer = Buffer.from(cleanBase64, 'base64');

      // Generate ultra-crisp, anti-aliased 512x512 master PNG buffer with Lanczos3 resampling and unsharp mask
      // Poco C51 and other modern displays will never receive a low-res 48px or 72px thumbnail
      const [
        buf512,
        buf192
      ] = await Promise.all([
        sharp(rawLogoBuffer)
          .resize(512, 512, { fit: 'cover', kernel: 'lanczos3' })
          .sharpen({ sigma: 1, m1: 0.5, m2: 0.5 })
          .png({ quality: 100, compressionLevel: 8 })
          .toBuffer(),
        sharp(rawLogoBuffer)
          .resize(192, 192, { fit: 'cover', kernel: 'lanczos3' })
          .sharpen({ sigma: 0.8, m1: 0.5, m2: 0.5 })
          .png({ quality: 100, compressionLevel: 8 })
          .toBuffer()
      ]);

      // Write ultra-high resolution 512x512 sharp icons into ALL Android icon filepaths
      // This guarantees that regardless of which density bucket (ldpi, mdpi, hdpi, xhdpi, xxhdpi, xxxhdpi)
      // Poco C51 or any Android device queries, it loads a razor-sharp HD bitmap with zero blurriness!
      const allLauncherIconPaths = [
        'res/pu.png',
        'res/8h.png', 'res/j4.png', 'res/tG.png', 'res/pk.png',
        'res/0Z.png', 'res/9z.png', 'res/Ag.png', 'res/Ck.png', 'res/FW.png',
        'res/Gf.png', 'res/MD.png', 'res/OX1.png', 'res/kp.png', 'res/nf.png',
        'res/p8.png',
        'res/5P.png', 'res/7m.png', 'res/OM.png', 'res/Pb.png',
        'res/Y3.png', 'res/aU.png', 'res/zz.png',
        'res/6d.png', 'res/6t.png', 'res/71.png', 'res/7i.png',
        'res/GY.png', 'res/KM.png', 'res/RV.png', 'res/VW.png',
        'res/Y9.png', 'res/aR.png', 'res/dY.png', 'res/Wh.png',
        'res/mipmap-xxxhdpi-v4/ic_launcher.png',
        'res/mipmap-xxxhdpi-v4/ic_launcher_round.png',
        'res/mipmap-xxxhdpi-v4/ic_launcher_foreground.png',
        'res/mipmap-xxhdpi-v4/ic_launcher.png',
        'res/mipmap-xxhdpi-v4/ic_launcher_round.png',
        'res/mipmap-xxhdpi-v4/ic_launcher_foreground.png',
        'res/mipmap-xhdpi-v4/ic_launcher.png',
        'res/mipmap-xhdpi-v4/ic_launcher_round.png',
        'res/mipmap-xhdpi-v4/ic_launcher_foreground.png',
        'res/mipmap-hdpi-v4/ic_launcher.png',
        'res/mipmap-hdpi-v4/ic_launcher_round.png',
        'res/mipmap-hdpi-v4/ic_launcher_foreground.png',
        'res/mipmap-mdpi-v4/ic_launcher.png',
        'res/mipmap-mdpi-v4/ic_launcher_round.png',
        'res/mipmap-mdpi-v4/ic_launcher_foreground.png',
        'assets/demo/img/image.png'
      ];

      allLauncherIconPaths.forEach(p => zip.file(p, buf512));
    } catch (err) {
      console.error('Failed to embed custom launcher icon with sharp:', err);
    }
  }

  // 7. Overwrite ALL HTML files in the APK template with the user's application
  // This guarantees that whether Android WebView loads local/index.html, local/sites.html, demo/index.html, or demo/test.html,
  // it will ALWAYS load the user's created application and NEVER the original template demo/sample pages!
  Object.keys(zip.files).forEach(filePath => {
    if (filePath.endsWith('.html') || filePath.endsWith('.htm')) {
      zip.file(filePath, modifiedHtml);
    }
  });

  zip.file('assets/demo/index.html', modifiedHtml);
  zip.file('assets/demo/test.html', modifiedHtml);
  zip.file('assets/local/index.html', modifiedHtml);
  zip.file('assets/local/sites.html', modifiedHtml);
  zip.file('assets/local/result.html', modifiedHtml);
  zip.file('assets/web/index.html', modifiedHtml);
  zip.file('assets/web/about.html', modifiedHtml);

  // 8. Inject dynamic manifest.json and local config.json
  const manifestJsonStr = JSON.stringify(webManifest, null, 2);
  zip.file('assets/manifest.json', manifestJsonStr);
  zip.file('assets/demo/manifest.json', manifestJsonStr);
  zip.file('assets/local/manifest.json', manifestJsonStr);
  zip.file('assets/web/manifest.json', manifestJsonStr);
  const updatedLocalConfig = {
    sites: {
      'local/index.html': cleanTitle,
      'local/sites.html': cleanTitle,
      'demo/index.html': cleanTitle,
      'demo/test.html': cleanTitle,
      'web/index.html': cleanTitle
    },
    bundles: [],
    prefix: 'https://appassets.androidplatform.net/sites/'
  };
  zip.file('assets/local/config.json', JSON.stringify(updatedLocalConfig, null, 2));

  // 9. Update settings.json with configured app title and local assets
  let settingsJson: any = {};
  try {
    const rawSettings = await zip.file('assets/settings.json')?.async('string');
    if (rawSettings) {
      settingsJson = JSON.parse(rawSettings);
    }
  } catch (e) {
    settingsJson = {};
  }

  settingsJson.sites = [
    { url: 'https://appassets.androidplatform.net/sites/local/index.html', title: cleanTitle },
    { url: 'https://appassets.androidplatform.net/sites/local/sites.html', title: cleanTitle },
    { url: 'https://appassets.androidplatform.net/sites/demo/index.html', title: cleanTitle },
    { url: 'https://appassets.androidplatform.net/sites/demo/test.html', title: cleanTitle },
    { url: 'https://appassets.androidplatform.net/sites/web/index.html', title: cleanTitle }
  ];
  settingsJson.local_sites = true;
  settingsJson.remote_debug = false;
  settingsJson.console_log = true;
  settingsJson.web_settings = {
    JavaScriptEnabled: true,
    DomStorageEnabled: true,
    DatabaseEnabled: true,
    AllowFileAccess: true,
    AllowContentAccess: true
  };
  settingsJson.source = 'assets';
  settingsJson.timestamp = new Date().toISOString();


  zip.file('assets/settings.json', JSON.stringify(settingsJson, null, 2));

  // 10. Strip old signature files before re-signing
  const filesToRemove = Object.keys(zip.files).filter(
    f => f.startsWith('META-INF/') && (f.endsWith('.SF') || f.endsWith('.RSA') || f.endsWith('.MF'))
  );
  filesToRemove.forEach(f => zip.remove(f));

  // 11. Generate unsigned APK buffer
  const unsignedBuffer = await zip.generateAsync({
    type: 'nodebuffer',
    compression: 'DEFLATE',
    compressionOptions: { level: 6 }
  });

  // 12. Sign the APK using apk_sign_ts (Produces valid v1 + v2 + v3 APK signing blocks)
  const signResult = await signApk(unsignedBuffer, key, cert);
  const signedBuffer = Buffer.from(signResult.signedApk);
  const sizeMb = (signedBuffer.length / (1024 * 1024)).toFixed(2) + ' MB';

  return {
    buffer: signedBuffer,
    fileName,
    sizeMb
  };
}
