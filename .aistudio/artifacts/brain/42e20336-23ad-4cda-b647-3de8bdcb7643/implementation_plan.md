# Blackbell Voice Model Architecture & Reliability Engine

Comprehensive architectural overhaul of Blackbell's real-time Voice Model across Mobile, Netlify, and Vercel environments. Resolves microphone detection dropouts, overlapping duplicate audio, Android speech recognition chime loops ("tu-tu-tu"), acoustic feedback loops, late responses, and topic bleeding without changing existing UI styling or video personas.

## User Review & Critical Decisions

> [!IMPORTANT]
> The following architectural parameters have been confirmed by user selection:
> - **Audio Interruption (Barge-in)**: Instantly mute and cancel previous AI audio immediately whenever a new user interaction or question begins.
> - **End-of-Speech Silence Detection**: Balanced 800ms adaptive silence threshold, filtering out background clicks while preventing speech truncation on natural pauses.
> - **Audio Engine**: Web Audio API single-source buffer node with HTML5 Audio fallback (prevents Android notification bar clutter and audio focus conflicts).

---

## 1. Overview & Root Cause Analysis

### Identified Root Causes from Video Telemetry & Codebase Inspection
1. **Acoustic Feedback & Overlapping Duplication**:
   When the AI spoke through the phone's speaker, `SpeechRecognition` was either still active or restarted prematurely by `onend`. The device microphone picked up the AI's own voice, treated it as new user speech, and dispatched duplicate API queries. Multiple audio streams then played concurrently ("इंटरनेट सिर्फ एक नेटवर्क नहीं...").
2. **"Tu-tu-tu" Mic Chime Churn**:
   Android Chrome triggers a system chime every time `SpeechRecognition.start()` is called. Because `recognition.stop()` and unhandled `onerror`/`onend` events repeatedly toggled `recognition.start()`, the mic toggled multiple times within seconds.
3. **Topic Bleeding & Outdated Async Responses**:
   Absence of an `AbortController` meant that when multiple queries were triggered in quick succession, older requests completed late and played outdated answers over newer responses.
4. **Mobile Audio Autoplay & Android Notification Bar Hijacking**:
   Creating multiple dynamic `new Audio()` instances caused Android MediaSession notifications to linger and compete for system audio focus.

---

## 2. Technical Architecture & Voice State Engine

```
   ┌──────────────────────────────────────────────────────────────────┐
   │                  UNIFIED VOICE STATE MACHINE                    │
   └──────────────────────────────────────────────────────────────────┘
                                   │
                                   ▼
                             ┌───────────┐
                             │   IDLE    │
                             └─────┬─────┘
                                   │ User clicks Mic / Connect
                                   ▼
                           ┌───────────────┐
             ┌────────────►│   LISTENING   │◄───────────┐
             │             └───────┬───────┘            │
             │                     │ 800ms silence      │
             │                     │ & valid transcript │
             │                     ▼                    │
             │             ┌───────────────┐            │
             │             │  PROCESSING   │            │
             │             └───────┬───────┘            │
             │                     │ Audio ready        │
             │                     ▼                    │
             │             ┌───────────────┐            │
             │             │   SPEAKING    │────────────┘
             │             └───────┬───────┘   AI Audio finishes
             │                     │
             │ Interrupt / Barge-In│ (Instantly stops audio,
             └─────────────────────┘  aborts pending query,
                                      resumes listening)
```

### Component & State Interaction Flow
```
┌─────────────────────────┐          ┌──────────────────────────┐
│   SpeechRecognition     │          │    Gemini Voice Agent    │
│  (hi-IN / en-US STT)    │          │  (Direct Client Engine)  │
└───────────┬─────────────┘          └────────────┬─────────────┘
            │                                     │
            │ user transcript                     │ replyText + TTS WAV
            ▼                                     ▼
┌─────────────────────────┐          ┌──────────────────────────┐
│ Adaptive Silence Timer  │─────────►│  Web Audio API Pipeline  │
│      (800ms debounce)   │          │ (Single Source Node/Gain)│
└─────────────────────────┘          └────────────┬─────────────┘
                                                  │
                                                  ▼
                                     ┌──────────────────────────┐
                                     │ Avatar Video Sync        │
                                     │ (Talking vs Sunna clips) │
                                     └──────────────────────────┘
```

---

## 3. Key Technical Decisions & Fix Specifications

### A. Strict Voice State Synchronization
- **State Definition**: A single source-of-truth ref `voiceStateRef.current` with values `'idle' | 'listening' | 'processing' | 'speaking'`.
- **Elimination of Chime Churn**: `recognition.start()` will **only** be invoked if `voiceStateRef.current === 'listening'`. In `onend` and `onerror`, if the state is `'processing'` or `'speaking'`, auto-restarts are strictly suppressed.

### B. Prevention of Acoustic Feedback Loop (Speaker vs. Mic)
- When transitioning to `'speaking'`, `recognition.abort()` is called immediately to close the microphone hardware before any sound leaves the speaker.
- Once audio playback finishes, a small 250ms quiet grace period elapses before opening the microphone, ensuring lingering room reverberation is not captured.

### C. Web Audio API Single-Source Pipeline
- Create a dedicated single `AudioContext` with an `AudioBufferSourceNode` and `GainNode`.
- Any existing audio source is stopped via `source.stop(0)` and disconnected before a new buffer is scheduled.
- No HTML5 `<audio>` element instantiation during calls, preventing notification center clutter on Android.

### D. Request Cancellation & Topic Bleeding Guard
- Every new user speech session instantiates a fresh `AbortController`.
- If the user speaks again, or if a previous query is pending when silence triggers, `currentAbortController.abort()` runs immediately. Stale AI responses are discarded without playing audio.

### E. Low-Latency Response Pipeline
- Keep speech-to-text language model optimized (`hi-IN`).
- Use Gemini 3.8 Flash Lite TTS (`gemini-3.8-flash-lite-tts`) with standard WAV decoding.
- Immediate browser `speechSynthesis` fallback if network jitter delays the WAV payload beyond 1.5 seconds, ensuring the user is never left waiting in silence.

---

## 4. Implementation Steps & Target Files

1. **`src/utils/geminiClient.ts`**:
   - Add `abortSignal` support to `callDirectGeminiChat` and `generateGeminiDirectTTS`.
   - Add conversation history context window (last 6 turns) so the model maintains coherent conversational context and doesn't jump topics.

2. **`src/App.tsx`**:
   - Implement the `WebAudioVoicePlayer` singleton to manage gapless, single-source playback and immediate muting on interruption.
   - Refactor `startClientDirectVoiceLoop` with the 4-state engine (`idle`, `listening`, `processing`, `speaking`), 800ms adaptive silence detection, and acoustic echo isolation.
   - Guard `recognition.onend` against unwanted restart loops.
   - Synchronize avatar video states (`isAiSpeaking`) strictly with the Web Audio buffer start/stop callbacks.

3. **Verification & Delivery**:
   - Validate with `lint_applet` (`tsc --noEmit`) and `compile_applet`.
   - Test barge-in interruption, continuous dialogue turns, Hindi/Hinglish speech inputs, and cleanup on call disconnect.
