/**
 * Echo — App.tsx
 * Root component. Manages global state, IPC communication with
 * Electron main process, and orchestrates all UI sub-components.
 */

import { useState, useEffect, useRef, useCallback } from 'react'
import FloatingCursor from './components/FloatingCursor'
import ChatPanel from './components/ChatPanel'
import SettingsPanel from './components/SettingsPanel'
import { askLongCat } from './services/longcat'
import { speak, stopSpeaking } from './services/speech'
import type { EchoSettings, Message } from './types'

export default function App() {
  // ── Cursor ──────────────────────────────────────────────────────────────────
  const [cursorPos, setCursorPos] = useState({ x: 0, y: 0 })
  const activationPosRef = useRef({ x: 0, y: 0 })

  // ── Activation state ────────────────────────────────────────────────────────
  const [isActive, setIsActive] = useState(false)
  const [screenshotB64, setScreenshotB64] = useState<string | null>(null)

  // ── Chat ────────────────────────────────────────────────────────────────────
  const [messages, setMessages] = useState<Message[]>([])
  const [isLoading, setIsLoading] = useState(false)

  // ── Settings ────────────────────────────────────────────────────────────────
  const [settings, setSettings] = useState<EchoSettings>({
    activationShortcut: 'Ctrl+Shift+D',
    apiKey: import.meta.env.VITE_LONGCAT_API_KEY ?? '',
    language: 'auto',
    outputText: true,
    outputVoice: true,
    cursorIconPath: ''
  })
  const [showSettings, setShowSettings] = useState(false)

  // ── Load persisted settings from main process ────────────────────────────────
  useEffect(() => {
    window.electronAPI
      .invoke('get-settings')
      .then((saved) => {
        if (saved) {
          const s = saved as EchoSettings
          // API key: prefer .env, fall back to saved
          setSettings((prev) => ({
            ...s,
            apiKey: import.meta.env.VITE_LONGCAT_API_KEY || s.apiKey || prev.apiKey
          }))
        }
      })
      .catch(console.error)
  }, [])

  // ── IPC: cursor position ─────────────────────────────────────────────────────
  useEffect(() => {
    const cleanup = window.electronAPI.on('cursor-position', (...args) => {
      const pos = args[0] as { x: number; y: number }
      setCursorPos(pos)
    })
    return cleanup
  }, [])

  // ── IPC: activation toggle ───────────────────────────────────────────────────
  useEffect(() => {
    const cleanup = window.electronAPI.on('echo-activate', (...args) => {
      const payload = args[0] as { active: boolean; screenshot: string | null }

      if (payload.active) {
        // Capture the position at moment of activation
        activationPosRef.current = { ...cursorPos }
        setScreenshotB64(payload.screenshot)
        setIsActive(true)
        stopSpeaking()
      } else {
        setIsActive(false)
        setShowSettings(false)
      }
    })
    return cleanup
  }, [cursorPos])

  // ── IPC: show settings panel ─────────────────────────────────────────────────
  useEffect(() => {
    const cleanup = window.electronAPI.on('show-settings', (...args) => {
      const show = args[0] as boolean
      setShowSettings(show)
      if (show) setIsActive(true)
    })
    return cleanup
  }, [])

  // ── Keyboard: Escape to close ────────────────────────────────────────────────
  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      if (e.key === 'Escape' && (isActive || showSettings)) {
        handleDeactivate()
      }
    }
    window.addEventListener('keydown', handler)
    return () => window.removeEventListener('keydown', handler)
  }, [isActive, showSettings])

  // ── Deactivate ───────────────────────────────────────────────────────────────
  const handleDeactivate = useCallback(() => {
    setIsActive(false)
    setShowSettings(false)
    stopSpeaking()
    window.electronAPI.send('deactivate')
  }, [])

  // ── Send message ─────────────────────────────────────────────────────────────
  const handleSend = useCallback(
    async (text: string, freshScreenshot?: string) => {
      if (!text.trim()) return

      const userMsg: Message = {
        id: crypto.randomUUID(),
        role: 'user',
        content: text,
        timestamp: new Date()
      }
      setMessages((prev) => [...prev, userMsg])
      setIsLoading(true)

      try {
        // Use fresh screenshot if provided, else use activation-time screenshot
        const screenshot = freshScreenshot ?? screenshotB64

        const response = await askLongCat({
          question: text,
          screenshotBase64: screenshot,
          conversationHistory: messages,
          apiKey: settings.apiKey,
          language: settings.language
        })

        const aiMsg: Message = {
          id: crypto.randomUUID(),
          role: 'assistant',
          content: response,
          timestamp: new Date()
        }
        setMessages((prev) => [...prev, aiMsg])

        // TTS output if voice mode is on
        if (settings.outputVoice) {
          const lang =
            settings.language === 'auto'
              ? detectLanguage(text)
              : settings.language === 'bn'
                ? 'bn-BD'
                : 'en-US'
          speak(response, lang)
        }
      } catch (err) {
        const errorMsg: Message = {
          id: crypto.randomUUID(),
          role: 'assistant',
          content: `⚠️ Error: ${err instanceof Error ? err.message : 'Something went wrong. Check your API key in Settings.'}`,
          timestamp: new Date()
        }
        setMessages((prev) => [...prev, errorMsg])
      } finally {
        setIsLoading(false)
      }
    },
    [messages, screenshotB64, settings]
  )

  // ── Save settings ────────────────────────────────────────────────────────────
  const handleSaveSettings = useCallback(async (updated: EchoSettings) => {
    setSettings(updated)
    await window.electronAPI.invoke('save-settings', updated)
  }, [])

  // ── Language auto-detect (simple heuristic) ──────────────────────────────────
  function detectLanguage(text: string): string {
    // Check for Bangla Unicode range (0x0980–0x09FF)
    const banglaPattern = /[\u0980-\u09FF]/
    return banglaPattern.test(text) ? 'bn-BD' : 'en-US'
  }

  // ── Render ───────────────────────────────────────────────────────────────────
  return (
    <div className="echo-root">
      {/* Floating cursor icon — always visible */}
      <FloatingCursor
        pos={cursorPos}
        isActive={isActive}
        iconPath={settings.cursorIconPath}
      />

      {/* Dim backdrop when active */}
      {isActive && (
        <div className="echo-backdrop" onClick={handleDeactivate} />
      )}

      {/* Settings panel */}
      {showSettings && (
        <SettingsPanel
          settings={settings}
          onSave={handleSaveSettings}
          onClose={() => {
            setShowSettings(false)
            if (!messages.length) handleDeactivate()
          }}
        />
      )}

      {/* Chat panel — shown when active and not in settings */}
      {isActive && !showSettings && (
        <ChatPanel
          activationPos={activationPosRef.current}
          messages={messages}
          isLoading={isLoading}
          settings={settings}
          screenshotB64={screenshotB64}
          onSend={handleSend}
          onClose={handleDeactivate}
          onOpenSettings={() => setShowSettings(true)}
          onChangeOutputMode={(text, voice) =>
            setSettings((s) => ({ ...s, outputText: text, outputVoice: voice }))
          }
          onClearChat={() => {
            setMessages([])
            stopSpeaking()
          }}
        />
      )}
    </div>
  )
}
