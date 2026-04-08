/**
 * Echo — Speech Service
 * Text-to-Speech (TTS) using Web Speech API — free, built-in to Windows,
 * supports English (en-US) and Bengali (bn-BD / bn-IN).
 */

// ─── TTS ──────────────────────────────────────────────────────────────────────

let currentUtterance: SpeechSynthesisUtterance | null = null

/**
 * Speak text aloud using the best available voice for the given language.
 * @param text    The text to speak
 * @param lang    BCP-47 language tag e.g. 'en-US' | 'bn-BD'
 */
export function speak(text: string, lang: string = 'en-US'): void {
  if (!window.speechSynthesis) {
    console.warn('[Echo] Web Speech API not available')
    return
  }

  // Stop any current speech
  stopSpeaking()

  const utterance = new SpeechSynthesisUtterance(text)
  utterance.lang = lang
  utterance.rate = 1.0
  utterance.pitch = 1.0
  utterance.volume = 1.0

  // Try to find a voice that matches the language
  const voices = window.speechSynthesis.getVoices()
  const matchedVoice =
    voices.find((v) => v.lang === lang) ??
    voices.find((v) => v.lang.startsWith(lang.split('-')[0])) ??
    null

  if (matchedVoice) {
    utterance.voice = matchedVoice
  }

  // Slow down slightly for Bengali to improve clarity
  if (lang.startsWith('bn')) {
    utterance.rate = 0.85
  }

  currentUtterance = utterance
  window.speechSynthesis.speak(utterance)
}

/** Stop any ongoing speech immediately */
export function stopSpeaking(): void {
  if (window.speechSynthesis?.speaking) {
    window.speechSynthesis.cancel()
  }
  currentUtterance = null
}

/** Check if currently speaking */
export function isSpeaking(): boolean {
  return window.speechSynthesis?.speaking ?? false
}

/**
 * Get all available voices for a language.
 * Useful for letting users pick their preferred voice in settings.
 */
export function getVoicesForLang(lang: string): SpeechSynthesisVoice[] {
  const voices = window.speechSynthesis?.getVoices() ?? []
  return voices.filter(
    (v) => v.lang === lang || v.lang.startsWith(lang.split('-')[0])
  )
}

// Preload voices (Chrome/Electron loads them async)
if (window.speechSynthesis) {
  window.speechSynthesis.getVoices()
  window.speechSynthesis.onvoiceschanged = () => {
    window.speechSynthesis.getVoices() // triggers cache
  }
}
