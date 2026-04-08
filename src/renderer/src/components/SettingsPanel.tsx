/**
 * Echo — SettingsPanel Component
 * Now features Lucide icons.
 */

import { useState, useRef, useEffect } from 'react'
import { Settings, X, Image as ImageIcon, Key, Command, Speech, Monitor, CheckCircle2 } from 'lucide-react'
import type { EchoSettings } from '../types'

interface SettingsPanelProps {
  settings: EchoSettings
  onSave: (settings: EchoSettings) => Promise<void>
  onClose: () => void
}

export default function SettingsPanel({ settings, onSave, onClose }: SettingsPanelProps) {
  const [form, setForm] = useState<EchoSettings>({ ...settings })
  const [isRecordingKey, setIsRecordingKey] = useState(false)
  const [isSaving, setIsSaving] = useState(false)
  const [savedMsg, setSavedMsg] = useState('')
  const keybindRef = useRef<HTMLButtonElement>(null)

  const update = <K extends keyof EchoSettings>(key: K, value: EchoSettings[K]) => {
    setForm((prev) => ({ ...prev, [key]: value }))
  }

  useEffect(() => {
    if (!isRecordingKey) return

    const handler = (e: KeyboardEvent) => {
      e.preventDefault()
      if (e.key === 'Escape') {
        setIsRecordingKey(false)
        return
      }

      const parts: string[] = []
      if (e.ctrlKey) parts.push('Ctrl')
      if (e.altKey) parts.push('Alt')
      if (e.shiftKey) parts.push('Shift')
      if (e.metaKey) parts.push('Meta')

      const key = e.key
      if (!['Control', 'Alt', 'Shift', 'Meta'].includes(key)) {
        const displayKey = key.length === 1 ? key.toUpperCase() : key
        parts.push(displayKey)
        update('activationShortcut', parts.join('+'))
        setIsRecordingKey(false)
      }
    }

    window.addEventListener('keydown', handler)
    return () => window.removeEventListener('keydown', handler)
  }, [isRecordingKey])

  const handleSave = async () => {
    setIsSaving(true)
    try {
      await onSave(form)
      setSavedMsg('Saved!')
      setTimeout(() => setSavedMsg(''), 2000)
    } catch (e) {
      setSavedMsg('Save failed')
    } finally {
      setIsSaving(false)
    }
  }

  const handlePickIcon = () => {
    const input = document.createElement('input')
    input.type = 'file'
    input.accept = 'image/png,image/jpeg,image/gif,image/webp,image/svg+xml'
    input.onchange = (e) => {
      const file = (e.target as HTMLInputElement).files?.[0]
      if (file) {
        const reader = new FileReader()
        reader.onload = () => update('cursorIconPath', reader.result as string)
        reader.readAsDataURL(file)
      }
    }
    input.click()
  }

  return (
    <div className="settings-panel" onClick={(e) => e.stopPropagation()}>
      <div className="settings-panel__header">
        <h2 className="settings-title">
          <Settings size={16} className="title-icon" /> Settings
        </h2>
        <button className="ctrl-btn close-btn" onClick={onClose} title="Close (Esc)">
          <X size={16} />
        </button>
      </div>

      <div className="settings-body">
        <section className="settings-section">
          <label className="settings-label">
            <Key size={14} className="label-icon" /> LongCat API Key
            <span className="settings-hint">
              Get yours at{' '}
              <a href="https://longcat.chat/platform/api_keys" target="_blank" rel="noreferrer" className="settings-link">
                longcat.chat
              </a>
            </span>
          </label>
          <input
            type="password"
            className="settings-input"
            value={form.apiKey}
            onChange={(e) => update('apiKey', e.target.value)}
            placeholder="Your LongCat API key..."
            autoComplete="off"
          />
          <p className="settings-note">
            You can also set this in <code>.env</code> as <code>VITE_LONGCAT_API_KEY</code>
          </p>
        </section>

        <section className="settings-section">
          <label className="settings-label">
            <Command size={14} className="label-icon" /> Activation Shortcut
            <span className="settings-hint">Global keybinding to activate Echo</span>
          </label>
          <div className="keybind-row">
            <div className={`keybind-display ${isRecordingKey ? 'keybind-display--recording' : ''}`}>
              {isRecordingKey ? 'Press your shortcut...' : form.activationShortcut}
            </div>
            <button
              ref={keybindRef}
              className={`settings-btn ${isRecordingKey ? 'settings-btn--danger' : ''}`}
              onClick={() => setIsRecordingKey((v) => !v)}
            >
              {isRecordingKey ? '⏹ Cancel' : '⌨ Record'}
            </button>
          </div>
        </section>

        <section className="settings-section">
          <label className="settings-label">
            <Speech size={14} className="label-icon" /> Default Language
            <span className="settings-hint">Language for voice & text I/O</span>
          </label>
          <div className="settings-radio-group">
            {[
              { value: 'auto', label: 'Auto-detect', hint: 'Detects Bengali Unicode' },
              { value: 'en', label: 'English', hint: 'en-US' },
              { value: 'bn', label: 'বাংলা', hint: 'bn-BD' }
            ].map((opt) => (
              <label key={opt.value} className="radio-option">
                <input
                  type="radio"
                  name="language"
                  value={opt.value}
                  checked={form.language === opt.value}
                  onChange={() => update('language', opt.value as EchoSettings['language'])}
                />
                <span className="radio-label">{opt.label}</span>
                <span className="radio-hint">{opt.hint}</span>
              </label>
            ))}
          </div>
        </section>

        <section className="settings-section">
          <label className="settings-label">
            <Monitor size={14} className="label-icon" /> Default Output Mode
            <span className="settings-hint">Can also be toggled per-session in chat</span>
          </label>
          <div className="settings-checkbox-group">
            <label className="checkbox-option">
              <input
                type="checkbox"
                checked={form.outputText}
                onChange={(e) => update('outputText', e.target.checked)}
              />
              <span>Show text responses</span>
            </label>
            <label className="checkbox-option">
              <input
                type="checkbox"
                checked={form.outputVoice}
                onChange={(e) => update('outputVoice', e.target.checked)}
              />
              <span>Speak responses aloud (TTS)</span>
            </label>
          </div>
        </section>

        <section className="settings-section">
          <label className="settings-label">
            <ImageIcon size={14} className="label-icon" /> Custom Cursor Icon
            <span className="settings-hint">Replace the default AI spark</span>
          </label>
          <div className="cursor-icon-row">
            {form.cursorIconPath && (
              <img
                src={form.cursorIconPath}
                width={36}
                height={36}
                alt="Custom cursor"
                className="cursor-preview"
              />
            )}
            <button className="settings-btn" onClick={handlePickIcon}>
              <ImageIcon size={14} className="inline-icon" /> {form.cursorIconPath ? 'Change Image' : 'Choose Image'}
            </button>
            {form.cursorIconPath && (
              <button
                className="settings-btn settings-btn--ghost"
                onClick={() => update('cursorIconPath', '')}
              >
                <X size={14} className="inline-icon" /> Remove
              </button>
            )}
          </div>
          {!form.cursorIconPath && (
            <p className="settings-note">No icon selected — using default AI spark</p>
          )}
        </section>
      </div>

      <div className="settings-footer">
        {savedMsg && (
          <span className="save-msg">
            <CheckCircle2 size={14} /> {savedMsg}
          </span>
        )}
        <button className="settings-btn settings-btn--ghost" onClick={onClose}>
          Cancel
        </button>
        <button className="settings-btn settings-btn--primary" onClick={handleSave} disabled={isSaving}>
          {isSaving ? 'Saving...' : 'Save Changes'}
        </button>
      </div>
    </div>
  )
}
