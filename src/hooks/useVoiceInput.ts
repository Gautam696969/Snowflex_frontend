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

function getSpeechRecognitionCtor() {
  return (window as unknown as { SpeechRecognition?: { new (...args: any[]): any } }).SpeechRecognition
    ?? (window as unknown as { webkitSpeechRecognition?: { new (...args: any[]): any } }).webkitSpeechRecognition
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
  const [hasSpeechApi, setHasSpeechApi] = useState(false)

  const recognitionRef = useRef<InstanceType<NonNullable<ReturnType<typeof getSpeechRecognitionCtor>>> | null>(null)
  const audioCtxRef = useRef<InstanceType<typeof AudioContext> | null>(null)
  const analyserRef = useRef<AnalyserNode | null>(null)
  const streamRef = useRef<MediaStream | null>(null)
  const mediaRecorderRef = useRef<MediaRecorder | null>(null)
  const chunksRef = useRef<Blob[]>([])
  const pendingStartRef = useRef(false)
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
    setSupported(Boolean(getSpeechRecognitionCtor() || (navigator.mediaDevices && navigator.mediaDevices.getUserMedia)))
    setHasSpeechApi(Boolean(getSpeechRecognitionCtor()))
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
    if (mediaRecorderRef.current && mediaRecorderRef.current.state !== 'inactive') {
      try { mediaRecorderRef.current.stop() } catch {}
      mediaRecorderRef.current = null
    }
    chunksRef.current = []
    if (streamRef.current) { streamRef.current.getTracks().forEach(t => t.stop()); streamRef.current = null }
    if (analyserRef.current) { try { analyserRef.current.disconnect() } catch {} analyserRef.current = null }
    if (audioCtxRef.current) { try { void audioCtxRef.current.close() } catch {} audioCtxRef.current = null }
  }

  useEffect(() => () => cleanup(), [])

  const start = async () => {
    if (pendingStartRef.current) return
    setError(null)
    setTranscript('')
    pendingStartRef.current = true

    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true })
      streamRef.current = stream

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

      if (hasSpeechApi) {
        const Ctor = getSpeechRecognitionCtor()
        if (Ctor) {
          const recognition = new Ctor()
          recognition.continuous = true
          recognition.interimResults = true
          recognition.lang = langRef.current
          recognition.onresult = (event: any) => {
            let final = ''
            let interim = ''
            for (let i = event.resultIndex; i < event.results.length; i++) {
              const res = event.results[i]
              if (res.isFinal) final += res[0].transcript
              else interim += res[0].transcript
            }
            const text = final || interim
            setTranscript(text)
            onTranscriptRef.current(text)
          }
          recognition.onerror = (event: any) => {
            if (event.error === 'not-allowed' || event.error === 'service-not-allowed') {
              setError('Microphone permission denied.')
              stop()
            } else if (event.error === 'no-speech') {
              // keep listening
            } else {
              setError(`Speech error: ${event.error}`)
            }
          }
          recognition.onend = () => {
            if (stateRef.current === 'listening') {
              try { recognition.start() } catch {}
            }
          }
          recognitionRef.current = recognition
          try { recognition.start() } catch {}
        }
      } else {
        // Firefox/Safari fallback: record audio and send to backend for Whisper transcription
        const MRecorder = (window as unknown as { MediaRecorder?: typeof MediaRecorder }).MediaRecorder
        if (MRecorder) {
          const recorder = new MRecorder(stream, { mimeType: 'audio/webm' })
          mediaRecorderRef.current = recorder
          chunksRef.current = []
          recorder.ondataavailable = (e: BlobEvent) => {
            if (e.data && e.data.size > 0) chunksRef.current.push(e.data)
          }
          recorder.onstop = async () => {
            const blob = new Blob(chunksRef.current, { type: 'audio/webm' })
            chunksRef.current = []
            try {
              setStateSafe('processing')
              const token = tokenRef.current
              if (token) {
                const text = await transcribeVoiceAudio(token, blob)
                setTranscript(text)
                onTranscriptRef.current(text)
              } else {
                setError('Authentication token missing for transcription.')
              }
            } catch (err) {
              setError(err instanceof Error ? err.message : 'Transcription failed.')
            } finally {
              cleanup()
              setStateSafe('idle')
            }
          }
          recorder.start()
        }
      }

      setStateSafe('listening')
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Could not access microphone.')
      setStateSafe('idle')
    } finally {
      pendingStartRef.current = false
    }
  }

  const stop = () => {
    if (hasSpeechApi && recognitionRef.current) {
      try { recognitionRef.current.stop() } catch {}
    }
    if (mediaRecorderRef.current && mediaRecorderRef.current.state !== 'inactive') {
      try { mediaRecorderRef.current.stop() } catch {}
    }
    cleanup()
    setStateSafe('processing')
    setTimeout(() => setStateSafe('idle'), 200)
  }

  const cancel = () => {
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