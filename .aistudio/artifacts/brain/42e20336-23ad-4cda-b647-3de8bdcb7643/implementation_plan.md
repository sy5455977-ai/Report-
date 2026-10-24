# Blackbell AGI - Client API Key & Vercel/Netlify Deployment Implementation Plan

Implement a polished, initial Sign In and Sign Up authentication experience featuring a mandatory Gemini API Key input directly beneath the Username field, seamless client-side direct Gemini execution for instant deployment on Vercel and Netlify without server dependencies, and in-app API key management in the top navigation and settings.

## User Review & Critical Decisions

> [!IMPORTANT]
> The architectural decisions below were confirmed through the interactive requirements interview and govern this build:

- **Confirmed Decision 1 (Mandatory API Key)**: Every user must provide their personal Gemini API Key upon registration/sign-in so the app operates with individual quotas. A direct link to Google AI Studio (`aistudio.google.com/app/apikey`) and validation tester are embedded.
- **Confirmed Decision 2 (Vercel & Netlify Compatibility via Client-Only Direct Mode)**: When deployed on static host providers like Vercel or Netlify (where Node/SQLite backend routes are unavailable), the frontend will automatically invoke the Gemini REST API directly from the browser using the user's stored API key, supporting full personality prompts (Bell & Black personas) and conversation flow.
- **Confirmed Decision 3 (In-App Key Management)**: An accessible API Key manager is embedded in the top header and settings menu, enabling users to view, test, and swap their Gemini API key at any time after logging in.

---

## 1. Overview & Core Concept

- **What It Does**: Presents a high-contrast, modern authentication screen upon first visit with tabbed Sign In / Sign Up modes. On registration, users input email, username, **Gemini API Key**, and password. The key is securely validated and persisted in `localStorage`. The app works in dual mode: if deployed with an Express backend, it proxies or utilizes backend services; if deployed statically to Vercel or Netlify, it initiates direct browser calls to Gemini, enabling zero-server deployment.
- **Target Audience**: End users and developers deploying Blackbell AGI on Vercel, Netlify, Cloudflare Pages, or traditional Node servers who want instant, reliable AI companion chat without backend hosting hurdles.
- **Key Value**: 100% portable single-page app capability on Vercel/Netlify while preserving the rich Bell/Black dual-persona chat experience with the user's own free Gemini API key.

---

## 2. User Experience & Visual Design

### Key User Flows

1. **Initial Zero-State (Auth Screen First)**:
   - User visits the app URL; if no active session and valid API key are detected, the refined `AuthScreen` is displayed immediately.
   - User toggles between "Sign Up" and "Sign In".
   - In "Sign Up", fields appear in order: Email, **Username**, **Gemini API Key** (with eye toggle to mask/unmask, paste button, and "Get Free API Key" shortcut link), and Password.
   - Clicking "Validate & Create Account" conducts an instantaneous light probe against Gemini API (`gemini-2.5-flash` or `gemini-3.1-flash-lite`) to verify the key's validity before saving.
2. **Post-Login Top Bar & Key Management**:
   - Once authenticated, the user enters the Blackbell companion workspace.
   - The top navigation bar displays a dedicated **Key Status & Settings** control (`Key: AI Studio Active`).
   - Clicking opens the API Key modal to update the key, test connectivity, or inspect quota status.
3. **Vercel / Netlify Standalone Execution**:
   - When a user sends a message, the app checks if the backend `/api/chat` is alive. If on Vercel/Netlify (where `/api/chat` returns 404 or fails), it seamlessly switches to the client-side direct Gemini runner with complete persona instructions, follow-up suggestions, and local session memory.

### Visual Identity & Theme
- **Canvas & Surfaces**: Neutral dark canvas (`#0B0D13`), structural container backgrounds (`#151926` / `#1A1E2E`), with hairline dividers (`border-white/10`).
- **Typography**: Display headings in `Plus Jakarta Sans` / `Outfit`, body in clean `Inter` / `DM Sans`, and API keys / model tags in `JetBrains Mono` (`font-mono text-xs`).
- **Accent Palette**: Rich royal violet (`#7C3AED` to `#6D28D9`) for primary actions, subtle emerald accents (`#10B981`) for valid key status, and crimson (`#EF4444`) for errors.

---

## 3. Key Product Decisions & Trade-Offs

- **Decision 1: Dual-Engine AI Routing (Client Direct + Server Fallback)**
  - *Chosen Approach*: Implement an autonomous client-side Gemini service (`src/utils/geminiClient.ts`) that executes queries directly against Google's API when running on static hosts (Vercel/Netlify), while continuing to support Express backend routes if present.
  - *Why*: Guarantees that deploying the build output (`dist/`) directly to Vercel or Netlify works out of the box with zero server configuration or SQLite failures.
  - *Alternatives Considered*: Vercel Serverless Functions (requires rewriting SQLite backend to Postgres/KV and Vercel-specific adapters, breaking standard local runtimes).
- **Decision 2: Client-Side Session Storage with Local Persistence**
  - *Chosen Approach*: On static deployments without an active backend DB, chat history and memories are persisted in `localStorage` under the user's username namespace.
  - *Why*: Ensures chat history and persona memories persist seamlessly across page refreshes on Vercel/Netlify without needing external database provisioning.

---

## 4. Technical Architecture & Data Strategy

### Architecture & Component Diagram

```
┌─────────────────────────────────────────────────────────────┐
│                 Blackbell AGI Client (SPA)                  │
├──────────────────────────────┬──────────────────────────────┤
│          AuthScreen          │        Main Workspace        │
│  - Email                     │  - Top Bar (Key Manager)     │
│  - Username                  │  - Bell/Black Persona Chat   │
│  - Gemini API Key (Mandatory)│  - History Sidebar           │
│  - Password                  │  - Video & Avatar Canvas     │
└──────────────┬───────────────┴──────────────┬───────────────┘
               │                              │
               ▼                              ▼
     localStorage Storage             Dual AI Dispatcher
  (User, Key, Sessions, Mems)      (src/utils/geminiClient.ts)
                                              │
                    ┌─────────────────────────┴─────────────────────────┐
                    ▼                                                   ▼
         [Vercel / Netlify Mode]                                [Full-Stack Mode]
         Direct Client AI Runner                                Server /api/chat
    (Google Generative Language API)                       (Express + SQLite Engine)
```

### Data Model & State Mapping

- **Auth State (`AuthUser`)**:
  - `email`: string
  - `username`: string
  - `apiKey`: string (persisted in `localStorage.getItem('blackbell_gemini_api_key')`)
  - `isAdmin`: boolean (checked against admin email)
  - `sessionToken`: string
- **Gemini Direct Dispatcher (`generateGeminiDirectMessage`)**:
  - Accepts messages, personality (`bell` | `black`), and user API key.
  - Constructs system prompts with Hinglish girlfriend/warrior persona directives and `[QUESTIONS]` output blocks.
  - Calls `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash:generateContent?key={API_KEY}`.
  - Parses response into text and follow-up deduction questions identical to backend response schema.

---

## 5. Verification & Testing Plan

1. **Auth Screen Validation**: Verify that the Sign Up form displays the API Key input right below the Username field with mask/unmask, paste shortcut, and AI Studio link.
2. **Mandatory Key Enforcement**: Verify that submitting without an API key blocks submission with a clear error prompt.
3. **Key Connectivity Probe**: Test with valid and invalid Gemini API keys to verify inline feedback.
4. **Vercel/Netlify Simulation (Standalone Mode)**: Test chat execution when server endpoints are bypassed, verifying that the client-direct runner delivers responses from Gemini smoothly.
5. **Key Management Modal**: Test changing the key from the top bar settings modal and ensure new chats use the updated key.
6. **Build Verification**: Run `compile_applet` to guarantee complete TypeScript compilation without errors.
