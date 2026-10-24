# Vercel & Netlify Voice Model Support - Implementation Plan

Enable fully functional, hands-free real-time voice conversations for Blackbell AGI on static and serverless platforms like Vercel and Netlify where persistent WebSocket servers are unsupported.

## User Review & Critical Decisions

> [!IMPORTANT]
> The architectural decisions below were confirmed through the interactive requirements interview and govern this build:

- **Confirmed Decision 1 (Automatic Hands-Free Voice Loop)**: When deployed on Vercel, Netlify, or environments where the backend `/live` WebSocket is unreachable, the app will automatically engage a continuous hands-free voice loop using browser speech recognition (`SpeechRecognition` / `webkitSpeechRecognition`), automatic turn-taking, and responsive silence detection.
- **Confirmed Decision 2 (Gemini Audio TTS with Browser Voice Fallback)**: The AI companion's spoken responses will be generated using Google Gemini's Audio model (`gemini-3.8-flash-lite-tts`) with dedicated persona voices (`Zephyr` for Bell, `Charon` for Black), with instantaneous fallback to high-quality browser Speech Synthesis.
- **Confirmed Decision 3 (Seamless Fallback Architecture)**: If WebSocket fails to connect to `/live` (the standard failure mode on Vercel and Netlify), the voice interface will automatically transition to the Client-Direct Voice Engine without throwing network errors or hanging.

---

## 1. Overview & Core Concept

- **What It Does**: Enables end-to-end voice conversations with Bell and Black personas on static hosts (Vercel, Netlify, Cloudflare Pages) using the user's personal Gemini API key. Users speak naturally through their microphone; the app transcribes their words in real-time, queries Gemini for companion responses, speaks the answers with expressive voice models, animates the companion video screen, and automatically resumes listening.
- **Target Audience**: Users deploying Blackbell AGI on free or static hosting providers without dedicated Node/WebSocket server infrastructure.
- **Key Value**: 100% portable voice assistant capabilities anywhere without requiring WebSocket servers or server-side streaming bridges.

---

## 2. User Experience & Visual Design

### Key User Flows

1. **Entering Voice Mode**:
   - User switches to **VOICE** mode via the sidebar toggle or starts a call.
   - The app attempts to initialize audio. On Vercel/Netlify, WebSocket failure is gracefully trapped; the client activates the **Client-Direct Voice Engine**.
   - Network status displays `Connected (Direct Client Voice)` in green with a live audio pulse.
2. **Hands-Free Speech Interaction**:
   - Microphone activates with noise suppression and echo cancellation.
   - User speaks in Hindi, Hinglish, or English. Live speech is transcribed word-for-word in the transcript overlay on the video screen.
   - Upon a natural speech pause (1.2s silence detection), speech recognition pauses and queries Gemini.
3. **Companion Spoken Output & Avatar Animation**:
   - `BellVideoScreen` triggers talking video state (`isAiSpeaking: true`).
   - Response audio is fetched from Gemini TTS (`gemini-3.8-flash-lite-tts`) and played at 24kHz.
   - When playback finishes, speech recognition automatically re-arms, ready for the user's next sentence.

---

## 3. Key Product Decisions & Trade-Offs

- **Decision 1: Continuous Web Speech Recognition with Pause Debounce**
  - *Chosen Approach*: Implement a resilient speech listener with silence threshold debounce (1200ms) that automatically commits sentences and triggers generation.
  - *Why*: Delivers a natural "call-like" hands-free conversational rhythm without requiring users to hold buttons or click to talk.
  - *Alternatives Considered*: Manual push-to-talk button (rejected by user preference for hands-free loop).
- **Decision 2: Direct Client-Side Gemini Audio TTS Dispatcher**
  - *Chosen Approach*: Call `https://generativelanguage.googleapis.com/v1beta/models/gemini-3.8-flash-lite-tts:generateContent?key=${apiKey}` directly from browser with `responseModalities: ["AUDIO"]`.
  - *Why*: Delivers expressive, studio-quality speech natively for both Bell and Black personalities without needing a proxy backend.

---

## 4. Technical Architecture & Data Strategy

### Component & Voice Loop Diagram

```
┌─────────────────────────────────────────────────────────────┐
│              Blackbell Voice Engine (App.tsx)               │
├─────────────────────────────────────────────────────────────┤
│                                                             │
│   [User Speaks] ──▶ Continuous SpeechRecognition            │
│                            │                                │
│                     (1.2s Silence)                          │
│                            ▼                                │
│             callDirectGeminiChat (Hinglish AI)              │
│                            │                                │
│                    (Response Text)                          │
│                            ▼                                │
│           generateGeminiDirectTTS (Gemini 3.8 TTS)          │
│                      /           \                          │
│                (Success)       (Fallback)                   │
│                   ▼                ▼                        │
│            WAV 24kHz Audio   Browser SpeechSynthesis        │
│                   │                │                        │
│                   ▼                ▼                        │
│           [BellVideoScreen Talking Video Animation]         │
│                            │                                │
│                    (Audio Ended)                            │
│                            ▼                                │
│             [Auto-Resume SpeechRecognition Loop]            │
│                                                             │
└─────────────────────────────────────────────────────────────┘
```

### Module Responsibilities

1. **`src/utils/geminiClient.ts`**:
   - Export `generateGeminiDirectTTS(text, voiceName, apiKey)` to generate binary WAV speech from `gemini-3.8-flash-lite-tts`.
2. **`src/App.tsx`**:
   - Implement `startClientDirectVoiceLoop()` with `SpeechRecognition` or `webkitSpeechRecognition`.
   - Update `connectToLiveAPI()` so if WebSocket fails to connect within 2.5s or fires `onerror`/`onclose`, it seamlessly routes into `startClientDirectVoiceLoop()`.
   - Handle continuous loop state transitions (`listening` -> `thinking` -> `speaking` -> `listening`).

---

## 5. Verification & Testing Plan

1. **Vercel/Netlify Simulation**: Verify that when WebSocket fails or is blocked, the app automatically switches to the Direct Client Voice Loop without crashing.
2. **Speech Recognition Test**: Verify that spoken input in Hindi and English is transcribed cleanly.
3. **Gemini TTS Test**: Verify that audio generates from `gemini-3.8-flash-lite-tts` with `Zephyr` (Bell) and `Charon` (Black).
4. **Turn-Taking Verification**: Verify that after the companion finishes speaking, the microphone re-opens automatically for the next query.
5. **Compilation Verification**: Run `compile_applet` and `lint_applet` to ensure zero build errors.
