import { useEffect, useRef } from 'react'
import {
  Mic,
  MicOff,
  Video,
  VideoOff,
  PhoneOff,
  Phone,
  MonitorUp,
  MonitorOff,
  WifiOff,
} from 'lucide-react'
import { useVideoCall } from '../../context/VideoCallContext'
import UserAvatar from '../UserAvatar'
import RoleBadge from './RoleBadge'

function formatCallTimer(totalSeconds: number): string {
  const mins = Math.floor(totalSeconds / 60)
  const secs = totalSeconds % 60
  return `${String(mins).padStart(2, '0')}:${String(secs).padStart(2, '0')}`
}

export default function VideoCallOverlay() {
  const {
    callState,
    remoteUser,
    localStream,
    remoteStream,
    isMuted,
    isCameraOff,
    isScreenSharing,
    callDurationSeconds,
    acceptCall,
    rejectCall,
    endCall,
    toggleMute,
    toggleCamera,
    toggleScreenShare,
  } = useVideoCall()

  const localVideoRef = useRef<HTMLVideoElement>(null)
  const remoteVideoRef = useRef<HTMLVideoElement>(null)

  useEffect(() => {
    if (localVideoRef.current) {
      localVideoRef.current.srcObject = localStream
    }
  }, [localStream, callState])

  useEffect(() => {
    if (remoteVideoRef.current) {
      remoteVideoRef.current.srcObject = remoteStream
    }
  }, [remoteStream, callState])

  if (callState === 'idle' || !remoteUser) {
    return null
  }

  // 1. Incoming Call Modal (works on any page of the app)
  if (callState === 'ringing') {
    return (
      <div
        className="fixed inset-0 z-[1300] bg-black/70 backdrop-blur-sm flex items-center justify-center p-4 animate-fade-in"
        role="dialog"
        aria-modal="true"
        aria-label="Incoming video call"
      >
        <div className="w-full max-w-[360px] rounded-2xl bg-[#131e18] border border-[#2b4234] shadow-[0_24px_60px_rgba(0,0,0,0.65)] p-6 flex flex-col items-center text-center text-white">
          <div className="relative mb-4">
            <div className="absolute -inset-2 rounded-full bg-emerald-500/25 animate-ping" />
            <div className="relative rounded-full ring-2 ring-emerald-400/70 p-1 bg-[#131e18]">
              <UserAvatar name={remoteUser.fullName} avatarUrl={remoteUser.avatarUrl} size={76} />
            </div>
          </div>

          <span className="text-[11px] font-mono font-bold uppercase tracking-widest text-emerald-400 mb-1">
            Incoming Video Call
          </span>
          <h3 className="text-xl font-bold text-white m-0 mb-1.5">{remoteUser.fullName}</h3>
          <RoleBadge role={remoteUser.role} />

          <div className="flex items-center justify-center gap-6 mt-7 w-full">
            <button
              type="button"
              onClick={rejectCall}
              className="flex flex-col items-center gap-1.5 bg-transparent border-0 cursor-pointer group"
              aria-label="Reject call"
            >
              <span className="w-14 h-14 rounded-full bg-[#dc2626] group-hover:bg-[#ef4444] text-white grid place-items-center shadow-lg transition-transform group-active:scale-95">
                <PhoneOff size={24} />
              </span>
              <span className="text-xs font-semibold text-gray-300">Decline</span>
            </button>

            <button
              type="button"
              onClick={() => void acceptCall()}
              className="flex flex-col items-center gap-1.5 bg-transparent border-0 cursor-pointer group"
              aria-label="Accept call"
            >
              <span className="w-14 h-14 rounded-full bg-[#10b981] group-hover:bg-[#34d399] text-[#08150e] grid place-items-center shadow-lg transition-transform group-active:scale-95">
                <Phone size={24} />
              </span>
              <span className="text-xs font-semibold text-emerald-300">Accept</span>
            </button>
          </div>
        </div>
      </div>
    )
  }

  // 2. Outgoing Calling / Ringing Modal
  if (callState === 'calling') {
    return (
      <div
        className="fixed inset-0 z-[1300] bg-black/80 backdrop-blur-md flex items-center justify-center p-4"
        role="dialog"
        aria-modal="true"
        aria-label="Outgoing video call"
      >
        <div className="relative w-full max-w-[420px] aspect-[3/4] sm:aspect-[4/5] rounded-2xl overflow-hidden bg-[#0e1712] border border-[#273d30] shadow-2xl flex flex-col justify-between">
          <video
            ref={localVideoRef}
            autoPlay
            playsInline
            muted
            className="absolute inset-0 w-full h-full object-cover -scale-x-100 opacity-55"
          />
          <div className="absolute inset-0 bg-gradient-to-b from-black/70 via-black/30 to-black/85" />

          <div className="relative z-10 flex flex-col items-center pt-12 px-6 text-center text-white">
            <div className="rounded-full ring-2 ring-emerald-400/60 p-1 mb-3 bg-[#0e1712]/70">
              <UserAvatar name={remoteUser.fullName} avatarUrl={remoteUser.avatarUrl} size={72} />
            </div>
            <h3 className="text-xl font-bold m-0 mb-1">{remoteUser.fullName}</h3>
            <span className="text-xs font-medium text-emerald-300 animate-pulse">
              Calling... (Waiting for answer)
            </span>
          </div>

          <div className="relative z-10 pb-8 flex items-center justify-center gap-5">
            <button
              type="button"
              onClick={toggleMute}
              className={`w-12 h-12 rounded-full grid place-items-center border-0 cursor-pointer transition-colors ${
                isMuted ? 'bg-red-500/80 text-white' : 'bg-white/15 hover:bg-white/25 text-white'
              }`}
              title={isMuted ? 'Unmute microphone' : 'Mute microphone'}
            >
              {isMuted ? <MicOff size={20} /> : <Mic size={20} />}
            </button>

            <button
              type="button"
              onClick={endCall}
              className="w-14 h-14 rounded-full bg-[#dc2626] hover:bg-[#ef4444] text-white grid place-items-center border-0 cursor-pointer shadow-lg transition-transform active:scale-95"
              title="Cancel call"
              aria-label="Cancel call"
            >
              <PhoneOff size={24} />
            </button>
          </div>
        </div>
      </div>
    )
  }

  // 3. Connected / Reconnecting Full-Screen Responsive Video Call UI
  const canScreenShare = typeof navigator !== 'undefined' && Boolean(navigator.mediaDevices?.getDisplayMedia)
  const hasRemoteVideo = Boolean(remoteStream && remoteStream.getVideoTracks().some((t) => t.readyState === 'live'))

  return (
    <div
      className="fixed inset-0 z-[1300] bg-[#080e0a] text-white flex flex-col overflow-hidden"
      role="dialog"
      aria-modal="true"
      aria-label={`Video call with ${remoteUser.fullName}`}
    >
      {/* Top Call Info Bar */}
      <header className="relative z-20 flex items-center justify-between px-4 sm:px-6 py-3 bg-gradient-to-b from-black/75 to-transparent">
        <div className="flex items-center gap-3 min-w-0">
          <UserAvatar name={remoteUser.fullName} avatarUrl={remoteUser.avatarUrl} size={36} />
          <div className="min-w-0">
            <div className="flex items-center gap-2">
              <strong className="text-sm sm:text-base font-bold truncate">{remoteUser.fullName}</strong>
              <RoleBadge role={remoteUser.role} />
            </div>
            <div className="flex items-center gap-2 text-xs text-emerald-300 font-mono">
              <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse" />
              <span>{formatCallTimer(callDurationSeconds)}</span>
            </div>
          </div>
        </div>

        {callState === 'reconnecting' && (
          <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-amber-500/20 border border-amber-400/40 text-amber-200 text-xs font-semibold">
            <WifiOff size={14} />
            <span>Reconnecting...</span>
          </div>
        )}
      </header>

      {/* Main Video Stage */}
      <div className="relative flex-1 min-h-0 flex items-center justify-center bg-[#0b130e]">
        <video
          ref={remoteVideoRef}
          autoPlay
          playsInline
          className={`w-full h-full object-contain sm:object-cover ${hasRemoteVideo ? 'opacity-100' : 'opacity-0'}`}
        />

        {!hasRemoteVideo && (
          <div className="absolute inset-0 flex flex-col items-center justify-center gap-3 text-center p-6">
            <UserAvatar name={remoteUser.fullName} avatarUrl={remoteUser.avatarUrl} size={96} />
            <p className="text-sm text-gray-300 m-0">Connecting video stream with {remoteUser.fullName}...</p>
          </div>
        )}

        {/* Picture-in-Picture Local Video */}
        <div className="absolute bottom-4 right-3 sm:bottom-6 sm:right-6 w-[110px] sm:w-[190px] aspect-[3/4] sm:aspect-video rounded-xl overflow-hidden border-2 border-white/25 bg-[#121c16] shadow-2xl z-20">
          <video
            ref={localVideoRef}
            autoPlay
            playsInline
            muted
            className={`w-full h-full object-cover ${isScreenSharing ? '' : '-scale-x-100'} ${isCameraOff ? 'hidden' : 'block'}`}
          />
          {isCameraOff && (
            <div className="w-full h-full flex flex-col items-center justify-center gap-1 text-gray-400 text-[11px]">
              <VideoOff size={20} />
              <span>Camera Off</span>
            </div>
          )}
        </div>
      </div>

      {/* Bottom Controls Bar */}
      <footer className="relative z-20 flex items-center justify-center gap-3 sm:gap-5 px-4 py-4 sm:py-5 bg-gradient-to-t from-black/85 to-black/40 border-t border-white/10">
        <button
          type="button"
          onClick={toggleMute}
          className={`w-12 h-12 sm:w-13 sm:h-13 rounded-full grid place-items-center border-0 cursor-pointer transition-colors ${
            isMuted ? 'bg-red-500 text-white' : 'bg-white/15 hover:bg-white/25 text-white'
          }`}
          title={isMuted ? 'Unmute mic' : 'Mute mic'}
          aria-label={isMuted ? 'Unmute mic' : 'Mute mic'}
        >
          {isMuted ? <MicOff size={20} /> : <Mic size={20} />}
        </button>

        <button
          type="button"
          onClick={toggleCamera}
          className={`w-12 h-12 sm:w-13 sm:h-13 rounded-full grid place-items-center border-0 cursor-pointer transition-colors ${
            isCameraOff ? 'bg-red-500 text-white' : 'bg-white/15 hover:bg-white/25 text-white'
          }`}
          title={isCameraOff ? 'Turn camera on' : 'Turn camera off'}
          aria-label={isCameraOff ? 'Turn camera on' : 'Turn camera off'}
        >
          {isCameraOff ? <VideoOff size={20} /> : <Video size={20} />}
        </button>

        {canScreenShare && (
          <button
            type="button"
            onClick={() => void toggleScreenShare()}
            className={`hidden sm:grid w-12 h-12 sm:w-13 sm:h-13 rounded-full place-items-center border-0 cursor-pointer transition-colors ${
              isScreenSharing ? 'bg-emerald-500 text-black' : 'bg-white/15 hover:bg-white/25 text-white'
            }`}
            title={isScreenSharing ? 'Stop sharing screen' : 'Share screen'}
            aria-label={isScreenSharing ? 'Stop sharing screen' : 'Share screen'}
          >
            {isScreenSharing ? <MonitorOff size={20} /> : <MonitorUp size={20} />}
          </button>
        )}

        <button
          type="button"
          onClick={endCall}
          className="w-14 h-12 sm:w-16 sm:h-13 rounded-full bg-[#dc2626] hover:bg-[#ef4444] text-white grid place-items-center border-0 cursor-pointer shadow-lg transition-transform active:scale-95"
          title="End video call"
          aria-label="End video call"
        >
          <PhoneOff size={22} />
        </button>
      </footer>
    </div>
  )
}

