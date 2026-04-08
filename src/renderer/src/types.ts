/**
 * Echo — Shared Types
 */

export interface EchoSettings {
  activationShortcut: string
  apiKey: string
  language: 'en' | 'bn' | 'auto'
  outputText: boolean
  outputVoice: boolean
  cursorIconPath: string
}

export interface Message {
  id: string
  role: 'user' | 'assistant'
  content: string
  timestamp: Date
}
