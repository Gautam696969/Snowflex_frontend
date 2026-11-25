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
  type LocalParticipant,
  type RemoteParticipant,
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

export type MeetingUiStage = 'idle' | 'prejoin' | 'connecting' | 'in-meeting' | 'reconnecting'

export interface FloatingReaction {
  id: string
  userId: number
  fullName: string
  emoji: string
}

interface PreJoinOptions {
  micEnabled: boolean
  camEnabled: boolean
  audioDeviceId?: string
  videoDeviceId?: string
}

interface MeetingContextValue {
  stage: MeetingUiStage
  activeMeeting: MeetingRecord | null
  myRole: MeetingParticipantRole
  room: Room | null
  participantsVersion: number
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

export function MeetingProvider({ children }: { children: ReactNode }) {
  const { socket } = useChat()

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

  const roomRef = useRef<Room | null>(null)
  const activeMeetingRef = useRef<MeetingRecord | null>(null)
  const timerRef = useRef<ReturnType<typeof setInterval> | null>(null)
  const stageRef = useRef<MeetingUiStage>('idle')

  activeMeetingRef.current = activeMeeting
  stageRef.current = stage

  const bumpParticipants = useCallback(() => {
    setParticipantsVersion((v) => v + 1)
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
        // ignore disconnect errors
      }
      roomRef.current = null
    }

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
  }, [socket])

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

        if (!joinRes.livekitUrl || !joinRes.token) {
          toast.error('LiveKit SFU is not configured on the server (LIVEKIT_URL / API keys missing).')
          await leaveMeetingApi(target.meetingCode).catch(() => {})
          setStage('prejoin')
          return
        }

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
              if (socket) {
                socket.emit('meeting:screen-share-stop', { meetingCode: target.meetingCode })
              }
            }
            bumpParticipants()
          })
          .on(RoomEvent.ActiveSpeakersChanged, (speakers: Participant[]) => {
            setActiveSpeakerIds(new Set(speakers.map((s) => s.identity)))
          })
          .on(RoomEvent.Reconnecting, () => {
            setStage('reconnecting')
          })
          .on(RoomEvent.Reconnected, () => {
            setStage('in-meeting')
          })
          .on(RoomEvent.Disconnected, () => {
            if (roomRef.current === lkRoom) {
              void cleanupRoom()
            }
          })

        await lkRoom.connect(joinRes.livekitUrl, joinRes.token)

        // Enable camera / mic according to pre-join selection
        try {
          await lkRoom.localParticipant.setMicrophoneEnabled(options.micEnabled)
          setIsMicMuted(!options.micEnabled)
        } catch {
          setIsMicMuted(true)
          toast.error('Microphone permission denied or unavailable.')
        }

        try {
          await lkRoom.localParticipant.setCameraEnabled(options.camEnabled)
          setIsCamOff(!options.camEnabled)
        } catch {
          setIsCamOff(true)
          toast.error('Camera permission denied or unavailable.')
        }

        roomRef.current = lkRoom
        setRoom(lkRoom)
        setStage('in-meeting')
        bumpParticipants()

        // Sync Socket.io room state (presenter, raised hands, host controls)
        if (socket) {
          socket.emit(
            'meeting:join-room',
            { meetingCode: target.meetingCode },
            (res: {
              success: boolean
              presenter?: { userId: number; fullName: string } | null
              allowScreenShare?: boolean
              raisedHands?: number[]
            }) => {
              if (res?.success) {
                setPresenterInfo(res.presenter || null)
                if (typeof res.allowScreenShare === 'boolean') {
                  setAllowScreenShare(res.allowScreenShare)
                }
                if (Array.isArray(res.raisedHands)) {
                  setRaisedHands(new Set(res.raisedHands))
                }
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
    [socket, bumpParticipants, cleanupRoom]
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
    const lp: LocalParticipant | undefined = roomRef.current?.localParticipant
    if (!lp) return
    const nextEnabled = isMicMuted
    try {
      await lp.setMicrophoneEnabled(nextEnabled)
      setIsMicMuted(!nextEnabled)
      bumpParticipants()
    } catch {
      toast.error('Unable to toggle microphone')
    }
  }, [isMicMuted, bumpParticipants])

  const toggleCamera = useCallback(async () => {
    const lp: LocalParticipant | undefined = roomRef.current?.localParticipant
    if (!lp) return
    const nextEnabled = isCamOff
    try {
      await lp.setCameraEnabled(nextEnabled)
      setIsCamOff(!nextEnabled)
      bumpParticipants()
    } catch {
      toast.error('Unable to toggle camera')
    }
  }, [isCamOff, bumpParticipants])

  const toggleScreenShare = useCallback(async () => {
    const lp: LocalParticipant | undefined = roomRef.current?.localParticipant
    const code = activeMeetingRef.current?.meetingCode
    if (!lp || !code) return

    if (isScreenSharing) {
      await lp.setScreenShareEnabled(false).catch(() => {})
      setIsScreenSharing(false)
      socket?.emit('meeting:screen-share-stop', { meetingCode: code })
      bumpParticipants()
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

    try {
      const pub = await lp.setScreenShareEnabled(true, { audio: true })
      if (!pub) {
        socket?.emit('meeting:screen-share-stop', { meetingCode: code })
        return
      }
      setIsScreenSharing(true)
      // Handle browser's native "Stop sharing" button
      pub.track?.mediaStreamTrack?.addEventListener('ended', () => {
        setIsScreenSharing(false)
        void lp.setScreenShareEnabled(false).catch(() => {})
        socket?.emit('meeting:screen-share-stop', { meetingCode: code })
        bumpParticipants()
      })
      bumpParticipants()
    } catch {
      socket?.emit('meeting:screen-share-stop', { meetingCode: code })
      // User cancelled browser screen picker
    }
  }, [isScreenSharing, socket, bumpParticipants])

  const toggleHandRaise = useCallback(() => {
    const code = activeMeetingRef.current?.meetingCode
    const lp = roomRef.current?.localParticipant
    if (!socket || !code || !lp) return
    const myUid = parseLiveKitUserId(lp.identity)
    if (!myUid) return
    const currentlyRaised = raisedHands.has(myUid)
    socket.emit('meeting:hand-raise', { meetingCode: code, raised: !currentlyRaised })
  }, [socket, raisedHands])

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

  // Global Socket.io listeners for Meeting lifecycle (invites, reminders, host controls)
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
      const lp = roomRef.current?.localParticipant
      if (lp && parseLiveKitUserId(lp.identity) === newHostId) {
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
      const lp = roomRef.current?.localParticipant
      if (lp) {
        void lp.setMicrophoneEnabled(false).catch(() => {})
        setIsMicMuted(true)
        bumpParticipants()
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
        void roomRef.current?.localParticipant.setScreenShareEnabled(false).catch(() => {})
        setIsScreenSharing(false)
        toast('Host disabled screen sharing for participants.')
      }
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
    }
  }, [socket, cleanupRoom, bumpParticipants, myRole, isScreenSharing])

  useEffect(() => {
    return () => {
      void cleanupRoom()
    }
  }, [cleanupRoom])

  const value = useMemo<MeetingContextValue>(
    () => ({
      stage,
      activeMeeting,
      myRole,
      room,
      participantsVersion,
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
      room,
      participantsVersion,
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

export function getAllRoomParticipants(room: Room | null): Participant[] {
  if (!room) return []
  return [room.localParticipant, ...Array.from(room.remoteParticipants.values())] as (
    | LocalParticipant
    | RemoteParticipant
  )[]
}

