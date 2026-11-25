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
import {
  Room,
  RoomEvent,
  Track,
  type Participant,
} from 'livekit-client'
import { toast } from 'react-hot-toast'
import { useChat } from './ChatContext'
import {
  endMeetingApi,
  getMeetingApi,
  joinMeetingApi,
  leaveMeetingApi,
  type MeetingParticipantRole,
  type MeetingRecord,
} from '../lib/meeting-api'
import { readToken, getCurrentUser } from '../lib/auth-api'

export type MeetingUiStage = 'idle' | 'prejoin' | 'connecting' | 'in-meeting' | 'reconnecting'

export interface FloatingReaction {
  id: string
  userId: number
  fullName: string
  emoji: string
}

export interface UnifiedParticipantTile {
  identity: string
  userId: number | null
  name: string
  isLocal: boolean
  videoStream: MediaStream | null
  audioStream: MediaStream | null
  screenStream: MediaStream | null
  isMicMuted: boolean
  isCamOff: boolean
  isScreenSharing: boolean
}

interface PreJoinOptions {
  micEnabled: boolean
  camEnabled: boolean
  audioDeviceId?: string
  videoDeviceId?: string
}

interface MeshPeerState {
  userId: number
  name: string
  pc: RTCPeerConnection
  remoteStream: MediaStream
  pendingIce: RTCIceCandidateInit[]
  micMuted: boolean
  camOff: boolean
  screenSharing: boolean
}

interface MeetingContextValue {
  stage: MeetingUiStage
  activeMeeting: MeetingRecord | null
  myRole: MeetingParticipantRole
  myUserId: number | null
  participantTiles: UnifiedParticipantTile[]
  activeSpeakerIds: Set<string>
  pinnedIdentity: string | null
  setPinnedIdentity: (identity: string | null) => void
  presenterInfo: { userId: number; fullName: string } | null
  allowScreenShare: boolean
  raisedHands: Set<number>
  reactions: FloatingReaction[]
  isMicMuted: boolean
  isCamOff: boolean
  isScreenSharing: boolean
  durationSeconds: number
  incomingInvite: MeetingRecord | null
  dismissInvite: () => void
  openPreJoin: (meetingCode: string) => Promise<void>
  closePreJoin: () => void
  enterMeeting: (options: PreJoinOptions) => Promise<void>
  leaveMeeting: () => Promise<void>
  endMeetingForAll: () => Promise<void>
  toggleMic: () => Promise<void>
  toggleCamera: () => Promise<void>
  toggleScreenShare: () => Promise<void>
  toggleHandRaise: () => void
  sendReaction: (emoji: string) => void
  hostMuteParticipant: (targetUserId: number) => void
  hostRemoveParticipant: (targetUserId: number) => void
  hostToggleScreenSharePolicy: (allow: boolean) => void
}

const MeetingContext = createContext<MeetingContextValue | null>(null)

export function parseLiveKitUserId(identity: string): number | null {
  const match = /^user-(\d+)$/.exec(identity)
  return match ? Number(match[1]) : null
}

function buildStreamFromTrack(track: Track | undefined | null): MediaStream | null {
  const mst = track?.mediaStreamTrack
  if (!mst) return null
  return new MediaStream([mst])
}

export function MeetingProvider({ children }: { children: ReactNode }) {
  const { socket } = useChat()

  const [myUserId, setMyUserId] = useState<number | null>(null)
  const [myName, setMyName] = useState<string>('You')
  const [stage, setStage] = useState<MeetingUiStage>('idle')
  const [activeMeeting, setActiveMeeting] = useState<MeetingRecord | null>(null)
  const [myRole, setMyRole] = useState<MeetingParticipantRole>('PARTICIPANT')
  const [room, setRoom] = useState<Room | null>(null)
  const [participantsVersion, setParticipantsVersion] = useState(0)
  const [activeSpeakerIds, setActiveSpeakerIds] = useState<Set<string>>(new Set())
  const [pinnedIdentity, setPinnedIdentity] = useState<string | null>(null)
  const [presenterInfo, setPresenterInfo] = useState<{ userId: number; fullName: string } | null>(null)
  const [allowScreenShare, setAllowScreenShare] = useState(true)
  const [raisedHands, setRaisedHands] = useState<Set<number>>(new Set())
  const [reactions, setReactions] = useState<FloatingReaction[]>([])
  const [isMicMuted, setIsMicMuted] = useState(false)
  const [isCamOff, setIsCamOff] = useState(false)
  const [isScreenSharing, setIsScreenSharing] = useState(false)
  const [durationSeconds, setDurationSeconds] = useState(0)
  const [incomingInvite, setIncomingInvite] = useState<MeetingRecord | null>(null)

  // Mesh fallback refs & state
  const transportModeRef = useRef<'livekit' | 'mesh' | null>(null)
  const meshPeersRef = useRef<Map<number, MeshPeerState>>(new Map())
  const meshIceServersRef = useRef<RTCIceServer[]>([{ urls: 'stun:stun.l.google.com:19302' }])
  const meshLocalStreamRef = useRef<MediaStream | null>(null)
  const meshScreenStreamRef = useRef<MediaStream | null>(null)
  const [meshVersion, setMeshVersion] = useState(0)

  const roomRef = useRef<Room | null>(null)
  const activeMeetingRef = useRef<MeetingRecord | null>(null)
  const timerRef = useRef<ReturnType<typeof setInterval> | null>(null)
  const stageRef = useRef<MeetingUiStage>('idle')

  activeMeetingRef.current = activeMeeting
  stageRef.current = stage

  useEffect(() => {
    const token = readToken()
    if (!token) return
    getCurrentUser(token)
      .then((u) => {
        setMyUserId(u.id)
        setMyName(u.fullName || u.email)
      })
      .catch(() => {})
  }, [])

  const bumpParticipants = useCallback(() => {
    setParticipantsVersion((v) => v + 1)
  }, [])

  const bumpMesh = useCallback(() => {
    setMeshVersion((v) => v + 1)
  }, [])

  const cleanupRoom = useCallback(async () => {
    if (timerRef.current) {
      clearInterval(timerRef.current)
      timerRef.current = null
    }

    const currentRoom = roomRef.current
    const code = activeMeetingRef.current?.meetingCode

    if (currentRoom) {
      try {
        currentRoom.localParticipant.trackPublications.forEach((pub) => {
          pub.track?.stop()
        })
        await currentRoom.disconnect()
      } catch {
        // ignore
      }
      roomRef.current = null
    }

    // Cleanup mesh fallback resources
    meshPeersRef.current.forEach((peer) => {
      peer.pc.onicecandidate = null
      peer.pc.ontrack = null
      peer.pc.oniceconnectionstatechange = null
      peer.pc.close()
    })
    meshPeersRef.current.clear()

    if (meshScreenStreamRef.current) {
      meshScreenStreamRef.current.getTracks().forEach((t) => t.stop())
      meshScreenStreamRef.current = null
    }
    if (meshLocalStreamRef.current) {
      meshLocalStreamRef.current.getTracks().forEach((t) => t.stop())
      meshLocalStreamRef.current = null
    }
    transportModeRef.current = null

    if (socket && code) {
      socket.emit('meeting:leave-room', { meetingCode: code })
    }

    setRoom(null)
    setActiveMeeting(null)
    setPinnedIdentity(null)
    setPresenterInfo(null)
    setRaisedHands(new Set())
    setReactions([])
    setActiveSpeakerIds(new Set())
    setIsMicMuted(false)
    setIsCamOff(false)
    setIsScreenSharing(false)
    setDurationSeconds(0)
    setStage('idle')
    bumpMesh()
  }, [socket, bumpMesh])

  const createMeshPeer = useCallback(
    (peerUserId: number, peerName: string, meetingCode: string, reuseExisting = false): MeshPeerState => {
      const existing = meshPeersRef.current.get(peerUserId)
      if (existing && reuseExisting && existing.pc.signalingState !== 'closed') {
        return existing
      }
      if (existing) {
        existing.pc.close()
      }

      const pc = new RTCPeerConnection({ iceServers: meshIceServersRef.current })
      const remoteStream = new MediaStream()

      const local = meshLocalStreamRef.current
      if (local) {
        local.getTracks().forEach((track) => {
          pc.addTrack(track, local)
        })
      }

      // Ensure audio & video transceivers always exist even if user has no webcam/mic
      const hasAudioSender = pc.getSenders().some((s) => s.track?.kind === 'audio')
      const hasVideoSender = pc.getSenders().some((s) => s.track?.kind === 'video')
      if (!hasAudioSender) {
        pc.addTransceiver('audio', { direction: 'sendrecv' })
      }
      if (!hasVideoSender) {
        pc.addTransceiver('video', { direction: 'sendrecv' })
      }

      const peerState: MeshPeerState = {
        userId: peerUserId,
        name: peerName,
        pc,
        remoteStream,
        pendingIce: [],
        micMuted: false,
        camOff: false,
        screenSharing: false,
      }

      pc.ontrack = (event) => {
        event.streams[0]?.getTracks().forEach((t) => {
          if (!remoteStream.getTracks().some((rt) => rt.id === t.id)) {
            remoteStream.addTrack(t)
          }
        })
        if (event.streams.length === 0 && event.track) {
          if (!remoteStream.getTracks().some((rt) => rt.id === event.track.id)) {
            remoteStream.addTrack(event.track)
          }
        }
        bumpMesh()
      }

      pc.onicecandidate = (event) => {
        if (event.candidate && socket) {
          socket.emit('meeting:rtc-ice', {
            meetingCode,
            targetUserId: peerUserId,
            candidate: event.candidate.toJSON(),
          })
        }
      }

      pc.oniceconnectionstatechange = () => {
        if (pc.iceConnectionState === 'disconnected') {
          setStage('reconnecting')
        } else if (pc.iceConnectionState === 'connected' || pc.iceConnectionState === 'completed') {
          setStage('in-meeting')
        }
      }

      meshPeersRef.current.set(peerUserId, peerState)
      bumpMesh()
      return peerState
    },
    [socket, bumpMesh]
  )

  const openPreJoin = useCallback(async (meetingCode: string) => {
    if (stageRef.current === 'in-meeting' || stageRef.current === 'connecting') {
      toast.error('You are already in a meeting. Leave it first to join another.')
      return
    }
    try {
      const { meeting } = await getMeetingApi(meetingCode)
      if (meeting.status === 'ENDED' || meeting.status === 'MISSED') {
        toast.error('This meeting has already ended.')
        return
      }
      setActiveMeeting(meeting)
      setAllowScreenShare(meeting.allowScreenShare)
      setIncomingInvite(null)
      setStage('prejoin')
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Unable to load meeting')
    }
  }, [])

  const closePreJoin = useCallback(() => {
    setActiveMeeting(null)
    setStage('idle')
  }, [])

  const enterMeeting = useCallback(
    async (options: PreJoinOptions) => {
      const target = activeMeetingRef.current
      if (!target) return

      setStage('connecting')
      try {
        const joinRes = await joinMeetingApi(target.meetingCode)
        setActiveMeeting(joinRes.meeting)
        setMyRole(joinRes.role)
        setAllowScreenShare(joinRes.meeting.allowScreenShare)

        // MODE A: LiveKit SFU (when LIVEKIT_URL + token are configured)
        if (joinRes.livekitUrl && joinRes.token) {
          transportModeRef.current = 'livekit'

          const lkRoom = new Room({
            adaptiveStream: true,
            dynacast: true,
            videoCaptureDefaults: {
              deviceId: options.videoDeviceId,
              resolution: { width: 1280, height: 720, frameRate: 30 },
            },
            audioCaptureDefaults: {
              deviceId: options.audioDeviceId,
              echoCancellation: true,
              noiseSuppression: true,
            },
          })

          lkRoom
            .on(RoomEvent.ParticipantConnected, bumpParticipants)
            .on(RoomEvent.ParticipantDisconnected, bumpParticipants)
            .on(RoomEvent.TrackSubscribed, bumpParticipants)
            .on(RoomEvent.TrackUnsubscribed, bumpParticipants)
            .on(RoomEvent.TrackMuted, bumpParticipants)
            .on(RoomEvent.TrackUnmuted, bumpParticipants)
            .on(RoomEvent.LocalTrackPublished, bumpParticipants)
            .on(RoomEvent.LocalTrackUnpublished, (pub) => {
              if (pub.source === Track.Source.ScreenShare) {
                setIsScreenSharing(false)
                socket?.emit('meeting:screen-share-stop', { meetingCode: target.meetingCode })
              }
              bumpParticipants()
            })
            .on(RoomEvent.ActiveSpeakersChanged, (speakers: Participant[]) => {
              setActiveSpeakerIds(new Set(speakers.map((s) => s.identity)))
            })
            .on(RoomEvent.Reconnecting, () => setStage('reconnecting'))
            .on(RoomEvent.Reconnected, () => setStage('in-meeting'))
            .on(RoomEvent.Disconnected, () => {
              if (roomRef.current === lkRoom) {
                void cleanupRoom()
              }
            })

          await lkRoom.connect(joinRes.livekitUrl, joinRes.token)

          try {
            await lkRoom.localParticipant.setMicrophoneEnabled(options.micEnabled)
            setIsMicMuted(!options.micEnabled)
          } catch {
            setIsMicMuted(true)
          }

          try {
            await lkRoom.localParticipant.setCameraEnabled(options.camEnabled)
            setIsCamOff(!options.camEnabled)
          } catch {
            setIsCamOff(true)
          }

          roomRef.current = lkRoom
          setRoom(lkRoom)
          setStage('in-meeting')
          bumpParticipants()
        } else {
          // MODE B: Built-in Socket.io WebRTC Mesh Fallback (zero external config needed!)
          transportModeRef.current = 'mesh'
          meshIceServersRef.current =
            joinRes.iceServers?.length > 0
              ? joinRes.iceServers
              : [{ urls: 'stun:stun.l.google.com:19302' }]

          let stream: MediaStream | null = null
          try {
            stream = await navigator.mediaDevices.getUserMedia({
              video: options.videoDeviceId
                ? { deviceId: { exact: options.videoDeviceId }, width: { ideal: 1280 }, height: { ideal: 720 } }
                : { width: { ideal: 1280 }, height: { ideal: 720 } },
              audio: options.audioDeviceId
                ? { deviceId: { exact: options.audioDeviceId }, echoCancellation: true, noiseSuppression: true }
                : { echoCancellation: true, noiseSuppression: true },
            })
          } catch {
            // Allow joining audio-only or listen-only if camera/mic blocked
            stream = new MediaStream()
          }

          stream.getAudioTracks().forEach((t) => {
            t.enabled = options.micEnabled
          })
          stream.getVideoTracks().forEach((t) => {
            t.enabled = options.camEnabled
          })

          meshLocalStreamRef.current = stream
          setIsMicMuted(!options.micEnabled || stream.getAudioTracks().length === 0)
          setIsCamOff(!options.camEnabled || stream.getVideoTracks().length === 0)
          setStage('in-meeting')
          bumpMesh()
        }

        // Sync Socket.io room state (and connect to existing peers in mesh mode)
        if (socket) {
          socket.emit(
            'meeting:join-room',
            { meetingCode: target.meetingCode },
            async (res: {
              success: boolean
              presenter?: { userId: number; fullName: string } | null
              allowScreenShare?: boolean
              raisedHands?: number[]
              peers?: Array<{ userId: number; fullName: string }>
            }) => {
              if (!res?.success) return
              setPresenterInfo(res.presenter || null)
              if (typeof res.allowScreenShare === 'boolean') {
                setAllowScreenShare(res.allowScreenShare)
              }
              if (Array.isArray(res.raisedHands)) {
                setRaisedHands(new Set(res.raisedHands))
              }

              if (transportModeRef.current === 'mesh' && Array.isArray(res.peers)) {
                for (const p of res.peers) {
                  const peer = createMeshPeer(p.userId, p.fullName, target.meetingCode)
                  const offer = await peer.pc.createOffer()
                  await peer.pc.setLocalDescription(offer)
                  socket.emit('meeting:rtc-offer', {
                    meetingCode: target.meetingCode,
                    targetUserId: p.userId,
                    sdp: { type: offer.type, sdp: offer.sdp },
                  })
                }
                socket.emit('meeting:rtc-media-state', {
                  meetingCode: target.meetingCode,
                  micMuted: !options.micEnabled,
                  camOff: !options.camEnabled,
                  screenSharing: false,
                })
              }
            }
          )
        }

        if (timerRef.current) clearInterval(timerRef.current)
        setDurationSeconds(0)
        timerRef.current = setInterval(() => {
          setDurationSeconds((s) => s + 1)
        }, 1000)
      } catch (err) {
        toast.error(err instanceof Error ? err.message : 'Failed to enter meeting')
        await cleanupRoom()
      }
    },
    [socket, bumpParticipants, bumpMesh, cleanupRoom, createMeshPeer]
  )

  const leaveMeeting = useCallback(async () => {
    const code = activeMeetingRef.current?.meetingCode
    await cleanupRoom()
    if (code) {
      await leaveMeetingApi(code).catch(() => {})
    }
  }, [cleanupRoom])

  const endMeetingForAll = useCallback(async () => {
    const code = activeMeetingRef.current?.meetingCode
    if (!code) return
    try {
      await endMeetingApi(code)
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Failed to end meeting')
    } finally {
      await cleanupRoom()
    }
  }, [cleanupRoom])

  const toggleMic = useCallback(async () => {
    const nextMuted = !isMicMuted
    if (transportModeRef.current === 'livekit' && roomRef.current) {
      try {
        await roomRef.current.localParticipant.setMicrophoneEnabled(!nextMuted)
        setIsMicMuted(nextMuted)
        bumpParticipants()
      } catch {
        toast.error('Unable to toggle microphone')
      }
      return
    }

    if (transportModeRef.current === 'mesh' && meshLocalStreamRef.current) {
      meshLocalStreamRef.current.getAudioTracks().forEach((t) => {
        t.enabled = !nextMuted
      })
      setIsMicMuted(nextMuted)
      const code = activeMeetingRef.current?.meetingCode
      if (socket && code) {
        socket.emit('meeting:rtc-media-state', {
          meetingCode: code,
          micMuted: nextMuted,
          camOff: isCamOff,
          screenSharing: isScreenSharing,
        })
      }
      bumpMesh()
    }
  }, [isMicMuted, isCamOff, isScreenSharing, socket, bumpParticipants, bumpMesh])

  const toggleCamera = useCallback(async () => {
    const nextOff = !isCamOff
    if (transportModeRef.current === 'livekit' && roomRef.current) {
      try {
        await roomRef.current.localParticipant.setCameraEnabled(!nextOff)
        setIsCamOff(nextOff)
        bumpParticipants()
      } catch {
        toast.error('Unable to toggle camera')
      }
      return
    }

    if (transportModeRef.current === 'mesh' && meshLocalStreamRef.current) {
      meshLocalStreamRef.current.getVideoTracks().forEach((t) => {
        t.enabled = !nextOff
      })
      setIsCamOff(nextOff)
      const code = activeMeetingRef.current?.meetingCode
      if (socket && code) {
        socket.emit('meeting:rtc-media-state', {
          meetingCode: code,
          micMuted: isMicMuted,
          camOff: nextOff,
          screenSharing: isScreenSharing,
        })
      }
      bumpMesh()
    }
  }, [isCamOff, isMicMuted, isScreenSharing, socket, bumpParticipants, bumpMesh])

  const stopMeshScreenShare = useCallback(async () => {
    const code = activeMeetingRef.current?.meetingCode
    if (meshScreenStreamRef.current) {
      meshScreenStreamRef.current.getTracks().forEach((t) => t.stop())
      meshScreenStreamRef.current = null
    }
    const camTrack = meshLocalStreamRef.current?.getVideoTracks()[0] || null
    meshPeersRef.current.forEach((peer) => {
      const videoTransceiver = peer.pc.getTransceivers().find((t) => t.receiver.track?.kind === 'video')
      const sender = peer.pc.getSenders().find((s) => s.track?.kind === 'video') || videoTransceiver?.sender
      if (sender) {
        void sender.replaceTrack(camTrack)
      }
    })
    setIsScreenSharing(false)
    if (socket && code) {
      socket.emit('meeting:screen-share-stop', { meetingCode: code })
      socket.emit('meeting:rtc-media-state', {
        meetingCode: code,
        micMuted: isMicMuted,
        camOff: isCamOff,
        screenSharing: false,
      })
    }
    bumpMesh()
  }, [socket, isMicMuted, isCamOff, bumpMesh])

  const toggleScreenShare = useCallback(async () => {
    const code = activeMeetingRef.current?.meetingCode
    if (!code) return

    if (isScreenSharing) {
      if (transportModeRef.current === 'livekit' && roomRef.current) {
        await roomRef.current.localParticipant.setScreenShareEnabled(false).catch(() => {})
        setIsScreenSharing(false)
        socket?.emit('meeting:screen-share-stop', { meetingCode: code })
        bumpParticipants()
      } else {
        await stopMeshScreenShare()
      }
      return
    }

    if (!navigator.mediaDevices?.getDisplayMedia) {
      toast.error('Screen sharing is not supported in this browser.')
      return
    }

    if (socket) {
      const allowed = await new Promise<{ success: boolean; error?: string }>((resolve) => {
        socket.emit('meeting:screen-share-start', { meetingCode: code }, (res: { success: boolean; error?: string }) =>
          resolve(res || { success: false })
        )
      })
      if (!allowed.success) {
        toast.error(allowed.error || 'Cannot share screen right now.')
        return
      }
    }

    if (transportModeRef.current === 'livekit' && roomRef.current) {
      try {
        const pub = await roomRef.current.localParticipant.setScreenShareEnabled(true, { audio: true })
        if (!pub) {
          socket?.emit('meeting:screen-share-stop', { meetingCode: code })
          return
        }
        setIsScreenSharing(true)
        pub.track?.mediaStreamTrack?.addEventListener('ended', () => {
          setIsScreenSharing(false)
          void roomRef.current?.localParticipant.setScreenShareEnabled(false).catch(() => {})
          socket?.emit('meeting:screen-share-stop', { meetingCode: code })
          bumpParticipants()
        })
        bumpParticipants()
      } catch {
        socket?.emit('meeting:screen-share-stop', { meetingCode: code })
      }
      return
    }

    // Mesh screen share
    try {
      const screenStream = await navigator.mediaDevices.getDisplayMedia({ video: true })
      const screenTrack = screenStream.getVideoTracks()[0]
      if (!screenTrack) {
        socket?.emit('meeting:screen-share-stop', { meetingCode: code })
        return
      }
      screenTrack.enabled = true
      meshScreenStreamRef.current = screenStream

      for (const peer of meshPeersRef.current.values()) {
        const videoTransceiver = peer.pc.getTransceivers().find((t) => t.receiver.track?.kind === 'video')
        const sender = peer.pc.getSenders().find((s) => s.track?.kind === 'video') || videoTransceiver?.sender
        if (sender) {
          await sender.replaceTrack(screenTrack)
          if (videoTransceiver && videoTransceiver.direction === 'recvonly') {
            videoTransceiver.direction = 'sendrecv'
          }
        } else {
          peer.pc.addTrack(screenTrack, screenStream)
        }

        // Renegotiate if needed so remote side always activates the video stream
        if (peer.pc.signalingState === 'stable' && socket) {
          const offer = await peer.pc.createOffer()
          await peer.pc.setLocalDescription(offer)
          socket.emit('meeting:rtc-offer', {
            meetingCode: code,
            targetUserId: peer.userId,
            sdp: { type: offer.type, sdp: offer.sdp },
          })
        }
      }

      setIsScreenSharing(true)
      socket?.emit('meeting:rtc-media-state', {
        meetingCode: code,
        micMuted: isMicMuted,
        camOff: isCamOff,
        screenSharing: true,
      })
      screenTrack.addEventListener('ended', () => {
        void stopMeshScreenShare()
      })
      bumpMesh()
    } catch {
      socket?.emit('meeting:screen-share-stop', { meetingCode: code })
    }
  }, [isScreenSharing, isMicMuted, isCamOff, socket, bumpParticipants, bumpMesh, stopMeshScreenShare])

  const toggleHandRaise = useCallback(() => {
    const code = activeMeetingRef.current?.meetingCode
    if (!socket || !code || !myUserId) return
    const currentlyRaised = raisedHands.has(myUserId)
    socket.emit('meeting:hand-raise', { meetingCode: code, raised: !currentlyRaised })
  }, [socket, myUserId, raisedHands])

  const sendReaction = useCallback(
    (emoji: string) => {
      const code = activeMeetingRef.current?.meetingCode
      if (!socket || !code) return
      socket.emit('meeting:reaction', { meetingCode: code, emoji })
    },
    [socket]
  )

  const hostMuteParticipant = useCallback(
    (targetUserId: number) => {
      const code = activeMeetingRef.current?.meetingCode
      if (!socket || !code) return
      socket.emit('meeting:host-mute', { meetingCode: code, targetUserId })
    },
    [socket]
  )

  const hostRemoveParticipant = useCallback(
    (targetUserId: number) => {
      const code = activeMeetingRef.current?.meetingCode
      if (!socket || !code) return
      socket.emit('meeting:host-remove', { meetingCode: code, targetUserId })
    },
    [socket]
  )

  const hostToggleScreenSharePolicy = useCallback(
    (allow: boolean) => {
      const code = activeMeetingRef.current?.meetingCode
      if (!socket || !code) return
      socket.emit('meeting:host-screen-share-policy', { meetingCode: code, allowScreenShare: allow })
    },
    [socket]
  )

  // Global Socket.io listeners for Meeting lifecycle + Mesh fallback signaling
  useEffect(() => {
    if (!socket) return

    const onMeetingStarted = ({ meeting }: { meeting: MeetingRecord }) => {
      if (stageRef.current === 'idle') {
        setIncomingInvite(meeting)
      }
    }

    const onMeetingReminder = ({ meeting }: { meeting: MeetingRecord }) => {
      toast(`Reminder: "${meeting.title}" starts in 10 minutes!`, { icon: '⏰', duration: 6000 })
      if (stageRef.current === 'idle') {
        setIncomingInvite(meeting)
      }
    }

    const onMeetingEnded = ({ meetingCode, durationMinutes }: { meetingCode: string; durationMinutes: number }) => {
      if (activeMeetingRef.current?.meetingCode === meetingCode) {
        toast(`Meeting ended by host (${durationMinutes} min).`, { icon: '🎥' })
        void cleanupRoom()
      }
      setIncomingInvite((prev) => (prev?.meetingCode === meetingCode ? null : prev))
    }

    const onHostChanged = ({ meetingCode, newHostId }: { meetingCode: string; newHostId: number }) => {
      if (activeMeetingRef.current?.meetingCode !== meetingCode) return
      setActiveMeeting((prev) => (prev ? { ...prev, hostId: newHostId } : prev))
      if (myUserId === newHostId) {
        setMyRole('HOST')
        toast.success('You are now the meeting host.')
      }
    }

    const onScreenShareStarted = (data: {
      meetingCode: string
      presenterUserId: number
      presenterName: string
    }) => {
      if (activeMeetingRef.current?.meetingCode !== data.meetingCode) return
      setPresenterInfo({ userId: data.presenterUserId, fullName: data.presenterName })
    }

    const onScreenShareStopped = (data: { meetingCode: string }) => {
      if (activeMeetingRef.current?.meetingCode !== data.meetingCode) return
      setPresenterInfo(null)
    }

    const onHandRaise = (data: { meetingCode: string; userId: number; fullName: string; raised: boolean }) => {
      if (activeMeetingRef.current?.meetingCode !== data.meetingCode) return
      setRaisedHands((prev) => {
        const next = new Set(prev)
        if (data.raised) next.add(data.userId)
        else next.delete(data.userId)
        return next
      })
    }

    const onReaction = (data: { meetingCode: string; userId: number; fullName: string; emoji: string }) => {
      if (activeMeetingRef.current?.meetingCode !== data.meetingCode) return
      const id = `${Date.now()}-${Math.random()}`
      setReactions((prev) => [...prev.slice(-10), { id, userId: data.userId, fullName: data.fullName, emoji: data.emoji }])
      setTimeout(() => {
        setReactions((prev) => prev.filter((r) => r.id !== id))
      }, 3500)
    }

    const onMutedByHost = ({ meetingCode, hostName }: { meetingCode: string; hostName: string }) => {
      if (activeMeetingRef.current?.meetingCode !== meetingCode) return
      if (transportModeRef.current === 'livekit' && roomRef.current) {
        void roomRef.current.localParticipant.setMicrophoneEnabled(false).catch(() => {})
        setIsMicMuted(true)
        bumpParticipants()
      } else if (meshLocalStreamRef.current) {
        meshLocalStreamRef.current.getAudioTracks().forEach((t) => {
          t.enabled = false
        })
        setIsMicMuted(true)
        bumpMesh()
      }
      toast(`${hostName} muted your microphone.`, { icon: '🔇' })
    }

    const onRemovedByHost = ({ meetingCode, hostName }: { meetingCode: string; hostName: string }) => {
      if (activeMeetingRef.current?.meetingCode !== meetingCode) return
      toast.error(`You were removed from the meeting by ${hostName}.`)
      void cleanupRoom()
    }

    const onScreenPolicy = ({ meetingCode, allowScreenShare: allow }: { meetingCode: string; allowScreenShare: boolean }) => {
      if (activeMeetingRef.current?.meetingCode !== meetingCode) return
      setAllowScreenShare(allow)
      if (!allow && myRole !== 'HOST' && isScreenSharing) {
        if (transportModeRef.current === 'livekit') {
          void roomRef.current?.localParticipant.setScreenShareEnabled(false).catch(() => {})
          setIsScreenSharing(false)
        } else {
          void stopMeshScreenShare()
        }
        toast('Host disabled screen sharing for participants.')
      }
    }

    // Mesh fallback signaling handlers
    const onMeshPeerJoined = ({ meetingCode }: { meetingCode: string }) => {
      if (activeMeetingRef.current?.meetingCode !== meetingCode || transportModeRef.current !== 'mesh') return
      // The joining peer sends the offer
    }

    const onMeshPeerLeft = ({ meetingCode, userId }: { meetingCode: string; userId: number }) => {
      if (activeMeetingRef.current?.meetingCode !== meetingCode || transportModeRef.current !== 'mesh') return
      const peer = meshPeersRef.current.get(userId)
      if (peer) {
        peer.pc.close()
        meshPeersRef.current.delete(userId)
        bumpMesh()
      }
    }

    const onMeshOffer = async (data: {
      meetingCode: string
      fromUserId: number
      fromName: string
      sdp: RTCSessionDescriptionInit
    }) => {
      if (activeMeetingRef.current?.meetingCode !== data.meetingCode || transportModeRef.current !== 'mesh') return
      const peer = createMeshPeer(data.fromUserId, data.fromName, data.meetingCode, true)
      await peer.pc.setRemoteDescription(new RTCSessionDescription(data.sdp))
      while (peer.pendingIce.length > 0) {
        const c = peer.pendingIce.shift()
        if (c) await peer.pc.addIceCandidate(new RTCIceCandidate(c)).catch(() => {})
      }
      const answer = await peer.pc.createAnswer()
      await peer.pc.setLocalDescription(answer)
      socket.emit('meeting:rtc-answer', {
        meetingCode: data.meetingCode,
        targetUserId: data.fromUserId,
        sdp: { type: answer.type, sdp: answer.sdp },
      })
    }

    const onMeshAnswer = async (data: {
      meetingCode: string
      fromUserId: number
      sdp: RTCSessionDescriptionInit
    }) => {
      if (activeMeetingRef.current?.meetingCode !== data.meetingCode || transportModeRef.current !== 'mesh') return
      const peer = meshPeersRef.current.get(data.fromUserId)
      if (!peer) return
      await peer.pc.setRemoteDescription(new RTCSessionDescription(data.sdp))
      while (peer.pendingIce.length > 0) {
        const c = peer.pendingIce.shift()
        if (c) await peer.pc.addIceCandidate(new RTCIceCandidate(c)).catch(() => {})
      }
    }

    const onMeshIce = async (data: {
      meetingCode: string
      fromUserId: number
      candidate: RTCIceCandidateInit
    }) => {
      if (activeMeetingRef.current?.meetingCode !== data.meetingCode || transportModeRef.current !== 'mesh') return
      const peer = meshPeersRef.current.get(data.fromUserId)
      if (!peer) return
      if (!peer.pc.remoteDescription) {
        peer.pendingIce.push(data.candidate)
        return
      }
      await peer.pc.addIceCandidate(new RTCIceCandidate(data.candidate)).catch(() => {})
    }

    const onMeshMediaState = (data: {
      meetingCode: string
      userId: number
      micMuted: boolean
      camOff: boolean
      screenSharing: boolean
    }) => {
      if (activeMeetingRef.current?.meetingCode !== data.meetingCode || transportModeRef.current !== 'mesh') return
      const peer = meshPeersRef.current.get(data.userId)
      if (!peer) return
      peer.micMuted = data.micMuted
      peer.camOff = data.camOff
      peer.screenSharing = data.screenSharing
      bumpMesh()
    }

    socket.on('meeting:started', onMeetingStarted)
    socket.on('meeting:reminder', onMeetingReminder)
    socket.on('meeting:ended', onMeetingEnded)
    socket.on('meeting:host-changed', onHostChanged)
    socket.on('meeting:screen-share-started', onScreenShareStarted)
    socket.on('meeting:screen-share-stopped', onScreenShareStopped)
    socket.on('meeting:hand-raise', onHandRaise)
    socket.on('meeting:reaction', onReaction)
    socket.on('meeting:muted-by-host', onMutedByHost)
    socket.on('meeting:removed-by-host', onRemovedByHost)
    socket.on('meeting:screen-share-policy', onScreenPolicy)
    socket.on('meeting:rtc-peer-joined', onMeshPeerJoined)
    socket.on('meeting:rtc-peer-left', onMeshPeerLeft)
    socket.on('meeting:rtc-offer', onMeshOffer)
    socket.on('meeting:rtc-answer', onMeshAnswer)
    socket.on('meeting:rtc-ice', onMeshIce)
    socket.on('meeting:rtc-media-state', onMeshMediaState)

    return () => {
      socket.off('meeting:started', onMeetingStarted)
      socket.off('meeting:reminder', onMeetingReminder)
      socket.off('meeting:ended', onMeetingEnded)
      socket.off('meeting:host-changed', onHostChanged)
      socket.off('meeting:screen-share-started', onScreenShareStarted)
      socket.off('meeting:screen-share-stopped', onScreenShareStopped)
      socket.off('meeting:hand-raise', onHandRaise)
      socket.off('meeting:reaction', onReaction)
      socket.off('meeting:muted-by-host', onMutedByHost)
      socket.off('meeting:removed-by-host', onRemovedByHost)
      socket.off('meeting:screen-share-policy', onScreenPolicy)
      socket.off('meeting:rtc-peer-joined', onMeshPeerJoined)
      socket.off('meeting:rtc-peer-left', onMeshPeerLeft)
      socket.off('meeting:rtc-offer', onMeshOffer)
      socket.off('meeting:rtc-answer', onMeshAnswer)
      socket.off('meeting:rtc-ice', onMeshIce)
      socket.off('meeting:rtc-media-state', onMeshMediaState)
    }
  }, [socket, myUserId, cleanupRoom, bumpParticipants, bumpMesh, createMeshPeer, myRole, isScreenSharing, stopMeshScreenShare])

  useEffect(() => {
    return () => {
      void cleanupRoom()
    }
  }, [cleanupRoom])

  // Unified participant tiles across LiveKit SFU and Mesh fallback
  const participantTiles = useMemo<UnifiedParticipantTile[]>(() => {
    if (transportModeRef.current === 'livekit' && room) {
      const list = [room.localParticipant, ...Array.from(room.remoteParticipants.values())]
      return list.map((p) => {
        const camPub = p.getTrackPublication(Track.Source.Camera)
        const micPub = p.getTrackPublication(Track.Source.Microphone)
        const scrPub = p.getTrackPublication(Track.Source.ScreenShare)
        const isLocal = p.identity === room.localParticipant.identity
        return {
          identity: p.identity,
          userId: parseLiveKitUserId(p.identity),
          name: p.name || 'Employee',
          isLocal,
          videoStream: camPub?.track && !camPub.isMuted ? buildStreamFromTrack(camPub.track) : null,
          audioStream: !isLocal && micPub?.track && !micPub.isMuted ? buildStreamFromTrack(micPub.track) : null,
          screenStream: scrPub?.track && !scrPub.isMuted ? buildStreamFromTrack(scrPub.track) : null,
          isMicMuted: !micPub || micPub.isMuted,
          isCamOff: !camPub || camPub.isMuted || !camPub.track,
          isScreenSharing: Boolean(scrPub?.track && !scrPub.isMuted),
        }
      })
    }

    if (transportModeRef.current === 'mesh') {
      const tiles: UnifiedParticipantTile[] = [
        {
          identity: `user-${myUserId || 0}`,
          userId: myUserId,
          name: myName,
          isLocal: true,
          videoStream: !isCamOff && !isScreenSharing ? meshLocalStreamRef.current : null,
          audioStream: null,
          screenStream: isScreenSharing ? meshScreenStreamRef.current : null,
          isMicMuted,
          isCamOff,
          isScreenSharing,
        },
      ]

      meshPeersRef.current.forEach((peer) => {
        const videoTracks = peer.remoteStream.getVideoTracks()
        const screenOnlyStream = videoTracks.length > 0 ? new MediaStream(videoTracks) : peer.remoteStream
        tiles.push({
          identity: `user-${peer.userId}`,
          userId: peer.userId,
          name: peer.name,
          isLocal: false,
          videoStream: !peer.camOff && !peer.screenSharing ? screenOnlyStream : null,
          audioStream: peer.remoteStream,
          screenStream: peer.screenSharing ? screenOnlyStream : null,
          isMicMuted: peer.micMuted,
          isCamOff: peer.camOff,
          isScreenSharing: peer.screenSharing,
        })
      })
      return tiles
    }

    return []
  }, [room, participantsVersion, meshVersion, myUserId, myName, isMicMuted, isCamOff, isScreenSharing])

  const value = useMemo<MeetingContextValue>(
    () => ({
      stage,
      activeMeeting,
      myRole,
      myUserId,
      participantTiles,
      activeSpeakerIds,
      pinnedIdentity,
      setPinnedIdentity,
      presenterInfo,
      allowScreenShare,
      raisedHands,
      reactions,
      isMicMuted,
      isCamOff,
      isScreenSharing,
      durationSeconds,
      incomingInvite,
      dismissInvite: () => setIncomingInvite(null),
      openPreJoin,
      closePreJoin,
      enterMeeting,
      leaveMeeting,
      endMeetingForAll,
      toggleMic,
      toggleCamera,
      toggleScreenShare,
      toggleHandRaise,
      sendReaction,
      hostMuteParticipant,
      hostRemoveParticipant,
      hostToggleScreenSharePolicy,
    }),
    [
      stage,
      activeMeeting,
      myRole,
      myUserId,
      participantTiles,
      activeSpeakerIds,
      pinnedIdentity,
      presenterInfo,
      allowScreenShare,
      raisedHands,
      reactions,
      isMicMuted,
      isCamOff,
      isScreenSharing,
      durationSeconds,
      incomingInvite,
      openPreJoin,
      closePreJoin,
      enterMeeting,
      leaveMeeting,
      endMeetingForAll,
      toggleMic,
      toggleCamera,
      toggleScreenShare,
      toggleHandRaise,
      sendReaction,
      hostMuteParticipant,
      hostRemoveParticipant,
      hostToggleScreenSharePolicy,
    ]
  )

  return <MeetingContext.Provider value={value}>{children}</MeetingContext.Provider>
}

export function useMeeting(): MeetingContextValue {
  const ctx = useContext(MeetingContext)
  if (!ctx) throw new Error('useMeeting must be used inside MeetingProvider')
  return ctx
}
