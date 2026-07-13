type ResultCallback = (transcript: string, isFinal: boolean) => void
type ErrorCallback = (error: string) => void

export class SpeechService {
  private recognition: SpeechRecognition | null = null
  private synthesis: SpeechSynthesis
  private _isSupported = false
  private _onResult: ResultCallback | null = null
  private _onError: ErrorCallback | null = null

  constructor() {
    this.synthesis = window.speechSynthesis

    const SpeechRecognitionAPI = window.SpeechRecognition || window.webkitSpeechRecognition
    if (SpeechRecognitionAPI) {
      this.recognition = new SpeechRecognitionAPI()
      this._isSupported = true
      this._setupRecognition()
    }
  }

  private _setupRecognition() {
    if (!this.recognition) return
    this.recognition.continuous = false
    this.recognition.interimResults = true
    this.recognition.lang = 'en-US'

    this.recognition.onresult = (event: SpeechRecognitionEvent) => {
      const last = event.results[event.results.length - 1]
      const transcript = last[0].transcript
      const isFinal = last.isFinal
      this._onResult?.(transcript, isFinal)
    }

    this.recognition.onerror = (event: SpeechRecognitionErrorEvent) => {
      this._onError?.(event.error)
    }
  }

  get isSupported(): boolean {
    return this._isSupported
  }

  startListening(lang = 'en-US') {
    if (!this.recognition) return
    try {
      this.recognition.lang = lang
      this.recognition.start()
    } catch {
      // already started
    }
  }

  stopListening() {
    if (!this.recognition) return
    try {
      this.recognition.stop()
    } catch {
      // already stopped
    }
  }

  onResult(callback: ResultCallback) {
    this._onResult = callback
  }

  onError(callback: ErrorCallback) {
    this._onError = callback
  }

  speak(text: string, rate = 1.0) {
    this.synthesis.cancel()
    const utterance = new SpeechSynthesisUtterance(text)
    utterance.rate = rate
    utterance.pitch = 1.0
    utterance.volume = 1.0
    const voices = this.synthesis.getVoices()
    if (voices.length > 0) {
      utterance.voice = voices[0]
    }
    this.synthesis.speak(utterance)
  }

  stopSpeaking() {
    this.synthesis.cancel()
  }

  get isSpeaking(): boolean {
    return this.synthesis.speaking
  }
}
