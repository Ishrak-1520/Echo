# ইকো · Echo

> **AI-powered screen assistant that follows your cursor**
> Ask anything about your screen — in English or বাংলা — using text or voice.

---

## Features

| Feature | Details |
|---|---|
| **Floating Cursor** | Custom icon follows your mouse at all times |
| **Custom Keybinding** | Set any global shortcut to activate Echo |
| **Screen Capture** | Automatically screenshots your screen on activation |
| **AI Vision** | Uses LongCat-Flash-Omni-2603 to see & understand your screen |
| **Bilingual** | Full English & বাংলা (Bengali) support for input & output |
| **Voice Input** | Speak your questions in English or Bangla |
| **Voice Output** | Hear AI responses read aloud via Windows TTS |
| **Text Output** | See responses in a floating chat bubble |
| **Toggle Controls** | Switch text/voice output per-session from the chat panel |
| **Settings Panel** | Configure everything without editing files |
| **Refresh Screenshot** | Ask follow-up questions with a fresh screen capture |
| **Chat History** | Full conversation context within a session |

---

## Quick Start

### Prerequisites
- **Node.js** v18+ ([nodejs.org](https://nodejs.org))
- **npm** v9+
- **Windows 10/11** (64-bit)
- A **LongCat API key** → [longcat.chat/platform/api_keys](https://longcat.chat/platform/api_keys)

### 1 — Clone & Install

```bash
git clone <your-repo-url>
cd echo
npm install
```

### 2 — Configure API Key

```bash
# Copy the example env file
copy .env.example .env

# Edit .env and add your key:
# VITE_LONGCAT_API_KEY=your_key_here
```

> Alternatively, you can enter the API key inside the app via **Settings → LongCat API Key**.

### 3 — Run in Development

```bash
npm run dev
```

The app starts silently in your system tray.  
Press **`Ctrl+Shift+D`** (default) to activate Echo.

### 4 — Build Windows Installer

```bash
npm run dist:win
```

The installer `.exe` will appear in the `dist/` folder.

---

## How to Use

### Activating Echo
1. Press your activation shortcut (default: **`Ctrl+Shift+D`**)
2. Echo captures your screen instantly
3. A chat panel appears near your cursor

### Asking Questions
- **Type** your question in English or বাংলা and press **Enter**
- **Voice**: Click to speak, click to stop
- **Refresh screenshot**: Click to capture the current screen state before sending

### Output Controls (per-session)
| Button | Action |
|---|---|
| Toggle text response display |
| Toggle voice (TTS) reading aloud |

Both can be active at the same time.

### Language Toggle
- **EN** → English voice recognition + English TTS voice
- **বাং** → Bengali voice recognition + Bengali TTS voice

> Auto-detect (default): Echo detects Bengali Unicode automatically.

### Closing Echo
- Press **`Escape`**
- Click the X button
- Click anywhere outside the chat panel (the dim backdrop)

---

## Settings

Access via: button in chat panel or **System Tray → Settings**

| Setting | Description |
|---|---|
| **LongCat API Key** | Your API key for the AI backend |
| **Activation Shortcut** | Click "Record" and press your desired combo |
| **Default Language** | Auto / English / বাংলা |
| **Default Output Mode** | Text, Voice, or Both |
| **Custom Cursor Icon** | Upload your own PNG/SVG image |

Settings are saved automatically to `%APPDATA%/echo/echo-settings.json`.

---

## Custom Cursor Icon

Echo uses a built-in **glowing eye SVG** (the ইকো symbol) by default.

To use your own icon:

**Option A — In-App (recommended)**
1. Open Settings
2. Under "Custom Cursor Icon", click **Choose Image**
3. Select any PNG, JPG, SVG, or GIF

**Option B — Resource File**
Place your icon at `resources/cursor.png` (36–64px square works best).

---

## Project Structure

```
echo/
├── src/
│   ├── main/
│   │   └── index.ts          # Electron main process
│   │                         #   • Overlay window management
│   │                         #   • Cursor position polling (60fps)
│   │                         #   • Global shortcut registration
│   │                         #   • Screen capture (desktopCapturer)
│   │                         #   • Settings persistence
│   │                         #   • System tray
│   ├── preload/
│   │   └── index.ts          # Secure IPC bridge
│   └── renderer/src/
│       ├── App.tsx            # Root component & state manager
│       ├── types.ts           # TypeScript interfaces
│       ├── components/
│       │   ├── FloatingCursor.tsx   # The following cursor icon
│       │   ├── ChatPanel.tsx        # Main chat UI
│       │   └── SettingsPanel.tsx    # Settings configuration UI
│       ├── services/
│       │   ├── longcat.ts     # LongCat API (vision + text AI)
│       │   └── speech.ts      # Web Speech API (TTS)
│       ├── hooks/
│       │   └── useVoiceInput.ts  # SpeechRecognition hook
│       └── styles/
│           └── index.css      # Dark glass morphism theme
├── resources/                 # App icons (add icon.ico here)
├── .env.example               # Environment variables template
├── electron.vite.config.ts    # Electron-Vite build config
├── electron-builder.json5     # Windows installer config
└── package.json
```

---

## AI Models Used

| Model | Purpose |
|---|---|
| `LongCat-Flash-Omni-2603` | When screenshot is available — sees the screen + understands your question |
| `LongCat-Flash-Chat` | Text-only fallback (no screenshot) |

Both models support multilingual responses (English + Bengali).

API: [longcat.chat/platform/docs](https://longcat.chat/platform/docs)

---

## Voice Technology

| Direction | Technology | Languages |
|---|---|---|
| **Input** (you → Echo) | Web Speech API (SpeechRecognition) | en-US, bn-BD |
| **Output** (Echo → you) | Web Speech API (speechSynthesis) | en-US, bn-BD/bn-IN |

> Bengali TTS requires a Bengali voice installed on Windows.
> Install from: **Settings → Time & Language → Speech → Add voices → বাংলা (Bangladesh)**

---

## Troubleshooting

**Echo doesn't activate**
- Check the activation shortcut isn't used by another app
- Try changing the shortcut in Settings
- Restart the app after changing shortcuts

**No AI response / API error**
- Verify your LongCat API key in Settings
- Check your daily quota at [longcat.chat/platform/usage](https://longcat.chat/platform/usage)
- Ensure you have internet access

**Voice input not working**
- Click 🎙 and allow microphone access if prompted
- Go to **Windows Settings → Privacy → Microphone** → ensure apps can access mic
- Try selecting a specific language (EN or বাং) instead of Auto

**No Bengali voice for TTS**
- Install Bengali language pack:
  **Settings → Time & Language → Language → Add a language → বাংলা (Bangladesh)**
  Then: **Language options → Download speech pack**

**Cursor icon not visible**
- The cursor icon appears slightly offset from your actual cursor (by design)
- Make sure the overlay window is not hidden behind a full-screen exclusive app

---

## 📄 License

MIT — build freely, ship boldly.

---

*ইকো means "Echo" — AI that hears you and sees for you.*
