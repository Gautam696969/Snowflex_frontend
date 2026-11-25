import { useEffect, useMemo, useRef, useState } from 'react'
import {
  Hand,
  Link2,
  Loader2,
  MessageSquare,
  Mic,
  MicOff,
  MonitorOff,
  MonitorUp,
  PhoneOff,
  Pin,
  PinOff,
  Send,
  ShieldAlert,
  Smile,
  UserMinus,
  Users,
  Video,
  VideoOff,
  VolumeX,
  WifiOff,
  X,
} from 'lucide-react'
import { toast } from 'react-hot-toast'
import {
  useMeeting,
  type UnifiedParticipantTile,
} from '../../context/MeetingContext'
import { useChat } from '../../context/ChatContext'
import { fetchMessages, type ChatMessageItem } from '../../lib/chat-api'
import UserAvatar from '../UserAvatar'

function formatTimer(secs: number): string {
  const h = Math.floor(secs / 3600)
  const m = Math.floor((secs % 3600) / 60)
  const s = secs % 60
  if (h > 0) {
    return `${h}:${String(m).padStart(2, '0')}:${String(s).padStart(2, '0')}`
  }
  return `${String(m).padStart(2, '0')}:${String(s).padStart(2, '0')}`
}

function ParticipantVideoTile({
  tile,
  isSpeaking,
  isPinned,
  isHandRaised,
  onTogglePin,
  compact = false,
}: {
  tile: UnifiedParticipantTile
  isSpeaking: boolean
  isPinned: boolean
  isHandRaised: boolean
  onTogglePin: () => void
  compact?: boolean
}) {
  const videoRef = useRef<HTMLVideoElement>(null)
  const audioRef = useRef<HTMLAudioElement>(null)

  useEffect(() => {
    if (videoRef.current) {
      videoRef.current.srcObject = tile.videoStream
    }
  }, [tile.videoStream])

  useEffect(() => {
    if (!tile.isLocal && audioRef.current) {
      audioRef.current.srcObject = tile.audioStream
    }
  }, [tile.isLocal, tile.audioStream])

  const hasVideo = Boolean(tile.videoStream && !tile.isCamOff)

  return (
    <div
      className={`relative rounded-xl overflow-hidden bg-[#121c16] border-2 transition-all flex items-center justify-center ${
        isSpeaking ? 'border-[#10b981] shadow-[0_0_20px_rgba(16,185,129,0.3)]' : 'border-[#223529]'
      } ${compact ? 'w-[160px] sm:w-[200px] aspect-video shrink-0' : 'w-full h-full min-h-[180px]'}`}
    >
      {!tile.isLocal && <audio ref={audioRef} autoPlay />}

      <video
        ref={videoRef}
        autoPlay
        playsInline
        muted={tile.isLocal}
        className={`w-full h-full object-cover ${tile.isLocal ? '-scale-x-100' : ''} ${hasVideo ? 'block' : 'hidden'}`}
      />

      {!hasVideo && (
        <div className="flex flex-col items-center justify-center gap-2 p-4 text-center">
          <UserAvatar name={tile.name || 'Participant'} size={compact ? 42 : 68} />
        </div>
      )}

      {/* Top badges: Hand Raised & Pin */}
      <div className="absolute top-2 inset-x-2 flex items-center justify-between pointer-events-none">
        <div>
          {isHandRaised && (
            <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-amber-400 text-black text-[10px] font-extrabold shadow">
              <Hand size={11} /> Hand
            </span>
          )}
        </div>
        <button
          type="button"
          onClick={onTogglePin}
          className="pointer-events-auto w-7 h-7 rounded-lg bg-black/60 hover:bg-black/80 text-white border-0 grid place-items-center cursor-pointer"
          title={isPinned ? 'Unpin participant' : 'Pin participant'}
        >
          {isPinned ? <PinOff size={13} className="text-emerald-400" /> : <Pin size={13} />}
        </button>
      </div>

      {/* Bottom name + mic pill */}
      <div className="absolute bottom-2 left-2 right-2 flex items-center justify-between pointer-events-none">
        <span className="px-2 py-0.5 rounded-md bg-black/70 backdrop-blur-sm text-white text-[11px] font-semibold truncate max-w-[80%]">
          {tile.name || 'Employee'} {tile.isLocal ? '(You)' : ''}
        </span>
        <span
          className={`w-6 h-6 rounded-full grid place-items-center ${
            tile.isMicMuted ? 'bg-red-500/85 text-white' : 'bg-black/65 text-emerald-400'
          }`}
        >
          {tile.isMicMuted ? <MicOff size={12} /> : <Mic size={12} />}
        </span>
      </div>
    </div>
  )
}

function ScreenShareStage({
  stream,
  presenterName,
  isLocal,
}: {
  stream: MediaStream
  presenterName: string
  isLocal: boolean
}) {
  const screenRef = useRef<HTMLVideoElement>(null)
  const [hasFrames, setHasFrames] = useState(false)

  useEffect(() => {
    const el = screenRef.current
    if (!el) return
    setHasFrames(false)
    const videoTracks = stream.getVideoTracks()
    el.srcObject = videoTracks.length > 0 ? new MediaStream(videoTracks) : stream
    void el.play().catch(() => {})
  }, [stream])

  return (
    <div className="relative flex-1 min-h-0 rounded-2xl overflow-hidden bg-black border border-[#2a4233] flex items-center justify-center">
      <video
        ref={screenRef}
        autoPlay
        playsInline
        muted
        onLoadedData={() => setHasFrames(true)}
        onPlaying={() => setHasFrames(true)}
        className="w-full h-full object-contain"
      />
      {!hasFrames && !isLocal && (
        <div className="absolute inset-0 flex flex-col items-center justify-center gap-2 text-gray-300 text-xs pointer-events-none">
          <Loader2 size={24} className="animate-spin text-emerald-400" />
          <span>Connecting {presenterName}&apos;s screen stream...</span>
        </div>
      )}
      <div className="absolute top-3 left-3 px-3 py-1 rounded-full bg-emerald-500 text-black text-xs font-extrabold shadow flex items-center gap-1.5">
        <MonitorUp size={14} />
        <span>{presenterName} is presenting</span>
      </div>
    </div>
  )
}

export default function MeetingRoomOverlay() {
  const {
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
    dismissInvite,
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
  } = useMeeting()

  const { socket, sendMessage } = useChat()

  // Pre-Join state
  const [preMic, setPreMic] = useState(true)
  const [preCam, setPreCam] = useState(true)
  const [audioDevices, setAudioDevices] = useState<MediaDeviceInfo[]>([])
  const [videoDevices, setVideoDevices] = useState<MediaDeviceInfo[]>([])
  const [selectedAudioId, setSelectedAudioId] = useState('')
  const [selectedVideoId, setSelectedVideoId] = useState('')
  const [previewError, setPreviewError] = useState('')
  const previewVideoRef = useRef<HTMLVideoElement>(null)
  const previewStreamRef = useRef<MediaStream | null>(null)

  // In-Meeting sidebars & reactions
  const [sidePanel, setSidePanel] = useState<'none' | 'participants' | 'chat'>('none')
  const [showEmojiPicker, setShowEmojiPicker] = useState(false)
  const [chatMessages, setChatMessages] = useState<ChatMessageItem[]>([])
  const [chatInput, setChatInput] = useState('')

  // Pre-Join camera/mic preview & device enumeration
  useEffect(() => {
    if (stage !== 'prejoin') {
      if (previewStreamRef.current) {
        previewStreamRef.current.getTracks().forEach((t) => t.stop())
        previewStreamRef.current = null
      }
      return
    }

    let cancelled = false
    setPreviewError('')

    const startPreview = async () => {
      try {
        if (previewStreamRef.current) {
          previewStreamRef.current.getTracks().forEach((t) => t.stop())
        }
        const stream = await navigator.mediaDevices.getUserMedia({
          video: selectedVideoId ? { deviceId: { exact: selectedVideoId } } : true,
          audio: selectedAudioId ? { deviceId: { exact: selectedAudioId } } : true,
        })
        if (cancelled) {
          stream.getTracks().forEach((t) => t.stop())
          return
        }
        stream.getAudioTracks().forEach((t) => {
          t.enabled = preMic
        })
        stream.getVideoTracks().forEach((t) => {
          t.enabled = preCam
        })
        previewStreamRef.current = stream
        if (previewVideoRef.current) {
          previewVideoRef.current.srcObject = stream
        }

        const devices = await navigator.mediaDevices.enumerateDevices()
        if (!cancelled) {
          setAudioDevices(devices.filter((d) => d.kind === 'audioinput'))
          setVideoDevices(devices.filter((d) => d.kind === 'videoinput'))
        }
      } catch (err) {
        if (!cancelled) {
          setPreviewError(
            err instanceof Error ? err.message : 'Camera/mic permission denied. You can still join muted.'
          )
        }
      }
    }

    void startPreview()
    return () => {
      cancelled = true
      if (previewStreamRef.current) {
        previewStreamRef.current.getTracks().forEach((t) => t.stop())
        previewStreamRef.current = null
      }
    }
  }, [stage, selectedAudioId, selectedVideoId])

  useEffect(() => {
    if (previewStreamRef.current) {
      previewStreamRef.current.getAudioTracks().forEach((t) => {
        t.enabled = preMic
      })
      previewStreamRef.current.getVideoTracks().forEach((t) => {
        t.enabled = preCam
      })
    }
  }, [preMic, preCam])

  // Load & subscribe to in-meeting chat thread when chat panel opens
  useEffect(() => {
    const chatId = activeMeeting?.chatId
    if (stage !== 'in-meeting' || sidePanel !== 'chat' || !chatId) return

    fetchMessages(chatId, undefined, 30)
      .then((res) => setChatMessages(res.messages))
      .catch(() => {})

    if (!socket) return
    const onNewMsg = (msg: ChatMessageItem) => {
      if (msg.conversationId === chatId) {
        setChatMessages((prev) => (prev.some((m) => m.id === msg.id) ? prev : [...prev, msg]))
      }
    }
    socket.on('message:new', onNewMsg)
    return () => {
      socket.off('message:new', onNewMsg)
    }
  }, [stage, sidePanel, activeMeeting?.chatId, socket])

  const activeScreenShare = useMemo(() => {
    for (const tile of participantTiles) {
      if (tile.isScreenSharing && tile.screenStream) {
        return {
          stream: tile.screenStream,
          tile,
        }
      }
    }
    return null
  }, [participantTiles])

  // 1. Real-time Meeting Started / Reminder Popup (when idle on any page)
  if (stage === 'idle' && incomingInvite) {
    return (
      <div className="fixed bottom-4 right-4 z-[1280] w-[340px] max-w-[calc(100vw-24px)] rounded-2xl bg-[#131f18] border border-[#2d4a38] shadow-2xl p-4 text-white animate-fade-in">
        <div className="flex items-start justify-between gap-2 mb-2">
          <div className="flex items-center gap-2">
            <span className="w-8 h-8 rounded-lg bg-emerald-500/20 text-emerald-400 grid place-items-center">
              <Video size={17} />
            </span>
            <div>
              <span className="text-[10px] font-mono font-bold uppercase tracking-wider text-emerald-400">
                Meeting Live
              </span>
              <h4 className="m-0 text-sm font-bold text-white leading-tight">{incomingInvite.title}</h4>
            </div>
          </div>
          <button
            type="button"
            onClick={dismissInvite}
            className="bg-transparent border-0 text-gray-400 hover:text-white cursor-pointer"
          >
            <X size={16} />
          </button>
        </div>
        <p className="m-0 text-xs text-gray-300 mb-3">
          Hosted by <strong>{incomingInvite.hostName}</strong>
        </p>
        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={dismissInvite}
            className="flex-1 py-2 rounded-lg bg-white/10 hover:bg-white/20 text-white text-xs font-semibold border-0 cursor-pointer"
          >
            Dismiss
          </button>
          <button
            type="button"
            onClick={() => void openPreJoin(incomingInvite.meetingCode)}
            className="flex-1 py-2 rounded-lg bg-[#10b981] hover:bg-[#34d399] text-[#08150e] text-xs font-extrabold border-0 cursor-pointer"
          >
            Join Meeting
          </button>
        </div>
      </div>
    )
  }

  if (stage === 'idle' || !activeMeeting) return null

  // 2. Pre-Join Screen
  if (stage === 'prejoin' || stage === 'connecting') {
    const handleEnter = () => {
      if (previewStreamRef.current) {
        previewStreamRef.current.getTracks().forEach((t) => t.stop())
        previewStreamRef.current = null
      }
      void enterMeeting({
        micEnabled: preMic,
        camEnabled: preCam,
        audioDeviceId: selectedAudioId || undefined,
        videoDeviceId: selectedVideoId || undefined,
      })
    }

    return (
      <div
        className="fixed inset-0 z-[1300] bg-[#0a100c]/95 backdrop-blur-md flex items-center justify-center p-4"
        role="dialog"
        aria-modal="true"
        aria-label="Meeting pre-join screen"
      >
        <div className="w-full max-w-[780px] rounded-2xl bg-[#131d17] border border-[#283f31] shadow-2xl overflow-hidden grid grid-cols-1 md:grid-cols-[1.2fr_1fr]">
          {/* Preview Box */}
          <div className="relative bg-black aspect-video md:aspect-auto min-h-[260px] flex items-center justify-center overflow-hidden">
            <video
              ref={previewVideoRef}
              autoPlay
              playsInline
              muted
              className={`w-full h-full object-cover -scale-x-100 ${preCam && !previewError ? 'block' : 'hidden'}`}
            />
            {(!preCam || previewError) && (
              <div className="flex flex-col items-center gap-2 text-center p-4 text-gray-300">
                <VideoOff size={34} className="text-gray-500" />
                <span className="text-xs">{previewError || 'Camera is turned off'}</span>
              </div>
            )}

            <div className="absolute bottom-3 inset-x-0 flex items-center justify-center gap-3">
              <button
                type="button"
                onClick={() => setPreMic((v) => !v)}
                className={`w-11 h-11 rounded-full grid place-items-center border-0 cursor-pointer ${
                  preMic ? 'bg-white/20 text-white' : 'bg-red-500 text-white'
                }`}
                title={preMic ? 'Mute mic' : 'Unmute mic'}
              >
                {preMic ? <Mic size={19} /> : <MicOff size={19} />}
              </button>
              <button
                type="button"
                onClick={() => setPreCam((v) => !v)}
                className={`w-11 h-11 rounded-full grid place-items-center border-0 cursor-pointer ${
                  preCam ? 'bg-white/20 text-white' : 'bg-red-500 text-white'
                }`}
                title={preCam ? 'Turn camera off' : 'Turn camera on'}
              >
                {preCam ? <Video size={19} /> : <VideoOff size={19} />}
              </button>
            </div>
          </div>

          {/* Meeting Info & Device Selection */}
          <div className="p-5 sm:p-6 flex flex-col justify-between gap-4 text-white">
            <div>
              <div className="flex items-center justify-between gap-2 mb-2">
                <span className="text-[10px] font-mono font-bold uppercase tracking-widest text-emerald-400">
                  READY TO JOIN
                </span>
                <button
                  type="button"
                  onClick={closePreJoin}
                  className="bg-transparent border-0 text-gray-400 hover:text-white cursor-pointer"
                >
                  <X size={18} />
                </button>
              </div>
              <h3 className="text-lg font-extrabold m-0 mb-1">{activeMeeting.title}</h3>
              <p className="text-xs text-gray-400 m-0 mb-4">
                Host: {activeMeeting.hostName} • {activeMeeting.activeParticipantCount} in call
              </p>

              <div className="flex flex-col gap-3">
                <div>
                  <label className="text-[11px] font-semibold text-gray-400 block mb-1">Microphone</label>
                  <select
                    value={selectedAudioId}
                    onChange={(e) => setSelectedAudioId(e.target.value)}
                    className="w-full px-2.5 py-1.5 rounded-lg text-xs bg-[#0d1410] border border-[#283c30] text-white"
                  >
                    <option value="">Default Microphone</option>
                    {audioDevices.map((d) => (
                      <option key={d.deviceId} value={d.deviceId}>
                        {d.label || `Microphone ${d.deviceId.slice(0, 6)}`}
                      </option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="text-[11px] font-semibold text-gray-400 block mb-1">Camera</label>
                  <select
                    value={selectedVideoId}
                    onChange={(e) => setSelectedVideoId(e.target.value)}
                    className="w-full px-2.5 py-1.5 rounded-lg text-xs bg-[#0d1410] border border-[#283c30] text-white"
                  >
                    <option value="">Default Camera</option>
                    {videoDevices.map((d) => (
                      <option key={d.deviceId} value={d.deviceId}>
                        {d.label || `Camera ${d.deviceId.slice(0, 6)}`}
                      </option>
                    ))}
                  </select>
                </div>
              </div>
            </div>

            <button
              type="button"
              onClick={handleEnter}
              disabled={stage === 'connecting'}
              className="w-full py-2.5 rounded-xl bg-[#10b981] hover:bg-[#34d399] text-[#08150e] font-extrabold text-sm border-0 cursor-pointer flex items-center justify-center gap-2 disabled:opacity-60"
            >
              {stage === 'connecting' ? (
                <>
                  <Loader2 size={16} className="animate-spin" />
                  <span>Connecting...</span>
                </>
              ) : (
                <>
                  <Video size={16} />
                  <span>Join Meeting Now</span>
                </>
              )}
            </button>
          </div>
        </div>
      </div>
    )
  }

  // 3. Active Meeting Room (Grid + Screen Share + Side Panels + Host Controls)
  const isMyHandRaised = myUserId ? raisedHands.has(myUserId) : false
  const isHost = myRole === 'HOST'
  const canShareScreen = isHost || allowScreenShare

  const pinnedTile = pinnedIdentity
    ? participantTiles.find((t) => t.identity === pinnedIdentity) || null
    : null

  const copyJoinLink = () => {
    const fullUrl = `${window.location.origin}/meeting/${activeMeeting.meetingCode}`
    void navigator.clipboard.writeText(fullUrl).then(() => {
      toast.success('Meeting join link copied!')
    })
  }

  const handleSendInMeetingChat = async (e: React.FormEvent) => {
    e.preventDefault()
    const body = chatInput.trim()
    if (!body || !activeMeeting.chatId) return
    const recipientId =
      activeMeeting.invitedUserIds.find((id) => id !== myUserId) || activeMeeting.hostId
    setChatInput('')
    try {
      await sendMessage(activeMeeting.chatId, recipientId, body)
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Failed to send message')
    }
  }

  return (
    <div
      className="fixed inset-0 z-[1300] bg-[#090f0b] text-white flex flex-col overflow-hidden"
      role="dialog"
      aria-modal="true"
      aria-label={`Meeting: ${activeMeeting.title}`}
    >
      {/* Top Meeting Header */}
      <header className="flex items-center justify-between gap-3 px-4 py-2.5 bg-[#0f1812] border-b border-[#1f3126] shrink-0">
        <div className="flex items-center gap-3 min-w-0">
          <div className="w-8 h-8 rounded-lg bg-emerald-500/20 text-emerald-400 grid place-items-center shrink-0">
            <Video size={16} />
          </div>
          <div className="min-w-0">
            <div className="flex items-center gap-2">
              <strong className="text-sm font-bold truncate">{activeMeeting.title}</strong>
              {isHost && (
                <span className="px-1.5 py-0.5 rounded bg-emerald-500/20 text-emerald-300 text-[9.5px] font-bold uppercase">
                  Host
                </span>
              )}
            </div>
            <div className="flex items-center gap-2 text-[11px] font-mono text-emerald-300">
              <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse" />
              <span>{formatTimer(durationSeconds)}</span>
              <span className="text-gray-500">•</span>
              <span className="text-gray-300">{participantTiles.length} in call</span>
            </div>
          </div>
        </div>

        <div className="flex items-center gap-2 shrink-0">
          {stage === 'reconnecting' && (
            <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full bg-amber-500/20 border border-amber-400/40 text-amber-300 text-xs font-semibold">
              <WifiOff size={13} /> Reconnecting...
            </span>
          )}

          <button
            type="button"
            onClick={copyJoinLink}
            className="hidden sm:inline-flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg bg-white/10 hover:bg-white/15 text-xs font-semibold border-0 text-white cursor-pointer"
            title="Copy shareable join link"
          >
            <Link2 size={14} />
            <span>Copy Link</span>
          </button>

          <button
            type="button"
            onClick={() => setSidePanel((p) => (p === 'participants' ? 'none' : 'participants'))}
            className={`inline-flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg text-xs font-semibold border-0 cursor-pointer ${
              sidePanel === 'participants' ? 'bg-emerald-500 text-black' : 'bg-white/10 text-white'
            }`}
          >
            <Users size={15} />
            <span className="hidden sm:inline">People ({participantTiles.length})</span>
          </button>

          {activeMeeting.chatId && (
            <button
              type="button"
              onClick={() => setSidePanel((p) => (p === 'chat' ? 'none' : 'chat'))}
              className={`inline-flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg text-xs font-semibold border-0 cursor-pointer ${
                sidePanel === 'chat' ? 'bg-emerald-500 text-black' : 'bg-white/10 text-white'
              }`}
            >
              <MessageSquare size={15} />
              <span className="hidden sm:inline">Chat</span>
            </button>
          )}
        </div>
      </header>

      {/* Main Content Area: Video Stage + Optional Side Panel */}
      <div className="flex-1 min-h-0 flex relative overflow-hidden">
        {/* Video Stage */}
        <div className="relative flex-1 min-w-0 p-3 flex flex-col gap-3 overflow-hidden">
          {/* Floating Emoji Reactions */}
          {reactions.length > 0 && (
            <div className="absolute bottom-4 left-4 z-30 flex flex-col gap-1 pointer-events-none">
              {reactions.map((r) => (
                <div
                  key={r.id}
                  className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-black/75 border border-white/15 text-xs animate-bounce"
                >
                  <span className="text-base">{r.emoji}</span>
                  <span className="text-gray-200 font-medium">{r.fullName}</span>
                </div>
              ))}
            </div>
          )}

          {/* Presenter / Screen Share View OR Pinned View OR Multi-Participant Grid */}
          {activeScreenShare ? (
            <div className="flex-1 min-h-0 flex flex-col lg:flex-row gap-3">
              <ScreenShareStage
                stream={activeScreenShare.stream}
                presenterName={presenterInfo?.fullName || activeScreenShare.tile.name || 'Participant'}
                isLocal={activeScreenShare.tile.isLocal}
              />
              <div className="flex lg:flex-col gap-2 overflow-x-auto lg:overflow-y-auto shrink-0 pb-1 lg:pb-0">
                {participantTiles.map((tile) => (
                  <ParticipantVideoTile
                    key={tile.identity}
                    tile={tile}
                    isSpeaking={activeSpeakerIds.has(tile.identity)}
                    isPinned={pinnedIdentity === tile.identity}
                    isHandRaised={Boolean(tile.userId && raisedHands.has(tile.userId))}
                    onTogglePin={() =>
                      setPinnedIdentity(pinnedIdentity === tile.identity ? null : tile.identity)
                    }
                    compact
                  />
                ))}
              </div>
            </div>
          ) : pinnedTile ? (
            <div className="flex-1 min-h-0 flex flex-col lg:flex-row gap-3">
              <div className="flex-1 min-h-0">
                <ParticipantVideoTile
                  tile={pinnedTile}
                  isSpeaking={activeSpeakerIds.has(pinnedTile.identity)}
                  isPinned
                  isHandRaised={Boolean(pinnedTile.userId && raisedHands.has(pinnedTile.userId))}
                  onTogglePin={() => setPinnedIdentity(null)}
                />
              </div>
              {participantTiles.length > 1 && (
                <div className="flex lg:flex-col gap-2 overflow-x-auto lg:overflow-y-auto shrink-0">
                  {participantTiles
                    .filter((t) => t.identity !== pinnedTile.identity)
                    .map((tile) => (
                      <ParticipantVideoTile
                        key={tile.identity}
                        tile={tile}
                        isSpeaking={activeSpeakerIds.has(tile.identity)}
                        isPinned={false}
                        isHandRaised={Boolean(tile.userId && raisedHands.has(tile.userId))}
                        onTogglePin={() => setPinnedIdentity(tile.identity)}
                        compact
                      />
                    ))}
                </div>
              )}
            </div>
          ) : (
            <div
              className={`flex-1 min-h-0 grid gap-3 ${
                participantTiles.length <= 1
                  ? 'grid-cols-1'
                  : participantTiles.length === 2
                    ? 'grid-cols-1 sm:grid-cols-2'
                    : participantTiles.length <= 4
                      ? 'grid-cols-1 sm:grid-cols-2'
                      : 'grid-cols-2 lg:grid-cols-3'
              }`}
            >
              {participantTiles.map((tile) => (
                <ParticipantVideoTile
                  key={tile.identity}
                  tile={tile}
                  isSpeaking={activeSpeakerIds.has(tile.identity)}
                  isPinned={false}
                  isHandRaised={Boolean(tile.userId && raisedHands.has(tile.userId))}
                  onTogglePin={() => setPinnedIdentity(tile.identity)}
                />
              ))}
            </div>
          )}
        </div>

        {/* Collapsible Side Panel: Participants OR In-Meeting Chat */}
        {sidePanel !== 'none' && (
          <aside className="absolute inset-y-0 right-0 sm:static w-full sm:w-[320px] bg-[#111b15] border-l border-[#223529] z-30 flex flex-col">
            <div className="flex items-center justify-between px-4 py-3 border-b border-[#223529]">
              <strong className="text-sm font-bold">
                {sidePanel === 'participants' ? `Participants (${participantTiles.length})` : 'In-Meeting Chat'}
              </strong>
              <button
                type="button"
                onClick={() => setSidePanel('none')}
                className="bg-transparent border-0 text-gray-400 hover:text-white cursor-pointer"
              >
                <X size={17} />
              </button>
            </div>

            {sidePanel === 'participants' ? (
              <div className="flex-1 overflow-y-auto p-3 flex flex-col gap-2">
                {isHost && (
                  <div className="p-2.5 rounded-xl bg-[#16241b] border border-[#284031] mb-1 flex items-center justify-between text-xs">
                    <span className="font-semibold text-gray-200">Allow participant screen share</span>
                    <input
                      type="checkbox"
                      checked={allowScreenShare}
                      onChange={(e) => hostToggleScreenSharePolicy(e.target.checked)}
                      className="accent-[#10b981] cursor-pointer"
                    />
                  </div>
                )}

                {participantTiles.map((tile) => {
                  const hand = Boolean(tile.userId && raisedHands.has(tile.userId))
                  return (
                    <div
                      key={tile.identity}
                      className="flex items-center justify-between gap-2 p-2 rounded-xl bg-[#16231b] border border-[#223529]"
                    >
                      <div className="flex items-center gap-2 min-w-0">
                        <UserAvatar name={tile.name || 'Employee'} size={30} />
                        <div className="min-w-0">
                          <div className="text-xs font-bold truncate">
                            {tile.name || 'Employee'} {tile.isLocal ? '(You)' : ''}
                          </div>
                          {hand && (
                            <span className="text-[10px] text-amber-300 font-semibold">✋ Hand raised</span>
                          )}
                        </div>
                      </div>

                      <div className="flex items-center gap-1.5 shrink-0">
                        <span className={tile.isMicMuted ? 'text-red-400' : 'text-emerald-400'}>
                          {tile.isMicMuted ? <MicOff size={14} /> : <Mic size={14} />}
                        </span>
                        <span className={tile.isCamOff ? 'text-red-400' : 'text-emerald-400'}>
                          {tile.isCamOff ? <VideoOff size={14} /> : <Video size={14} />}
                        </span>

                        {isHost && !tile.isLocal && tile.userId && (
                          <>
                            <button
                              type="button"
                              onClick={() => hostMuteParticipant(tile.userId!)}
                              className="w-6 h-6 rounded bg-white/10 hover:bg-white/20 text-amber-300 border-0 grid place-items-center cursor-pointer"
                              title="Mute participant"
                            >
                              <VolumeX size={12} />
                            </button>
                            <button
                              type="button"
                              onClick={() => hostRemoveParticipant(tile.userId!)}
                              className="w-6 h-6 rounded bg-red-500/20 hover:bg-red-500/40 text-red-300 border-0 grid place-items-center cursor-pointer"
                              title="Remove participant"
                            >
                              <UserMinus size={12} />
                            </button>
                          </>
                        )}
                      </div>
                    </div>
                  )
                })}
              </div>
            ) : (
              <>
                <div className="flex-1 overflow-y-auto p-3 flex flex-col gap-2">
                  {chatMessages.map((m) => (
                    <div
                      key={m.id}
                      className={`p-2 rounded-xl text-xs max-w-[88%] ${
                        m.senderId === myUserId
                          ? 'self-end bg-[#193c33] text-white'
                          : 'self-start bg-[#1b2921] text-gray-200'
                      }`}
                    >
                      <div className="whitespace-pre-wrap break-words">{m.body}</div>
                    </div>
                  ))}
                </div>
                <form
                  onSubmit={handleSendInMeetingChat}
                  className="p-3 border-t border-[#223529] flex items-center gap-2"
                >
                  <input
                    type="text"
                    value={chatInput}
                    onChange={(e) => setChatInput(e.target.value)}
                    placeholder="Message everyone in chat..."
                    className="flex-1 px-3 py-2 rounded-lg bg-[#0b120e] border border-[#253a2d] text-xs text-white focus:outline-none focus:border-emerald-500"
                  />
                  <button
                    type="submit"
                    className="w-8 h-8 rounded-lg bg-emerald-500 text-black border-0 grid place-items-center cursor-pointer"
                  >
                    <Send size={14} />
                  </button>
                </form>
              </>
            )}
          </aside>
        )}
      </div>

      {/* Bottom Controls Bar */}
      <footer className="relative z-20 flex items-center justify-center gap-2.5 sm:gap-4 px-3 py-3.5 bg-[#0f1812] border-t border-[#1f3126] shrink-0 flex-wrap">
        <button
          type="button"
          onClick={() => void toggleMic()}
          className={`w-11 h-11 rounded-full grid place-items-center border-0 cursor-pointer ${
            isMicMuted ? 'bg-red-500 text-white' : 'bg-white/15 hover:bg-white/25 text-white'
          }`}
          title={isMicMuted ? 'Unmute mic' : 'Mute mic'}
        >
          {isMicMuted ? <MicOff size={19} /> : <Mic size={19} />}
        </button>

        <button
          type="button"
          onClick={() => void toggleCamera()}
          className={`w-11 h-11 rounded-full grid place-items-center border-0 cursor-pointer ${
            isCamOff ? 'bg-red-500 text-white' : 'bg-white/15 hover:bg-white/25 text-white'
          }`}
          title={isCamOff ? 'Turn camera on' : 'Turn camera off'}
        >
          {isCamOff ? <VideoOff size={19} /> : <Video size={19} />}
        </button>

        <button
          type="button"
          onClick={() => void toggleScreenShare()}
          disabled={!canShareScreen && !isScreenSharing}
          className={`w-11 h-11 rounded-full grid place-items-center border-0 cursor-pointer disabled:opacity-40 disabled:cursor-not-allowed ${
            isScreenSharing ? 'bg-emerald-500 text-black' : 'bg-white/15 hover:bg-white/25 text-white'
          }`}
          title={
            !canShareScreen
              ? 'Host disabled screen sharing'
              : isScreenSharing
                ? 'Stop presenting'
                : 'Share screen'
          }
        >
          {isScreenSharing ? <MonitorOff size={19} /> : <MonitorUp size={19} />}
        </button>

        <button
          type="button"
          onClick={toggleHandRaise}
          className={`w-11 h-11 rounded-full grid place-items-center border-0 cursor-pointer ${
            isMyHandRaised ? 'bg-amber-400 text-black' : 'bg-white/15 hover:bg-white/25 text-white'
          }`}
          title={isMyHandRaised ? 'Lower hand' : 'Raise hand'}
        >
          <Hand size={19} />
        </button>

        <div className="relative">
          <button
            type="button"
            onClick={() => setShowEmojiPicker((v) => !v)}
            className="w-11 h-11 rounded-full grid place-items-center border-0 cursor-pointer bg-white/15 hover:bg-white/25 text-white"
            title="Send reaction"
          >
            <Smile size={19} />
          </button>
          {showEmojiPicker && (
            <div className="absolute bottom-14 left-1/2 -translate-x-1/2 flex items-center gap-1 p-1.5 rounded-full bg-[#19281f] border border-[#2f4939] shadow-xl">
              {['👍', '👏', '❤️', '🎉', '😂'].map((emoji) => (
                <button
                  key={emoji}
                  type="button"
                  onClick={() => {
                    sendReaction(emoji)
                    setShowEmojiPicker(false)
                  }}
                  className="w-8 h-8 rounded-full hover:bg-white/15 border-0 bg-transparent text-lg cursor-pointer"
                >
                  {emoji}
                </button>
              ))}
            </div>
          )}
        </div>

        <button
          type="button"
          onClick={() => void leaveMeeting()}
          className="px-4 h-11 rounded-full bg-[#dc2626] hover:bg-[#ef4444] text-white font-bold text-xs border-0 cursor-pointer inline-flex items-center gap-1.5"
          title="Leave meeting"
        >
          <PhoneOff size={17} />
          <span>Leave</span>
        </button>

        {isHost && (
          <button
            type="button"
            onClick={() => void endMeetingForAll()}
            className="px-3.5 h-11 rounded-full bg-red-950 hover:bg-red-900 border border-red-600/50 text-red-200 font-bold text-xs cursor-pointer inline-flex items-center gap-1.5"
            title="End meeting for all participants"
          >
            <ShieldAlert size={15} />
            <span className="hidden sm:inline">End for All</span>
          </button>
        )}
      </footer>
    </div>
  )
}
