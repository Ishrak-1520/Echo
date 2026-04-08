/**
 * Echo — ChatPanel Component
 * Now features Lucide icons and a modern premium design.
 */

import { useState, useRef, useEffect, useCallback } from 'react'
import { 
  Mic, 
  Square, 
  Send, 
  Settings, 
  X, 
  Languages, 
  Type, 
  Volume2, 
  Trash2, 
  RefreshCw, 
  MessageSquare,
  Sparkles
} from 'lucide-react'
import type { Message, EchoSettings } from '../types'
import { useVoiceInput } from '../hooks/useVoiceInput'

interface ChatPanelProps {
  activationPos: { x: number; y: number }
  messages: Message[]
  isLoading: boolean
  settings: EchoSettings
  screenshotB64: string | null
  onSend: (text: string, freshScreenshot?: string) => Promise<void>
  onClose: () => void
  onOpenSettings: () => void
  onChangeOutputMode: (text: boolean, voice: boolean) => void
  onClearChat: () => void
}

const SCREEN_MARGIN = 24
const PANEL_WIDTH = 420
const PANEL_MAX_HEIGHT = 560

export default function ChatPanel({
  activationPos,
  messages,
  isLoading,
  settings,
  screenshotB64,
  onSend,
  onClose,
  onOpenSettings,
  onChangeOutputMode,
  onClearChat
}: ChatPanelProps) {
  const [inputText, setInputText] = useState('')
  const [language, setLanguage] = useState<'en' | 'bn'>(settings.language === 'bn' ? 'bn' : 'en')
  const [outputText, setOutputText] = useState(settings.outputText)
  const [outputVoice, setOutputVoice] = useState(settings.outputVoice)
  const [isTakingScreenshot, setIsTakingScreenshot] = useState(false)

  const textareaRef = useRef<HTMLTextAreaElement>(null)
  const messagesEndRef = useRef<HTMLDivElement>(null)

  const { isRecording, startRecording, stopRecording, transcript } = useVoiceInput(
    language === 'bn' ? 'bn-BD' : 'en-US'
  )

  useEffect(() => {
    if (transcript) setInputText((prev) => (prev ? prev + ' ' + transcript : transcript))
  }, [transcript])

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' })
  }, [messages, isLoading])

  useEffect(() => {
    setTimeout(() => textareaRef.current?.focus(), 100)
  }, [])

  useEffect(() => {
    onChangeOutputMode(outputText, outputVoice)
  }, [outputText, outputVoice])

  const panelStyle = (() => {
    const screenW = window.screen.width
    const screenH = window.screen.height
    let left = activationPos.x + 24
    let top = activationPos.y - 40

    if (left + PANEL_WIDTH + SCREEN_MARGIN > screenW) {
      left = activationPos.x - PANEL_WIDTH - 24
    }
    left = Math.max(SCREEN_MARGIN, Math.min(left, screenW - PANEL_WIDTH - SCREEN_MARGIN))
    top = Math.max(SCREEN_MARGIN, Math.min(top, screenH - PANEL_MAX_HEIGHT - SCREEN_MARGIN))

    return { left, top }
  })()

  const handleSend = useCallback(async () => {
    const text = inputText.trim()
    if (!text || isLoading) return
    setInputText('')
    await onSend(text)
  }, [inputText, isLoading, onSend])

  const handleSendFreshScreenshot = useCallback(async () => {
    const text = inputText.trim()
    if (!text || isLoading) return

    setIsTakingScreenshot(true)
    try {
      const fresh = (await window.electronAPI.invoke('take-screenshot')) as string | null
      setInputText('')
      await onSend(text, fresh ?? undefined)
    } finally {
      setIsTakingScreenshot(false)
    }
  }, [inputText, isLoading, onSend])

  const handleKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault()
      handleSend()
    }
  }

  const toggleVoice = () => {
    if (isRecording) stopRecording()
    else startRecording()
  }

  const currentLang = language === 'bn' ? 'bn-BD' : 'en-US'

  return (
    <div
      className="chat-panel"
      style={{ left: panelStyle.left, top: panelStyle.top, width: PANEL_WIDTH }}
      onClick={(e) => e.stopPropagation()}
    >
      {/* ── Header ── */}
      <div className="chat-panel__header">
        <div className="chat-panel__logo">
          <Sparkles className="chat-panel__logo-icon" size={18} strokeWidth={2.5} />
          <span className="chat-panel__logo-text">ইকো</span>
          <span className="chat-panel__logo-sub">Echo</span>
        </div>

        <div className="chat-panel__controls">
          <button
            className={`ctrl-btn lang-btn ${language === 'en' ? 'lang-btn--active' : ''}`}
            onClick={() => setLanguage('en')}
            title="English"
          >
            EN
          </button>
          <button
            className={`ctrl-btn lang-btn ${language === 'bn' ? 'lang-btn--active' : ''}`}
            onClick={() => setLanguage('bn')}
            title="বাংলা"
          >
            বাং
          </button>

          <div className="chat-panel__divider" />

          <button
            className={`ctrl-btn output-btn ${outputText ? 'output-btn--active' : ''}`}
            onClick={() => setOutputText((v) => !v)}
            title="Toggle text responses"
          >
            <Type size={14} />
          </button>
          <button
            className={`ctrl-btn output-btn ${outputVoice ? 'output-btn--active' : ''}`}
            onClick={() => setOutputVoice((v) => !v)}
            title="Toggle voice responses"
          >
            <Volume2 size={14} />
          </button>

          <div className="chat-panel__divider" />

          {messages.length > 0 && (
            <button className="ctrl-btn" onClick={onClearChat} title="Clear conversation">
              <Trash2 size={14} />
            </button>
          )}
          <button className="ctrl-btn" onClick={onOpenSettings} title="Settings">
            <Settings size={14} />
          </button>
          <button className="ctrl-btn close-btn" onClick={onClose} title="Close (Esc)">
            <X size={16} />
          </button>
        </div>
      </div>

      {/* ── Context line ── */}
      <div className="chat-panel__context-bar">
        <span className={`context-dot ${screenshotB64 ? 'context-dot--vision' : 'context-dot--blind'}`} />
        <span className="context-text">
          {screenshotB64
            ? "I can see your screen"
            : "No screenshot captured"}
        </span>
      </div>

      {/* ── Messages ── */}
      <div className="chat-panel__messages">
        {messages.length === 0 && (
          <div className="chat-panel__empty">
            <MessageSquare size={36} className="empty-icon" strokeWidth={1} />
            <p className="empty-title">
              {language === 'bn' ? 'আমি কীভাবে সাহায্য করতে পারি?' : 'What do you need help with?'}
            </p>
            <p className="empty-hint">
              {language === 'bn'
                ? 'স্ক্রিনে যা দেখছেন সে সম্পর্কে যেকোনো প্রশ্ন করুন'
                : 'Ask me anything about what\'s on your screen'}
            </p>
          </div>
        )}

        {messages.map((msg) => (
          <div key={msg.id} className={`message message--${msg.role}`}>
            <div className="message__bubble">
              {outputText || msg.role === 'user' ? (
                <span className="message__text">{msg.content}</span>
              ) : (
                <span className="message__text message__text--voice-only">
                  <Volume2 size={12} className="inline-icon" /> {language === 'bn' ? 'উত্তর শুনুন' : 'Listen to response'}
                </span>
              )}
            </div>
            <div className="message__time">
              {msg.timestamp.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
            </div>
          </div>
        ))}

        {isLoading && (
          <div className="message message--assistant">
            <div className="message__bubble">
              <div className="thinking-dots">
                <span /><span /><span />
              </div>
            </div>
          </div>
        )}

        <div ref={messagesEndRef} />
      </div>

      {/* ── Input area ── */}
      <div className="chat-panel__input-area">
        <div className={`input-wrapper ${isRecording ? 'input-wrapper--recording' : ''}`}>
          <textarea
            ref={textareaRef}
            className="chat-input"
            value={inputText}
            onChange={(e) => setInputText(e.target.value)}
            onKeyDown={handleKeyDown}
            placeholder={
              isRecording
                ? language === 'bn' ? 'শুনছি...' : 'Listening...'
                : language === 'bn' ? 'প্রশ্ন লিখুন... (Enter পাঠাতে)' : 'Ask anything... (Enter to send)'
            }
            rows={2}
            disabled={isRecording}
            lang={currentLang}
          />

          <div className="input-actions">
            <button
              className={`action-btn mic-btn ${isRecording ? 'mic-btn--recording' : ''}`}
              onClick={toggleVoice}
              title={isRecording ? 'Stop recording' : 'Start voice input'}
            >
              {isRecording ? <Square size={14} fill="currentColor" /> : <Mic size={16} />}
            </button>

            <button
              className="action-btn screenshot-btn"
              onClick={handleSendFreshScreenshot}
              disabled={!inputText.trim() || isLoading}
              title="Refresh screen & send"
            >
              <RefreshCw size={14} className={isTakingScreenshot ? 'spin' : ''} />
            </button>

            <button
              className="action-btn send-btn"
              onClick={handleSend}
              disabled={!inputText.trim() || isLoading}
              title="Send (Enter)"
            >
              <Send size={15} />
            </button>
          </div>
        </div>
      </div>
    </div>
  )
}
