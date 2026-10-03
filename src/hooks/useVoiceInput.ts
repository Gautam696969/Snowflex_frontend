import { useEffect, useRef, useState } from 'react'
import { transcribeVoiceAudio } from '../lib/auth-api'

export type VoiceState = 'idle' | 'listening' | 'processing'

export interface VoiceInputHandlers {
  start(): void
  stop(): void
  cancel(): void
}

export interface VoiceInputResult {
  state: VoiceState
  transcript: string
  error: string | null
  supported: boolean
  handlers: VoiceInputHandlers
  analyserRef: React.RefObject<AnalyserNode | null>
}

type SpeechRecognitionLike = {
  continuous: boolean
  interimResults: boolean
  lang: string
  start(): void
  stop(): void
  onstart: (() => void) | null
  onaudiostart: (() => void) | null
  onspeechstart: (() => void) | null
  onresult: ((event: any) => void) | null
  onerror: ((event: any) => void) | null
  onend: (() => void) | null
}

type SpeechRecognitionConstructor = new () => SpeechRecognitionLike

function getSpeechRecognitionCtor(): SpeechRecognitionConstructor | undefined {
  const browserWindow = window as unknown as {
    SpeechRecognition?: SpeechRecognitionConstructor
    webkitSpeechRecognition?: SpeechRecognitionConstructor
  }
  return browserWindow.SpeechRecognition ?? browserWindow.webkitSpeechRecognition
}

export function useVoiceInput(
  onTranscript: (text: string) => void,
  onStateChange?: (state: VoiceState) => void,
  options: { token?: string; lang?: string } = {},
): VoiceInputResult {
  const [state, setState] = useState<VoiceState>('idle')
  const [transcript, setTranscript] = useState('')
  const [error, setError] = useState<string | null>(null)
  const [supported, setSupported] = useState(false)
  const recognitionRef = useRef<SpeechRecognitionLike | null>(null)
  const audioCtxRef = useRef<AudioContext | null>(null)
  const analyserRef = useRef<AnalyserNode | null>(null)
  const streamRef = useRef<MediaStream | null>(null)
  const mediaRecorderRef = useRef<MediaRecorder | null>(null)
  const chunksRef = useRef<Blob[]>([])
  const pendingStartRef = useRef(false)
  const finalTranscriptRef = useRef('')
  const cancelledRef = useRef(false)
  const recordingStartedAtRef = useRef(0)
  const onTranscriptRef = useRef(onTranscript)
  const onStateChangeRef = useRef(onStateChange)
  const stateRef = useRef<VoiceState>('idle')
  const tokenRef = useRef(options.token)
  const langRef = useRef(options.lang ?? 'en-IN')

  useEffect(() => { onTranscriptRef.current = onTranscript }, [onTranscript])
  useEffect(() => { onStateChangeRef.current = onStateChange }, [onStateChange])
  useEffect(() => { stateRef.current = state }, [state])
  useEffect(() => { tokenRef.current = options.token }, [options.token])
  useEffect(() => { langRef.current = options.lang ?? 'en-IN' }, [options.lang])
  useEffect(() => {
    const hasMicrophone = Boolean(navigator.mediaDevices?.getUserMedia)
    setSupported(hasMicrophone && typeof MediaRecorder !== 'undefined')
    console.info('[voice] browser:', navigator.userAgent)
    console.info('[voice] SpeechRecognition available:', Boolean(getSpeechRecognitionCtor()))
  }, [])

  const setStateSafe = (next: VoiceState) => {
    stateRef.current = next
    setState(next)
    onStateChangeRef.current?.(next)
  }

  const cleanup = () => {
    if (recognitionRef.current) {
      try {
        recognitionRef.current.onresult = null
        recognitionRef.current.onerror = null
        recognitionRef.current.onend = null
        recognitionRef.current.stop()
      } catch {}
      recognitionRef.current = null
    }
    mediaRecorderRef.current?.stream.getTracks().forEach((track) => track.stop())
    mediaRecorderRef.current = null
    chunksRef.current = []
    if (streamRef.current) { streamRef.current.getTracks().forEach(t => t.stop()); streamRef.current = null }
    if (analyserRef.current) { try { analyserRef.current.disconnect() } catch {} analyserRef.current = null }
    if (audioCtxRef.current) { try { void audioCtxRef.current.close() } catch {} audioCtxRef.current = null }
  }

  useEffect(() => {
    const handleEscape = (event: KeyboardEvent) => {
      if (event.key === 'Escape' && stateRef.current === 'listening') cancel()
    }
    window.addEventListener('keydown', handleEscape)
    return () => {
      window.removeEventListener('keydown', handleEscape)
      cancelledRef.current = true
      cleanup()
    }
  }, [])

  const start = async () => {
    if (pendingStartRef.current || stateRef.current !== 'idle') return
    setError(null)
    setTranscript('')
    finalTranscriptRef.current = ''
    cancelledRef.current = false
    pendingStartRef.current = true

    let stream: MediaStream | null = null
    try {
      stream = await navigator.mediaDevices.getUserMedia({ audio: true })
      streamRef.current = stream
      console.info('[voice] getUserMedia succeeded; stream is ready')

      const AudioContextCtor = window.AudioContext ?? (window as unknown as { webkitAudioContext?: typeof AudioContext }).webkitAudioContext
      if (AudioContextCtor) {
        const audioCtx = new AudioContextCtor()
        audioCtxRef.current = audioCtx
        const analyser = audioCtx.createAnalyser()
        analyser.fftSize = 128
        analyserRef.current = analyser
        const source = audioCtx.createMediaStreamSource(stream)
        source.connect(analyser)
      }

      const MRecorder = typeof MediaRecorder !== 'undefined' ? MediaRecorder : null
      if (!MRecorder || !stream) throw new Error('Voice input is not supported in this browser.')
      const mimeType = ['audio/webm;codecs=opus', 'audio/webm', 'audio/mp4']
        .find((type) => MRecorder.isTypeSupported(type)) ?? ''
      const recorder = new MRecorder(stream, mimeType ? { mimeType } : undefined)
      mediaRecorderRef.current = recorder
      chunksRef.current = []
      recordingStartedAtRef.current = Date.now()
      recorder.ondataavailable = (event) => {
        if (event.data.size > 0) chunksRef.current.push(event.data)
      }
      recorder.onerror = () => {
        console.error('[voice] MediaRecorder error')
        cancelledRef.current = true
        setError('Audio recording failed. Please check your microphone and try again.')
        cleanup()
        setStateSafe('idle')
      }
      recorder.onstop = async () => {
        if (cancelledRef.current) return
        const duration = Date.now() - recordingStartedAtRef.current
        const blob = new Blob(chunksRef.current, { type: recorder.mimeType || 'audio/webm' })
        chunksRef.current = []
        console.info('[voice] recorder.onstop', { durationMs: duration, size: blob.size, type: blob.type })
        if (duration < 500 || blob.size < 1000) {
          setError('No speech detected. Please try speaking for longer.')
          cleanup()
          setStateSafe('idle')
          return
        }
        try {
          const token = tokenRef.current
          if (!token) throw new Error('Authentication token missing for transcription.')
          const text = await transcribeVoiceAudio(token, blob, langRef.current, recorder.mimeType || 'audio/webm')
          setTranscript(text)
          onTranscriptRef.current(text)
        } catch (err) {
          setError(err instanceof Error ? err.message : 'Transcription failed.')
        } finally {
          cleanup()
          setStateSafe('idle')
        }
      }
      recorder.start()
      console.info('[voice] MediaRecorder.start() called', { mimeType: recorder.mimeType })

      const Ctor = getSpeechRecognitionCtor()
      if (Ctor) {
        const recognition = new Ctor()
        recognition.continuous = true
        recognition.interimResults = true
        recognition.lang = langRef.current
        recognition.onstart = () => console.info('[voice] recognition.onstart')
        recognition.onaudiostart = () => console.info('[voice] recognition.onaudiostart')
        recognition.onspeechstart = () => console.info('[voice] recognition.onspeechstart')
        recognition.onresult = (event: any) => {
          console.info('[voice] recognition.onresult', event.results)
          let interim = ''
          for (let i = event.resultIndex; i < event.results.length; i++) {
            const result = event.results[i]
            if (result.isFinal) finalTranscriptRef.current += result[0].transcript
            else interim += result[0].transcript
          }
          const text = `${finalTranscriptRef.current} ${interim}`.trim()
          setTranscript(text)
        }
        recognition.onerror = (event: any) => {
          console.warn('[voice] recognition.onerror', event.error)
          if (event.error === 'not-allowed' || event.error === 'service-not-allowed') {
            console.warn('[voice] Web Speech preview unavailable; MediaRecorder remains authoritative')
          }
        }
        recognition.onend = () => {
          console.info('[voice] recognition.onend')
          if (stateRef.current === 'listening' && recognitionRef.current === recognition) {
            try { recognition.start() } catch {}
          }
        }
        recognitionRef.current = recognition
        try {
          console.info('[voice] recognition.start() called after stream and recorder are ready')
          recognition.start()
        } catch (error) {
          console.warn('[voice] recognition.start() failed; continuing with Whisper', error)
        }
      }
      setStateSafe('listening')
    } catch (err) {
      cleanup()
      const msg = err instanceof Error ? err.message : ''
      const errorName = err instanceof DOMException ? err.name : ''
      const permissionDenied = errorName === 'NotAllowedError'
        || errorName === 'PermissionDeniedError'
        || msg.toLowerCase().includes('permission')
        || msg.toLowerCase().includes('denied')
        || msg.toLowerCase().includes('not allowed')
      if (permissionDenied) {
        setError('Microphone permission denied. Please allow microphone access and try again.')
      } else if (msg.toLowerCase().includes('not found') || msg.toLowerCase().includes('not available') || msg.toLowerCase().includes('no microphone')) {
        setError('No microphone found. Please connect a microphone and try again.')
      } else {
        setError(msg || 'Could not access microphone.')
      }
      setStateSafe('idle')
    } finally {
      pendingStartRef.current = false
    }
  }

  const stop = () => {
    if (stateRef.current !== 'listening') return
    setStateSafe('processing')
    if (recognitionRef.current) try { recognitionRef.current.stop() } catch {}
    if (mediaRecorderRef.current && mediaRecorderRef.current.state !== 'inactive') {
      try { mediaRecorderRef.current.stop() } catch {}
      return
    }
    cleanup()
    setStateSafe('idle')
  }

  const cancel = () => {
    cancelledRef.current = true
    setTranscript('')
    onTranscriptRef.current('')
    if (mediaRecorderRef.current && mediaRecorderRef.current.state !== 'inactive') {
      try { mediaRecorderRef.current.stop() } catch {}
    }
    cleanup()
    setStateSafe('idle')
  }

  return {
    state,
    transcript,
    error,
    supported,
    handlers: { start, stop, cancel },
    analyserRef,
  }
}