import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useRef,
  useState,
  type ReactNode,
} from 'react'
import { toast } from 'react-hot-toast'
import { useChat } from './ChatContext'
import { fetchIceServers } from '../lib/chat-api'
import { callSoundManager } from '../utils/ringtone'

export type CallState = 'idle' | 'calling' | 'ringing' | 'connected' | 'reconnecting'

export interface CallParticipant {
  id: number
  fullName: string
  role: string
  avatarUrl: string | null
}

interface VideoCallContextValue {
  callState: CallState
  callId: string | null
  conversationId: number | null
  remoteUser: CallParticipant | null
  localStream: MediaStream | null
  remoteStream: MediaStream | null
  isMuted: boolean
  isCameraOff: boolean
  isScreenSharing: boolean
  callDurationSeconds: number
  mediaError: string | null
  startCall: (targetUser: CallParticipant, conversationId: number) => Promise<void>
  acceptCall: () => Promise<void>
  rejectCall: () => void
  endCall: () => void
  toggleMute: () => void
  toggleCamera: () => void
  toggleScreenShare: () => Promise<void>
}

const VideoCallContext = createContext<VideoCallContextValue | null>(null)

function getMediaErrorMessage(err: unknown): string {
  if (err instanceof DOMException) {
    if (err.name === 'NotAllowedError' || err.name === 'PermissionDeniedError') {
      return 'Camera/microphone permission denied. Please allow access in your browser settings.'
    }
    if (err.name === 'NotFoundError' || err.name === 'DevicesNotFoundError') {
      return 'No camera or microphone found on this device.'
    }
    if (err.name === 'NotReadableError' || err.name === 'TrackStartError') {
      return 'Camera or microphone is already in use by another application.'
    }
  }
  return err instanceof Error ? err.message : 'Unable to access camera and microphone.'
}

export function VideoCallProvider({ children }: { children: ReactNode }) {
  const { socket } = useChat()

  const [callState, setCallState] = useState<CallState>('idle')
  const [callId, setCallId] = useState<string | null>(null)
  const [conversationId, setConversationId] = useState<number | null>(null)
  const [remoteUser, setRemoteUser] = useState<CallParticipant | null>(null)
  const [localStream, setLocalStream] = useState<MediaStream | null>(null)
  const [remoteStream, setRemoteStream] = useState<MediaStream | null>(null)
  const [isMuted, setIsMuted] = useState(false)
  const [isCameraOff, setIsCameraOff] = useState(false)
  const [isScreenSharing, setIsScreenSharing] = useState(false)
  const [callDurationSeconds, setCallDurationSeconds] = useState(0)
  const [mediaError, setMediaError] = useState<string | null>(null)

  const pcRef = useRef<RTCPeerConnection | null>(null)
  const localStreamRef = useRef<MediaStream | null>(null)
  const screenStreamRef = useRef<MediaStream | null>(null)
  const remoteStreamRef = useRef<MediaStream | null>(null)
  const pendingIceRef = useRef<RTCIceCandidateInit[]>([])
  const callIdRef = useRef<string | null>(null)
  const remoteUserRef = useRef<CallParticipant | null>(null)
  const callStateRef = useRef<CallState>('idle')
  const timerRef = useRef<ReturnType<typeof setInterval> | null>(null)
  const isCallerRef = useRef(false)

  callIdRef.current = callId
  remoteUserRef.current = remoteUser
  callStateRef.current = callState

  const cleanupMediaAndPeer = useCallback(() => {
    callSoundManager.stop()

    if (timerRef.current) {
      clearInterval(timerRef.current)
      timerRef.current = null
    }

    if (screenStreamRef.current) {
      screenStreamRef.current.getTracks().forEach((t) => t.stop())
      screenStreamRef.current = null
    }

    if (localStreamRef.current) {
      localStreamRef.current.getTracks().forEach((t) => t.stop())
      localStreamRef.current = null
    }

    if (remoteStreamRef.current) {
      remoteStreamRef.current.getTracks().forEach((t) => t.stop())
      remoteStreamRef.current = null
    }

    if (pcRef.current) {
      pcRef.current.onicecandidate = null
      pcRef.current.ontrack = null
      pcRef.current.oniceconnectionstatechange = null
      pcRef.current.close()
      pcRef.current = null
    }

    pendingIceRef.current = []
    isCallerRef.current = false
    setLocalStream(null)
    setRemoteStream(null)
    setIsMuted(false)
    setIsCameraOff(false)
    setIsScreenSharing(false)
    setCallDurationSeconds(0)
    setMediaError(null)
    setCallId(null)
    setConversationId(null)
    setRemoteUser(null)
    setCallState('idle')
  }, [])

  const acquireLocalMedia = useCallback(async (): Promise<MediaStream> => {
    if (!navigator.mediaDevices?.getUserMedia) {
      throw new Error('Video calls require HTTPS or localhost with WebRTC support.')
    }
    const stream = await navigator.mediaDevices.getUserMedia({
      video: { width: { ideal: 1280 }, height: { ideal: 720 }, facingMode: 'user' },
      audio: { echoCancellation: true, noiseSuppression: true },
    })
    localStreamRef.current = stream
    setLocalStream(stream)
    return stream
  }, [])

  const createPeerConnection = useCallback(
    async (activeCallId: string, targetUserId: number, stream: MediaStream) => {
      const iceServers = await fetchIceServers()
      const pc = new RTCPeerConnection({ iceServers })

      const remote = new MediaStream()
      remoteStreamRef.current = remote
      setRemoteStream(remote)

      stream.getTracks().forEach((track) => {
        pc.addTrack(track, stream)
      })

      pc.ontrack = (event) => {
        event.streams[0]?.getTracks().forEach((track) => {
          remote.addTrack(track)
        })
        if (event.streams.length === 0 && event.track) {
          remote.addTrack(event.track)
        }
        // Trigger state update so <video> re-attaches if needed
        setRemoteStream(new MediaStream(remote.getTracks()))
      }

      pc.onicecandidate = (event) => {
        if (event.candidate && socket) {
          socket.emit('call:ice-candidate', {
            callId: activeCallId,
            targetUserId,
            candidate: event.candidate.toJSON(),
          })
        }
      }

      pc.oniceconnectionstatechange = () => {
        const state = pc.iceConnectionState
        if (state === 'connected' || state === 'completed') {
          setCallState('connected')
        } else if (state === 'disconnected') {
          setCallState('reconnecting')
        } else if (state === 'failed') {
          toast.error('Video connection lost due to network failure.')
          if (socket && callIdRef.current) {
            socket.emit('call:end', { callId: callIdRef.current })
          }
          cleanupMediaAndPeer()
        }
      }

      pcRef.current = pc
      return pc
    },
    [socket, cleanupMediaAndPeer]
  )

  const startTimer = useCallback(() => {
    if (timerRef.current) clearInterval(timerRef.current)
    setCallDurationSeconds(0)
    timerRef.current = setInterval(() => {
      setCallDurationSeconds((prev) => prev + 1)
    }, 1000)
  }, [])

  const flushPendingIce = useCallback(async (pc: RTCPeerConnection) => {
    while (pendingIceRef.current.length > 0) {
      const candidate = pendingIceRef.current.shift()
      if (candidate) {
        await pc.addIceCandidate(new RTCIceCandidate(candidate)).catch(() => {})
      }
    }
  }, [])

  // Outgoing call
  const startCall = useCallback(
    async (targetUser: CallParticipant, convId: number) => {
      if (!socket || !socket.connected) {
        toast.error('Chat server is disconnected. Please wait a moment.')
        return
      }
      if (callStateRef.current !== 'idle') {
        toast.error('You are already on an active call.')
        return
      }

      setMediaError(null)
      isCallerRef.current = true

      let stream: MediaStream
      try {
        stream = await acquireLocalMedia()
      } catch (err) {
        const msg = getMediaErrorMessage(err)
        setMediaError(msg)
        toast.error(msg)
        return
      }

      setRemoteUser(targetUser)
      setConversationId(convId)
      setCallState('calling')
      callSoundManager.startOutgoingRingback()

      socket.emit(
        'call:request',
        { targetUserId: targetUser.id, conversationId: convId },
        (res: { success: boolean; callId?: string; status?: string; error?: string }) => {
          if (!res?.success || !res.callId) {
            const msg =
              res?.status === 'busy'
                ? `${targetUser.fullName} is currently on another call.`
                : res?.status === 'offline'
                  ? `${targetUser.fullName} is currently offline.`
                  : res?.error || 'Could not start video call.'
            toast.error(msg)
            cleanupMediaAndPeer()
            return
          }
          setCallId(res.callId)
          callIdRef.current = res.callId
        }
      )

      // Store stream ref cleanly; peer connection is created once receiver accepts
      localStreamRef.current = stream
    },
    [socket, acquireLocalMedia, cleanupMediaAndPeer]
  )

  // Accept incoming call
  const acceptCall = useCallback(async () => {
    const activeCallId = callIdRef.current
    const caller = remoteUserRef.current
    if (!socket || !activeCallId || !caller) return

    callSoundManager.stop()

    let stream: MediaStream
    try {
      stream = await acquireLocalMedia()
    } catch (err) {
      const msg = getMediaErrorMessage(err)
      toast.error(msg)
      socket.emit('call:reject', { callId: activeCallId, reason: 'media_denied' })
      cleanupMediaAndPeer()
      return
    }

    await createPeerConnection(activeCallId, caller.id, stream)

    socket.emit('call:accept', { callId: activeCallId }, (res: { success: boolean; error?: string }) => {
      if (!res?.success) {
        toast.error(res?.error || 'Call is no longer available.')
        cleanupMediaAndPeer()
        return
      }
      setCallState('connected')
      startTimer()
    })
  }, [socket, acquireLocalMedia, createPeerConnection, cleanupMediaAndPeer, startTimer])

  const rejectCall = useCallback(() => {
    const activeCallId = callIdRef.current
    if (socket && activeCallId) {
      socket.emit('call:reject', { callId: activeCallId, reason: 'rejected' })
    }
    cleanupMediaAndPeer()
  }, [socket, cleanupMediaAndPeer])

  const endCall = useCallback(() => {
    const activeCallId = callIdRef.current
    if (socket && activeCallId) {
      socket.emit('call:end', { callId: activeCallId })
    }
    cleanupMediaAndPeer()
  }, [socket, cleanupMediaAndPeer])

  const toggleMute = useCallback(() => {
    const stream = localStreamRef.current
    if (!stream) return
    const nextMuted = !isMuted
    stream.getAudioTracks().forEach((track) => {
      track.enabled = !nextMuted
    })
    setIsMuted(nextMuted)
  }, [isMuted])

  const toggleCamera = useCallback(() => {
    const stream = localStreamRef.current
    if (!stream) return
    const nextOff = !isCameraOff
    stream.getVideoTracks().forEach((track) => {
      track.enabled = !nextOff
    })
    setIsCameraOff(nextOff)
  }, [isCameraOff])

  const toggleScreenShare = useCallback(async () => {
    const pc = pcRef.current
    if (!pc) return

    const videoSender = pc.getSenders().find((s) => s.track?.kind === 'video')
    if (!videoSender) return

    if (isScreenSharing) {
      if (screenStreamRef.current) {
        screenStreamRef.current.getTracks().forEach((t) => t.stop())
        screenStreamRef.current = null
      }
      const camTrack = localStreamRef.current?.getVideoTracks()[0]
      if (camTrack) {
        await videoSender.replaceTrack(camTrack)
      }
      setIsScreenSharing(false)
      return
    }

    try {
      const screenStream = await navigator.mediaDevices.getDisplayMedia({ video: true })
      const screenTrack = screenStream.getVideoTracks()[0]
      if (!screenTrack) return

      screenStreamRef.current = screenStream
      await videoSender.replaceTrack(screenTrack)
      setIsScreenSharing(true)

      screenTrack.onended = () => {
        const camTrack = localStreamRef.current?.getVideoTracks()[0]
        if (camTrack && pcRef.current) {
          const sender = pcRef.current.getSenders().find((s) => s.track?.kind === 'video')
          void sender?.replaceTrack(camTrack)
        }
        screenStreamRef.current = null
        setIsScreenSharing(false)
      }
    } catch {
      // User cancelled screen share picker
    }
  }, [isScreenSharing])

  // Socket signaling listeners
  useEffect(() => {
    if (!socket) return

    const handleIncoming = (data: {
      callId: string
      conversationId: number
      caller: CallParticipant
    }) => {
      if (callStateRef.current !== 'idle') {
        socket.emit('call:reject', { callId: data.callId, reason: 'busy' })
        return
      }
      isCallerRef.current = false
      setCallId(data.callId)
      setConversationId(data.conversationId)
      setRemoteUser(data.caller)
      setCallState('ringing')
      callSoundManager.startIncomingRingtone()
    }

    const handleAccepted = async (data: {
      callId: string
      conversationId: number
      acceptedByUserId: number
    }) => {
      if (data.callId !== callIdRef.current) return

      // If another tab of the receiver accepted, stop ringing on this tab
      if (!isCallerRef.current) {
        if (callStateRef.current === 'ringing') {
          cleanupMediaAndPeer()
        }
        return
      }

      callSoundManager.stop()
      const stream = localStreamRef.current
      const target = remoteUserRef.current
      if (!stream || !target) return

      try {
        const pc = await createPeerConnection(data.callId, target.id, stream)
        const offer = await pc.createOffer()
        await pc.setLocalDescription(offer)

        socket.emit('call:offer', {
          callId: data.callId,
          targetUserId: target.id,
          sdp: { type: offer.type, sdp: offer.sdp },
        })

        setCallState('connected')
        startTimer()
      } catch {
        toast.error('Failed to establish WebRTC connection.')
        socket.emit('call:end', { callId: data.callId })
        cleanupMediaAndPeer()
      }
    }

    const handleRejected = (data: { callId: string; reason: string }) => {
      if (data.callId !== callIdRef.current) return
      toast.error(data.reason === 'busy' ? 'Employee is busy on another call.' : 'Call rejected.')
      cleanupMediaAndPeer()
    }

    const handleOffer = async (data: {
      callId: string
      fromUserId: number
      sdp: RTCSessionDescriptionInit
    }) => {
      if (data.callId !== callIdRef.current) return
      const pc = pcRef.current
      if (!pc) return

      try {
        await pc.setRemoteDescription(new RTCSessionDescription(data.sdp))
        await flushPendingIce(pc)
        const answer = await pc.createAnswer()
        await pc.setLocalDescription(answer)
        socket.emit('call:answer', {
          callId: data.callId,
          targetUserId: data.fromUserId,
          sdp: { type: answer.type, sdp: answer.sdp },
        })
      } catch {
        toast.error('Failed to negotiate video call.')
        cleanupMediaAndPeer()
      }
    }

    const handleAnswer = async (data: {
      callId: string
      fromUserId: number
      sdp: RTCSessionDescriptionInit
    }) => {
      if (data.callId !== callIdRef.current) return
      const pc = pcRef.current
      if (!pc) return

      try {
        await pc.setRemoteDescription(new RTCSessionDescription(data.sdp))
        await flushPendingIce(pc)
      } catch {
        // Ignore duplicate/late answer
      }
    }

    const handleIceCandidate = async (data: {
      callId: string
      fromUserId: number
      candidate: RTCIceCandidateInit
    }) => {
      if (data.callId !== callIdRef.current) return
      const pc = pcRef.current
      if (!pc || !pc.remoteDescription) {
        pendingIceRef.current.push(data.candidate)
        return
      }
      await pc.addIceCandidate(new RTCIceCandidate(data.candidate)).catch(() => {})
    }

    const handleEnded = (data: {
      callId: string
      reason: 'ended' | 'rejected' | 'timeout' | 'busy' | 'disconnected'
    }) => {
      if (data.callId !== callIdRef.current) return
      if (data.reason === 'timeout') {
        toast('No answer from employee.', { icon: '📵' })
      } else if (data.reason === 'disconnected') {
        toast('Call ended — peer disconnected.', { icon: '📡' })
      } else if (data.reason === 'ended' && callStateRef.current === 'connected') {
        toast('Video call ended.', { icon: '📹' })
      }
      cleanupMediaAndPeer()
    }

    socket.on('call:incoming', handleIncoming)
    socket.on('call:accepted', handleAccepted)
    socket.on('call:rejected', handleRejected)
    socket.on('call:offer', handleOffer)
    socket.on('call:answer', handleAnswer)
    socket.on('call:ice-candidate', handleIceCandidate)
    socket.on('call:ended', handleEnded)

    return () => {
      socket.off('call:incoming', handleIncoming)
      socket.off('call:accepted', handleAccepted)
      socket.off('call:rejected', handleRejected)
      socket.off('call:offer', handleOffer)
      socket.off('call:answer', handleAnswer)
      socket.off('call:ice-candidate', handleIceCandidate)
      socket.off('call:ended', handleEnded)
    }
  }, [socket, createPeerConnection, cleanupMediaAndPeer, flushPendingIce, startTimer])

  // Guarantee camera/mic release on provider unmount
  useEffect(() => {
    return () => {
      cleanupMediaAndPeer()
    }
  }, [cleanupMediaAndPeer])

  const value = useMemo<VideoCallContextValue>(
    () => ({
      callState,
      callId,
      conversationId,
      remoteUser,
      localStream,
      remoteStream,
      isMuted,
      isCameraOff,
      isScreenSharing,
      callDurationSeconds,
      mediaError,
      startCall,
      acceptCall,
      rejectCall,
      endCall,
      toggleMute,
      toggleCamera,
      toggleScreenShare,
    }),
    [
      callState,
      callId,
      conversationId,
      remoteUser,
      localStream,
      remoteStream,
      isMuted,
      isCameraOff,
      isScreenSharing,
      callDurationSeconds,
      mediaError,
      startCall,
      acceptCall,
      rejectCall,
      endCall,
      toggleMute,
      toggleCamera,
      toggleScreenShare,
    ]
  )

  return <VideoCallContext.Provider value={value}>{children}</VideoCallContext.Provider>
}

export function useVideoCall(): VideoCallContextValue {
  const ctx = useContext(VideoCallContext)
  if (!ctx) {
    throw new Error('useVideoCall must be used inside VideoCallProvider')
  }
  return ctx
}

