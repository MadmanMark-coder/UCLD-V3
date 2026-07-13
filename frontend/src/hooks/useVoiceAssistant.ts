import { useState, useEffect, useRef, useCallback } from 'react'
import { SpeechService } from '../services/speech'

interface VoiceAssistantState {
  isSupported: boolean
  isListening: boolean
  isSpeaking: boolean
  transcript: string
  isProcessing: boolean
  error: string | null
}

interface VoiceAssistantActions {
  startListening: () => void
  stopListening: () => void
  clear: () => void
  speakResponse: (text: string) => void
}

export function useVoiceAssistant(onTranscript?: (text: string) => void): VoiceAssistantState & VoiceAssistantActions {
  const [isListening, setIsListening] = useState(false)
  const [isSpeaking, setIsSpeaking] = useState(false)
  const [transcript, setTranscript] = useState('')
  const [isProcessing, setIsProcessing] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [isSupported, setIsSupported] = useState(false)
  const speechRef = useRef<SpeechService | null>(null)
  const intervalRef = useRef<ReturnType<typeof setInterval> | null>(null)

  useEffect(() => {
    const speech = new SpeechService()
    speechRef.current = speech
    setIsSupported(speech.isSupported)

    speech.onResult((text, isFinal) => {
      setTranscript(text)
      if (isFinal && onTranscript) {
        onTranscript(text)
        setTranscript('')
      }
    })

    speech.onError((err) => {
      setError(err)
      setIsListening(false)
    })

    return () => {
      speech.stopListening()
      speech.stopSpeaking()
    }
  }, [onTranscript])

  useEffect(() => {
    if (intervalRef.current) {
      clearInterval(intervalRef.current)
      intervalRef.current = null
    }
    if (speechRef.current) {
      intervalRef.current = setInterval(() => {
        const speaking = speechRef.current?.isSpeaking ?? false
        setIsSpeaking(speaking)
      }, 200)
    }
    return () => {
      if (intervalRef.current) clearInterval(intervalRef.current)
    }
  }, [isListening])

  const startListening = useCallback(() => {
    setError(null)
    setTranscript('')
    setIsListening(true)
    speechRef.current?.startListening()
  }, [])

  const stopListening = useCallback(() => {
    speechRef.current?.stopListening()
    setIsListening(false)
  }, [])

  const speakResponse = useCallback((text: string) => {
    speechRef.current?.speak(text)
  }, [])

  const clear = useCallback(() => {
    setTranscript('')
    setError(null)
  }, [])

  return {
    isSupported,
    isListening,
    isSpeaking,
    transcript,
    isProcessing,
    error,
    startListening,
    stopListening,
    clear,
    speakResponse,
  }
}
