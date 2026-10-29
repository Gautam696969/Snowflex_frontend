import { useEffect, useRef, useState, useCallback } from 'react'
import { Mic, MicOff, X, AlertCircle, RefreshCw } from 'lucide-react'
import toast from 'react-hot-toast'
import { transcribeVoiceAudio, sendAiMessage } from '../lib/auth-api'
import type { AiConversation, AiMessage } from '../lib/auth-api'

export type VoiceModeState = 'listening' | 'thinking' | 'speaking'

interface VoiceModeOverlayProps {
  token: string
  activeConversationId: number | null
  onClose: () => void
  onMessageExchange: (userMsg: AiMessage, assistantMsg: AiMessage, conversation: AiConversation) => void
  onError: (msg: string) => void
}

function cleanMarkdownForSpeech(md: string): string {
  return md
    .replace(/```[\s\S]*?```/g, ' ')
    .replace(/`([^`]+)`/g, '$1')
    .replace(/\[([^\]]+)\]\([^)]+\)/g, '$1')
    .replace(/[*#_~>]/g, '')
    .replace(/[-*•]\s+/g, '')
    .replace(/\n+/g, ' ')
    .replace(/\s{2,}/g, ' ')
    .trim()
}

function getSupportedAudioMimeType(): string {
  if (typeof window === 'undefined' || typeof window.MediaRecorder === 'undefined') return ''
  const candidates = [
    'audio/webm;codecs=opus',
    'audio/webm',
    'audio/mp4',
    'audio/ogg;codecs=opus',
    'audio/wav',
  ]
  return candidates.find((type) => MediaRecorder.isTypeSupported(type)) ?? ''
}

/**
 * Encodes Float32Array PCM samples (-1.0 to 1.0) into a standard 16-bit mono RIFF WAV Blob.
 */
function encodePcmToWav(samples: Float32Array, sampleRate: number): Blob {
  const buffer = new ArrayBuffer(44 + samples.length * 2)
  const view = new DataView(buffer)

  const writeString = (offset: number, str: string) => {
    for (let i = 0; i < str.length; i++) {
      view.setUint8(offset + i, str.charCodeAt(i))
    }
  }

  // 1. RIFF chunk descriptor
  writeString(0, 'RIFF')
  view.setUint32(4, 36 + samples.length * 2, true)
  writeString(8, 'WAVE')

  // 2. "fmt " subchunk
  writeString(12, 'fmt ')
  view.setUint32(16, 16, true) // Subchunk1Size (16 for PCM)
  view.setUint16(20, 1, true) // AudioFormat (1 for PCM)
  view.setUint16(22, 1, true) // NumChannels (1 mono)
  view.setUint32(24, sampleRate, true) // SampleRate (16000)
  view.setUint32(28, sampleRate * 2, true) // ByteRate (16000 * 1 * 16 / 8 = 32000)
  view.setUint16(32, 2, true) // BlockAlign (1 * 16 / 8 = 2)
  view.setUint16(34, 16, true) // BitsPerSample (16 bits)

  // 3. "data" subchunk
  writeString(36, 'data')
  view.setUint32(40, samples.length * 2, true)

  // 4. 16-bit linear PCM audio samples
  let offset = 44
  for (let i = 0; i < samples.length; i++) {
    const s = Math.max(-1, Math.min(1, samples[i]))
    const val = s < 0 ? s * 0x8000 : s * 0x7fff
    view.setInt16(offset, val, true)
    offset += 2
  }

  return new Blob([buffer], { type: 'audio/wav' })
}

/**
 * Resamples any recorded audio Blob into 16kHz mono WAV using decodeAudioData + OfflineAudioContext.
 */
async function convertBlobTo16kHzMonoWav(blob: Blob, audioCtx: AudioContext): Promise<Blob> {
  const arrayBuffer = await blob.arrayBuffer()
  const decodedAudioBuffer = await new Promise<AudioBuffer>((resolve, reject) => {
    const res = audioCtx.decodeAudioData(
      arrayBuffer.slice(0),
      (buf) => resolve(buf),
      (err) => reject(err),
    )
    if (res && typeof (res as Promise<AudioBuffer>).then === 'function') {
      ;(res as Promise<AudioBuffer>).then(resolve).catch(reject)
    }
  })

  const TARGET_SAMPLE_RATE = 16000
  const targetLength = Math.max(1, Math.round(decodedAudioBuffer.duration * TARGET_SAMPLE_RATE))

  const OfflineCtxCtor =
    window.OfflineAudioContext ||
    (window as unknown as { webkitOfflineAudioContext?: typeof OfflineAudioContext }).webkitOfflineAudioContext

  if (!OfflineCtxCtor) {
    throw new Error('OfflineAudioContext is not supported in this browser.')
  }

  const offlineCtx = new OfflineCtxCtor(1, targetLength, TARGET_SAMPLE_RATE)
  const source = offlineCtx.createBufferSource()
  source.buffer = decodedAudioBuffer
  source.connect(offlineCtx.destination)
  source.start(0)

  const renderedBuffer = await offlineCtx.startRendering()
  const channelData = renderedBuffer.getChannelData(0)
  return encodePcmToWav(channelData, TARGET_SAMPLE_RATE)
}

export default function VoiceModeOverlay({
  token,
  activeConversationId,
  onClose,
  onMessageExchange,
}: VoiceModeOverlayProps) {
  const [state, setState] = useState<VoiceModeState>('listening')
  const [muted, setMuted] = useState(false)
  const [permissionError, setPermissionError] = useState<string | null>(null)
  const [transcriptSnippet, setTranscriptSnippet] = useState<string>('')

  const activeConvIdRef = useRef<number | null>(activeConversationId)
  const stateRef = useRef<VoiceModeState>('listening')
  const mutedRef = useRef(false)
  const isClosingRef = useRef(false)

  const orbRef = useRef<HTMLDivElement>(null)
  const streamRef = useRef<MediaStream | null>(null)
  const audioCtxRef = useRef<AudioContext | null>(null)
  const analyserRef = useRef<AnalyserNode | null>(null)
  const mediaRecorderRef = useRef<MediaRecorder | null>(null)
  const chunksRef = useRef<Blob[]>([])

  const rafRef = useRef<number | null>(null)
  const speechKeepAliveRef = useRef<number | null>(null)
  const abortControllerRef = useRef<AbortController | null>(null)

  // Strict VAD & concurrency refs
  const isTranscribingRef = useRef(false)
  const isRecordingUtteranceRef = useRef(false)
  const voiceOnsetStartRef = useRef(0)
  const lastVoiceTimeRef = useRef(0)
  const recordingStartedAtRef = useRef(0)
  const smoothedRmsRef = useRef(0)
  const bargeInCountRef = useRef(0)

  useEffect(() => {
    stateRef.current = state
  }, [state])

  useEffect(() => {
    mutedRef.current = muted
    if (streamRef.current) {
      streamRef.current.getAudioTracks().forEach((track) => {
        track.enabled = !muted
      })
    }
  }, [muted])

  useEffect(() => {
    activeConvIdRef.current = activeConversationId
  }, [activeConversationId])

  const cleanupEverything = useCallback(() => {
    isClosingRef.current = true

    if ('speechSynthesis' in window) {
      try {
        window.speechSynthesis.cancel()
      } catch {}
    }

    if (speechKeepAliveRef.current !== null) {
      window.clearInterval(speechKeepAliveRef.current)
      speechKeepAliveRef.current = null
    }

    if (rafRef.current !== null) {
      cancelAnimationFrame(rafRef.current)
      rafRef.current = null
    }

    if (abortControllerRef.current) {
      try {
        abortControllerRef.current.abort()
      } catch {}
      abortControllerRef.current = null
    }

    if (mediaRecorderRef.current && mediaRecorderRef.current.state !== 'inactive') {
      try {
        mediaRecorderRef.current.onstop = null
        mediaRecorderRef.current.ondataavailable = null
        mediaRecorderRef.current.stop()
      } catch {}
    }
    mediaRecorderRef.current = null
    chunksRef.current = []

    if (streamRef.current) {
      try {
        streamRef.current.getTracks().forEach((track) => track.stop())
      } catch {}
      streamRef.current = null
    }

    if (analyserRef.current) {
      try {
        analyserRef.current.disconnect()
      } catch {}
      analyserRef.current = null
    }

    if (audioCtxRef.current) {
      try {
        void audioCtxRef.current.close()
      } catch {}
      audioCtxRef.current = null
    }
  }, [])

  // Start / reset to listening state
  const startListeningTurn = useCallback(() => {
    if (isClosingRef.current) return

    if ('speechSynthesis' in window) {
      try {
        window.speechSynthesis.cancel()
      } catch {}
    }

    if (mediaRecorderRef.current && mediaRecorderRef.current.state !== 'inactive') {
      try {
        mediaRecorderRef.current.onstop = null
        mediaRecorderRef.current.ondataavailable = null
        mediaRecorderRef.current.stop()
      } catch {}
    }
    mediaRecorderRef.current = null
    chunksRef.current = []

    isRecordingUtteranceRef.current = false
    voiceOnsetStartRef.current = 0
    lastVoiceTimeRef.current = 0
    bargeInCountRef.current = 0
    isTranscribingRef.current = false

    setState('listening')
    stateRef.current = 'listening'
  }, [])

  // Start recording when >=250ms continuous voice is confirmed
  const startUtteranceRecording = useCallback(() => {
    if (isRecordingUtteranceRef.current || isTranscribingRef.current || isClosingRef.current) return
    if (stateRef.current !== 'listening') return
    const stream = streamRef.current
    if (!stream) return

    try {
      if (mediaRecorderRef.current && mediaRecorderRef.current.state !== 'inactive') {
        try {
          mediaRecorderRef.current.onstop = null
          mediaRecorderRef.current.ondataavailable = null
          mediaRecorderRef.current.stop()
        } catch {}
      }
      chunksRef.current = []

      const MRecorder = window.MediaRecorder
      if (typeof MRecorder === 'undefined') return

      const mimeType = getSupportedAudioMimeType()
      const recorder = new MRecorder(stream, mimeType ? { mimeType } : undefined)
      recorder.ondataavailable = (event) => {
        if (event.data && event.data.size > 0) {
          chunksRef.current.push(event.data)
        }
      }

      // Requirement 3: Create a fresh MediaRecorder per utterance (rec.start(250))
      recorder.start(250)
      mediaRecorderRef.current = recorder
      isRecordingUtteranceRef.current = true
      recordingStartedAtRef.current = Date.now()
      lastVoiceTimeRef.current = Date.now()
      console.log('[VoiceMode] Started fresh utterance recording (rec.start(250)) after ~250ms continuous voice')
    } catch (err) {
      console.warn('[VoiceMode] MediaRecorder start failed:', err)
      isRecordingUtteranceRef.current = false
    }
  }, [])

  // Process the completed utterance
  const handleUtteranceProcessing = useCallback(
    async (rawBlob: Blob, durationMs: number) => {
      if (isTranscribingRef.current || isClosingRef.current) return
      isTranscribingRef.current = true

      setState('thinking')
      stateRef.current = 'thinking'

      try {
        // Requirement 3: convert blob to 16kHz mono WAV in the browser
        // (decodeAudioData + OfflineAudioContext + manual WAV header)
        let audioCtx = audioCtxRef.current
        if (!audioCtx || audioCtx.state === 'closed') {
          const AudioCtxCtor =
            window.AudioContext ??
            (window as unknown as { webkitAudioContext?: typeof AudioContext }).webkitAudioContext
          audioCtx = new AudioCtxCtor()
          audioCtxRef.current = audioCtx
        }
        if (audioCtx.state === 'suspended') {
          await audioCtx.resume()
        }

        let wavBlob: Blob
        try {
          wavBlob = await convertBlobTo16kHzMonoWav(rawBlob, audioCtx)
        } catch (convErr) {
          console.warn('[VoiceMode] 16kHz WAV conversion failed, falling back to raw blob:', convErr)
          wavBlob = rawBlob
        }

        // Requirement 1: Log blob size, type and duration on the client
        console.log(
          `[VoiceMode] Converted WAV - blob.size: ${wavBlob.size} bytes, blob.type: ${wavBlob.type}, duration: ${durationMs}ms`,
        )

        // Requirement 2: never upload recordings under ~700ms or ~3KB
        if (wavBlob.size < 3072) {
          console.log(`[VoiceMode] Converted WAV is under 3KB (${wavBlob.size} bytes), ignoring`)
          startListeningTurn()
          return
        }

        abortControllerRef.current = new AbortController()

        // Requirement 3 & 5: upload as FormData with filename "speech.wav"
        const transcribedText = await transcribeVoiceAudio(
          token,
          wavBlob,
          'en',
          'audio/wav',
          durationMs,
          'speech.wav',
        )

        if (isClosingRef.current) return

        const cleanText = transcribedText.trim()
        if (!cleanText) {
          console.log('[VoiceMode] Transcribed text is empty, returning to listening')
          startListeningTurn()
          return
        }

        setTranscriptSnippet(cleanText)

        // Send to chat
        const userMsgId = `user-${Date.now()}`
        const userMessage: AiMessage = {
          id: userMsgId,
          conversationId: activeConvIdRef.current ?? -1,
          role: 'user',
          content: cleanText,
          createdAt: new Date().toISOString(),
          status: 'sent',
        }

        const payload = activeConvIdRef.current
          ? { source: 'ai-employee' as const, message: cleanText, conversationId: activeConvIdRef.current }
          : { source: 'ai-employee' as const, message: cleanText }

        const chatResult = await sendAiMessage(token, payload)
        if (isClosingRef.current) return

        activeConvIdRef.current = chatResult.conversation.id

        const assistantMessage: AiMessage = {
          ...chatResult.message,
          id: `ai-${chatResult.message.id}`,
          status: 'sent',
        }

        onMessageExchange(userMessage, assistantMessage, chatResult.conversation)

        // Speak reply
        const textToSpeak = cleanMarkdownForSpeech(chatResult.message.content)
        if (!textToSpeak || isClosingRef.current) {
          startListeningTurn()
          return
        }

        setState('speaking')
        stateRef.current = 'speaking'
        bargeInCountRef.current = 0

        if ('speechSynthesis' in window) {
          window.speechSynthesis.cancel()
          const utterance = new SpeechSynthesisUtterance(textToSpeak)
          utterance.rate = 1.05
          utterance.pitch = 1.0

          const voices = window.speechSynthesis.getVoices()
          const voice =
            voices.find(
              (v) =>
                v.lang.startsWith('en') &&
                (v.name.includes('Natural') ||
                  v.name.includes('Google') ||
                  v.name.includes('Neural') ||
                  v.name.includes('Samantha') ||
                  v.default),
            ) || voices.find((v) => v.lang.startsWith('en'))
          if (voice) utterance.voice = voice

          utterance.onend = () => {
            if (!isClosingRef.current && stateRef.current === 'speaking') {
              startListeningTurn()
            }
          }

          utterance.onerror = (e) => {
            if (e.error !== 'canceled' && e.error !== 'interrupted') {
              console.warn('[VoiceMode] Speech synthesis error:', e)
            }
            if (!isClosingRef.current && stateRef.current === 'speaking') {
              startListeningTurn()
            }
          }

          window.speechSynthesis.speak(utterance)
        } else {
          setTimeout(() => {
            if (!isClosingRef.current) startListeningTurn()
          }, 2000)
        }
      } catch (err) {
        if (isClosingRef.current) return
        const message = err instanceof Error ? err.message : 'Transcription failed.'
        console.warn('[VoiceMode] Voice mode error caught:', message)

        // Requirement 6: On any failure, show a small toast and return to "listening". Do not change the UI.
        toast.error(message, { id: 'voice-transcription-error', duration: 3500 })
        startListeningTurn()
      } finally {
        isTranscribingRef.current = false
      }
    },
    [token, onMessageExchange, startListeningTurn],
  )

  // End recording after ~1500ms silence
  const finishUtteranceRecording = useCallback(async () => {
    if (!isRecordingUtteranceRef.current || isClosingRef.current) return
    isRecordingUtteranceRef.current = false
    voiceOnsetStartRef.current = 0

    const rec = mediaRecorderRef.current
    const durationMs = Date.now() - recordingStartedAtRef.current

    // Gather recorded chunks from stopped MediaRecorder
    const rawBlob = await new Promise<Blob | null>((resolve) => {
      if (!rec || rec.state === 'inactive') {
        if (chunksRef.current.length > 0) {
          resolve(new Blob(chunksRef.current, { type: 'audio/webm' }))
        } else {
          resolve(null)
        }
        return
      }

      rec.onstop = () => {
        const mime = rec.mimeType || 'audio/webm'
        const blob = new Blob(chunksRef.current, { type: mime })
        chunksRef.current = []
        resolve(blob)
      }

      try {
        rec.stop()
      } catch {
        resolve(null)
      }
    })

    mediaRecorderRef.current = null

    const rawSize = rawBlob?.size ?? 0
    const rawType = rawBlob?.type ?? 'unknown'

    // Requirement 1: Log blob size, type and duration on the client
    console.log(
      `[VoiceMode] Raw utterance blob - size: ${rawSize} bytes, type: ${rawType}, duration: ${durationMs}ms`,
    )

    // Requirement 2: never upload recordings under ~700ms or ~3KB
    if (!rawBlob || durationMs < 700 || rawSize < 3072 || isClosingRef.current) {
      console.log(
        `[VoiceMode] Recording ignored (under 700ms or 3KB) - duration: ${durationMs}ms, size: ${rawSize} bytes`,
      )
      startListeningTurn()
      return
    }

    // Requirement 4: Prevent overlapping requests: only one transcribe call at a time
    if (isTranscribingRef.current) {
      console.warn('[VoiceMode] Transcription already in progress, dropping audio')
      startListeningTurn()
      return
    }

    void handleUtteranceProcessing(rawBlob, durationMs)
  }, [startListeningTurn, handleUtteranceProcessing])

  // Initialize Web Audio and start audio analysis loop
  const startVoiceSession = useCallback(async () => {
    cleanupEverything()
    isClosingRef.current = false
    setPermissionError(null)

    try {
      const stream = await navigator.mediaDevices.getUserMedia({
        audio: {
          echoCancellation: true,
          noiseSuppression: true,
          autoGainControl: true,
        },
      })
      streamRef.current = stream

      const AudioCtxCtor =
        window.AudioContext ??
        (window as unknown as { webkitAudioContext?: typeof AudioContext }).webkitAudioContext

      if (AudioCtxCtor) {
        const audioCtx = new AudioCtxCtor()
        if (audioCtx.state === 'suspended') {
          void audioCtx.resume()
        }
        audioCtxRef.current = audioCtx

        const analyser = audioCtx.createAnalyser()
        analyser.fftSize = 256
        analyser.smoothingTimeConstant = 0.3
        analyserRef.current = analyser

        const source = audioCtx.createMediaStreamSource(stream)
        source.connect(analyser)
      }

      startListeningTurn()

      // Chrome speechSynthesis keepalive interval
      speechKeepAliveRef.current = window.setInterval(() => {
        if ('speechSynthesis' in window && window.speechSynthesis.speaking) {
          window.speechSynthesis.pause()
          window.speechSynthesis.resume()
        }
      }, 5000)

      // Audio analysis and VAD loop
      const timeData = new Uint8Array(256)
      const SPEECH_RMS_THRESHOLD = 0.035
      const BARGE_IN_RMS_THRESHOLD = 0.052

      const loop = () => {
        if (isClosingRef.current) return

        const analyser = analyserRef.current
        let rms = 0

        if (analyser && !mutedRef.current) {
          analyser.getByteTimeDomainData(timeData)
          let sumSquares = 0
          for (let i = 0; i < timeData.length; i++) {
            const val = (timeData[i] - 128) / 128
            sumSquares += val * val
          }
          rms = Math.sqrt(sumSquares / timeData.length)
        }

        const currentState = stateRef.current
        const orb = orbRef.current

        // 1. Listening State: drive orb scale, enforce strict VAD
        if (currentState === 'listening') {
          if (mutedRef.current) {
            smoothedRmsRef.current = 0
            orb?.style.setProperty('--orb-scale', '1')
            voiceOnsetStartRef.current = 0
          } else {
            // Smooth RMS for real-time orb volume scaling
            smoothedRmsRef.current += (rms - smoothedRmsRef.current) * 0.3
            const scale = 1.0 + Math.min(0.42, smoothedRmsRef.current * 2.6)
            orb?.style.setProperty('--orb-scale', scale.toFixed(3))

            // Requirement 4: Prevent overlapping requests; ignore new audio while transcribing
            if (!isTranscribingRef.current) {
              const now = Date.now()
              const isVoice = rms >= SPEECH_RMS_THRESHOLD

              if (isVoice) {
                if (!isRecordingUtteranceRef.current) {
                  // Voice detected while idle: start recording only after ~250ms of continuous voice
                  if (voiceOnsetStartRef.current === 0) {
                    voiceOnsetStartRef.current = now
                  } else if (now - voiceOnsetStartRef.current >= 250) {
                    // Requirement 2: start recording only after ~250ms of continuous voice above threshold
                    startUtteranceRecording()
                  }
                } else {
                  // Currently recording: update last voice activity timestamp
                  lastVoiceTimeRef.current = now
                }
              } else {
                // RMS is below voice threshold
                if (!isRecordingUtteranceRef.current) {
                  // Interrupted before 250ms continuous voice reached: reset onset timer
                  voiceOnsetStartRef.current = 0
                } else {
                  // Currently recording: check if silence has reached ~1500ms
                  const silenceDuration = now - lastVoiceTimeRef.current
                  if (silenceDuration >= 1500) {
                    // Requirement 2: end after ~1500ms of silence
                    void finishUtteranceRecording()
                  }
                }
              }
            }
          }
        }
        // 2. Speaking State: pulse orb, ignore new audio for recording, but allow barge-in
        else if (currentState === 'speaking') {
          const now = performance.now()
          const pulse = 1.0 + 0.08 * Math.sin(now * 0.007) + 0.04 * Math.sin(now * 0.016)
          orb?.style.setProperty('--orb-scale', pulse.toFixed(3))

          // Requirement 4: ignore new audio while speaking, but still allow barge-in
          if (!mutedRef.current && rms >= BARGE_IN_RMS_THRESHOLD) {
            bargeInCountRef.current++
            if (bargeInCountRef.current >= 4) {
              // Interrupted by user speech!
              if ('speechSynthesis' in window) {
                window.speechSynthesis.cancel()
              }
              bargeInCountRef.current = 0
              startListeningTurn()
            }
          } else {
            bargeInCountRef.current = Math.max(0, bargeInCountRef.current - 1)
          }
        }
        // 3. Thinking State: ignore new audio, orb CSS handles slow breathing
        else if (currentState === 'thinking') {
          orb?.style.removeProperty('--orb-scale')
          voiceOnsetStartRef.current = 0
          // Requirement 4: ignore new audio while status is thinking
        }

        rafRef.current = requestAnimationFrame(loop)
      }

      rafRef.current = requestAnimationFrame(loop)
    } catch (err) {
      cleanupEverything()
      const errorName = err instanceof DOMException ? err.name : ''
      const msg = err instanceof Error ? err.message : ''
      const isDenied =
        errorName === 'NotAllowedError' ||
        errorName === 'PermissionDeniedError' ||
        msg.toLowerCase().includes('permission') ||
        msg.toLowerCase().includes('denied') ||
        msg.toLowerCase().includes('not allowed')

      if (isDenied) {
        setPermissionError(
          'Microphone permission was denied. Please allow microphone access in your browser to use Voice Mode.',
        )
      } else if (msg.toLowerCase().includes('not found') || msg.toLowerCase().includes('no microphone')) {
        setPermissionError('No microphone detected. Please connect a microphone and try again.')
      } else {
        setPermissionError(msg || 'Unable to access your microphone.')
      }
    }
  }, [
    cleanupEverything,
    startListeningTurn,
    startUtteranceRecording,
    finishUtteranceRecording,
  ])

  useEffect(() => {
    void startVoiceSession()

    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape') {
        cleanupEverything()
        onClose()
      }
    }
    window.addEventListener('keydown', handleKeyDown)

    return () => {
      window.removeEventListener('keydown', handleKeyDown)
      cleanupEverything()
    }
  }, [startVoiceSession, cleanupEverything, onClose])

  const handleClose = () => {
    cleanupEverything()
    onClose()
  }

  const toggleMute = () => {
    setMuted((current) => !current)
  }

  const statusLabel =
    state === 'thinking'
      ? 'Thinking...'
      : state === 'speaking'
        ? 'Speaking...'
        : muted
          ? 'Microphone muted'
          : 'Listening...'

  return (
    <div
      className="fixed inset-0 z-[100] flex flex-col justify-between items-center py-[24px] px-[20px] select-none overflow-hidden animate-[fade-in_0.2s_ease]"
      style={{
        background: 'radial-gradient(circle at 50% 45%, #15261d 0%, #0c1410 65%, #080d0a 100%)',
      }}
      role="dialog"
      aria-modal="true"
      aria-label="Snowflex AI Voice Mode"
    >
      {/* Top Header */}
      <header className="w-full max-w-[640px] flex items-center justify-between z-10">
        <div className="flex items-center gap-[8px]">
          <span className="w-[8px] h-[8px] rounded-full bg-[#8aa357] animate-pulse" />
          <span className="text-[11px] font-bold uppercase tracking-[0.08em] text-[#8aa357] font-['DM_Mono',monospace]">
            Snowflex Voice
          </span>
        </div>
        <button
          type="button"
          className="w-[36px] h-[36px] rounded-full grid place-items-center bg-white/10 hover:bg-white/18 text-white/80 hover:text-white transition-all cursor-pointer border border-white/10"
          onClick={handleClose}
          aria-label="Close voice mode"
          title="Close (ESC)"
        >
          <X size={18} />
        </button>
      </header>

      {/* Centerpiece: Animated Orb or Error Card */}
      <main className="flex-1 flex flex-col items-center justify-center my-[20px] z-10 w-full max-w-[480px]">
        {permissionError ? (
          <div className="flex flex-col items-center text-center p-[28px_24px] bg-[#1a251e]/90 border border-[#b83d32]/40 rounded-[16px] shadow-2xl max-w-[380px] animate-[slide-up_0.2s_ease]">
            <span className="w-[52px] h-[52px] rounded-full grid place-items-center bg-[#b83d32]/15 text-[#f87171] mb-[16px]">
              <AlertCircle size={26} />
            </span>
            <h3 className="text-white text-[16px] font-semibold m-0 mb-[8px]">Microphone Required</h3>
            <p className="text-white/70 text-[13px] leading-[1.5] m-0 mb-[20px]">{permissionError}</p>
            <div className="flex items-center gap-[12px] w-full justify-center">
              <button
                type="button"
                className="inline-flex items-center gap-[6px] px-[16px] py-[9px] rounded-[8px] border border-white/20 bg-white/10 hover:bg-white/18 text-white text-[12px] font-semibold cursor-pointer transition-colors"
                onClick={handleClose}
              >
                Exit
              </button>
              <button
                type="button"
                className="inline-flex items-center gap-[6px] px-[16px] py-[9px] rounded-[8px] border-0 bg-[#d9ed74] hover:bg-[#e5f79b] text-[#193c33] text-[12px] font-bold cursor-pointer transition-colors shadow-md"
                onClick={() => void startVoiceSession()}
              >
                <RefreshCw size={14} /> Try Again
              </button>
            </div>
          </div>
        ) : (
          <div className="flex flex-col items-center">
            {/* The Orb */}
            <div className="voice-orb-wrapper my-[16px]">
              {state === 'speaking' && <div className="voice-orb-ring" />}
              <div
                ref={orbRef}
                className={`voice-orb ${state === 'thinking' ? 'is-thinking' : ''} ${state === 'speaking' ? 'is-speaking' : ''}`}
                aria-hidden="true"
              />
            </div>

            {/* Status Text */}
            <div className="flex flex-col items-center gap-[6px] mt-[24px]">
              <h2 className="text-white/95 text-[19px] sm:text-[21px] font-medium tracking-wide m-0">
                {statusLabel}
              </h2>
              {transcriptSnippet && (
                <p className="text-white/60 text-[12.5px] max-w-[360px] text-center italic line-clamp-2 m-0 px-4">
                  “{transcriptSnippet}”
                </p>
              )}
            </div>
          </div>
        )}
      </main>

      {/* Bottom Controls: Mute and End Buttons */}
      <footer className="w-full max-w-[420px] flex items-center justify-center gap-[44px] pb-[16px] z-10">
        <button
          type="button"
          className="group flex flex-col items-center gap-[8px] cursor-pointer bg-transparent border-0 outline-none"
          onClick={toggleMute}
          aria-label={muted ? 'Unmute microphone' : 'Mute microphone'}
          title={muted ? 'Unmute microphone' : 'Mute microphone'}
        >
          <span
            className={`w-[56px] h-[56px] rounded-full grid place-items-center transition-all duration-150 ${
              muted
                ? 'bg-red-500/25 text-red-300 border border-red-500/50 hover:bg-red-500/35'
                : 'bg-white/10 hover:bg-white/20 text-white border border-white/15'
            }`}
          >
            {muted ? <MicOff size={22} /> : <Mic size={22} />}
          </span>
          <span className="text-[12px] font-medium text-white/70 group-hover:text-white transition-colors">
            {muted ? 'Unmute' : 'Mute'}
          </span>
        </button>

        <button
          type="button"
          className="group flex flex-col items-center gap-[8px] cursor-pointer bg-transparent border-0 outline-none"
          onClick={handleClose}
          aria-label="End voice mode"
          title="End voice mode (ESC)"
        >
          <span className="w-[56px] h-[56px] rounded-full grid place-items-center bg-white/10 hover:bg-red-500/25 hover:text-red-300 hover:border-red-500/40 text-white border border-white/15 transition-all duration-150">
            <X size={22} />
          </span>
          <span className="text-[12px] font-medium text-white/70 group-hover:text-white transition-colors">
            End
          </span>
        </button>
      </footer>
    </div>
  )
}
