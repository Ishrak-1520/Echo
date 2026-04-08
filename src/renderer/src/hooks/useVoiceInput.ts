/**
 * Drishti — useVoiceInput Hook
 *
 * Provides voice recording/transcription via the Web Speech API
 * (SpeechRecognition). Supports English (en-US) and Bengali (bn-BD).
 *
 * Falls back gracefully if the API is not available.
 */

import { useState, useRef, useCallback, useEffect } from 'react'

interface VoiceInputResult {
  isRecording: boolean
  isSupported: boolean
  transcript: string
  interimTranscript: string
  error: string | null
  startRecording: () => void
  stopRecording: () => void
}

// Electron/Chrome's SpeechRecognition
declare global {
  interface Window {
    SpeechRecognition: typeof SpeechRecognition
    webkitSpeechRecognition: typeof SpeechRecognition
  }
}

const SpeechRecognitionAPI =
  typeof window !== 'undefined'
    ? window.SpeechRecognition ?? window.webkitSpeechRecognition ?? null
    : null

export function useVoiceInput(lang: string = 'en-US'): VoiceInputResult {
  const [isRecording, setIsRecording] = useState(false)
  const [transcript, setTranscript] = useState('')
  const [interimTranscript, setInterimTranscript] = useState('')
  const [error, setError] = useState<string | null>(null)

  const recognitionRef = useRef<SpeechRecognition | null>(null)

  const isSupported = Boolean(SpeechRecognitionAPI)

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      recognitionRef.current?.abort()
    }
  }, [])

  const startRecording = useCallback(() => {
    if (!SpeechRecognitionAPI) {
      setError('Speech recognition is not supported in this browser/environment.')
      return
    }

    // Stop any existing session
    recognitionRef.current?.abort()

    const recognition = new SpeechRecognitionAPI()
    recognition.lang = lang
    recognition.continuous = true       // Keep listening until manually stopped
    recognition.interimResults = true   // Show partial results as user speaks
    recognition.maxAlternatives = 1

    recognition.onstart = () => {
      setIsRecording(true)
      setError(null)
      setTranscript('')
      setInterimTranscript('')
    }

    recognition.onresult = (event: SpeechRecognitionEvent) => {
      let finalText = ''
      let interimText = ''

      for (let i = event.resultIndex; i < event.results.length; i++) {
        const result = event.results[i]
        if (result.isFinal) {
          finalText += result[0].transcript + ' '
        } else {
          interimText += result[0].transcript
        }
      }

      if (finalText) {
        // Commit final transcript
        setTranscript((prev) => (prev + finalText).trim())
      }
      setInterimTranscript(interimText)
    }

    recognition.onerror = (event: SpeechRecognitionErrorEvent) => {
      const msg = event.error === 'no-speech'
        ? 'No speech detected. Please try again.'
        : event.error === 'not-allowed'
          ? 'Microphone permission denied. Allow mic access in Windows Settings.'
          : `Voice error: ${event.error}`

      setError(msg)
      setIsRecording(false)
      setInterimTranscript('')
    }

    recognition.onend = () => {
      setIsRecording(false)
      setInterimTranscript('')
    }

    recognitionRef.current = recognition

    try {
      recognition.start()
    } catch (e) {
      setError(`Could not start recording: ${e instanceof Error ? e.message : String(e)}`)
      setIsRecording(false)
    }
  }, [lang])

  const stopRecording = useCallback(() => {
    recognitionRef.current?.stop()
    setIsRecording(false)
    setInterimTranscript('')
  }, [])

  return {
    isRecording,
    isSupported,
    transcript,
    interimTranscript,
    error,
    startRecording,
    stopRecording
  }
}
