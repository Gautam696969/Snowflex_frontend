import { useState, useRef, useEffect, useCallback } from 'react'
import {
  Camera,
  RefreshCw,
  X,
  Check,
  AlertCircle,
  SwitchCamera,
  Sun,
  Clock,
  ShieldCheck,
  ChevronLeft,
  Smartphone,
  Sparkles,
} from 'lucide-react'

export interface CameraCaptureModalProps {
  isOpen: boolean
  mode: 'check-in' | 'check-out'
  initialStep?: 'prompt' | 'camera'
  employeeName?: string
  onRequestAdjustment?: () => void
  onClose: () => void
  onConfirm: (photoBase64: string) => Promise<void>
}

export default function CameraCaptureModal({
  isOpen,
  mode,
  initialStep,
  employeeName,
  onRequestAdjustment,
  onClose,
  onConfirm,
}: CameraCaptureModalProps) {
  // Step state: 'prompt' (for morning greeting), 'camera' (live viewfinder), 'preview' (snapshot review)
  const [step, setStep] = useState<'prompt' | 'camera' | 'preview'>('prompt')
  const [stream, setStream] = useState<MediaStream | null>(null)
  const [isStreaming, setIsStreaming] = useState(false)
  const [isFlashing, setIsFlashing] = useState(false)
  const [capturedImage, setCapturedImage] = useState<string | null>(null)
  const [facingMode, setFacingMode] = useState<'user' | 'environment'>('user')
  const [cameraError, setCameraError] = useState<string | null>(null)
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [hasMultipleCameras, setHasMultipleCameras] = useState(false)
  const [currentTime, setCurrentTime] = useState(new Date())

  const videoRef = useRef<HTMLVideoElement>(null)
  const canvasRef = useRef<HTMLCanvasElement>(null)
  const fileInputRef = useRef<HTMLInputElement>(null)

  // Live ticking clock for morning prompt & snapshot timestamping
  useEffect(() => {
    if (!isOpen) return
    const timer = setInterval(() => {
      setCurrentTime(new Date())
    }, 1000)
    return () => clearInterval(timer)
  }, [isOpen])

  // Stop active camera tracks helper
  const stopTracks = useCallback(() => {
    if (stream) {
      stream.getTracks().forEach((track) => {
        try {
          track.stop()
        } catch {}
      })
      setStream(null)
    }
    setIsStreaming(false)
  }, [stream])

  // Reset or configure step on open/mode change
  useEffect(() => {
    if (isOpen) {
      if (mode === 'check-out') {
        setStep('camera')
      } else {
        setStep(initialStep || 'prompt')
      }
      setCapturedImage(null)
      setCameraError(null)
      setIsSubmitting(false)
      setIsStreaming(false)
    } else {
      stopTracks()
    }
  }, [isOpen, mode, initialStep, stopTracks])

  // Check available camera devices
  const checkCameraDevices = useCallback(() => {
    if (navigator.mediaDevices && navigator.mediaDevices.enumerateDevices) {
      navigator.mediaDevices
        .enumerateDevices()
        .then((devices) => {
          const videoInputs = devices.filter((d) => d.kind === 'videoinput')
          setHasMultipleCameras(videoInputs.length > 1)
        })
        .catch(() => {})
    }
  }, [])

  useEffect(() => {
    if (isOpen) {
      checkCameraDevices()
    }
  }, [isOpen, checkCameraDevices])

  // Start camera stream with multi-tiered fallback
  const startCamera = useCallback(async () => {
    setCameraError(null)
    setIsStreaming(false)
    stopTracks()

    if (!navigator.mediaDevices || !navigator.mediaDevices.getUserMedia) {
      setCameraError('Camera API is not supported on this device/browser. You can use your phone camera or upload a selfie below.')
      return
    }

    // Tier 1: Preferred resolution & facing mode
    const tier1Constraints: MediaStreamConstraints = {
      video: {
        facingMode: { ideal: facingMode },
        width: { ideal: 1280, max: 1920 },
        height: { ideal: 720, max: 1080 },
      },
      audio: false,
    }

    let mediaStream: MediaStream | null = null

    try {
      mediaStream = await navigator.mediaDevices.getUserMedia(tier1Constraints)
    } catch (err1) {
      console.warn('Tier 1 camera constraints failed, attempting fallback...', err1)
      try {
        // Tier 2: Simple facingMode
        mediaStream = await navigator.mediaDevices.getUserMedia({
          video: { facingMode: { ideal: facingMode } },
          audio: false,
        })
      } catch (err2) {
        console.warn('Tier 2 camera constraints failed, attempting basic video...', err2)
        try {
          // Tier 3: Basic generic video
          mediaStream = await navigator.mediaDevices.getUserMedia({ video: true, audio: false })
        } catch (err3) {
          console.error('All camera attempts failed:', err3)
          const errorObj = err3 as { name?: string; message?: string }
          if (errorObj?.name === 'NotAllowedError' || errorObj?.name === 'PermissionDeniedError') {
            setCameraError(
              'Camera permission denied. To re-enable: tap the lock or site settings icon in your browser URL bar, set Camera to "Allow", and retry.'
            )
          } else if (errorObj?.name === 'NotFoundError' || errorObj?.name === 'DevicesNotFoundError') {
            setCameraError('No camera found on this device. You can take a selfie using the phone camera button below.')
          } else if (errorObj?.name === 'NotReadableError' || errorObj?.name === 'TrackStartError') {
            setCameraError('Camera is currently busy in another app or browser tab. Please close other camera apps and retry.')
          } else {
            setCameraError('Unable to access camera. Please allow camera permissions or tap "Use Phone Camera" below.')
          }
          return
        }
      }
    }

    if (mediaStream) {
      setStream(mediaStream)
      checkCameraDevices()
    }
  }, [facingMode, stopTracks, checkCameraDevices])

  // Attach stream to video whenever stream or step changes
  useEffect(() => {
    const video = videoRef.current
    if (!video || !stream || step !== 'camera') return

    video.srcObject = stream
    video.setAttribute('playsinline', 'true')
    video.setAttribute('webkit-playsinline', 'true')
    video.muted = true
    video.defaultMuted = true

    let isMounted = true

    const playVideo = () => {
      if (!isMounted) return
      video
        .play()
        .then(() => {
          if (isMounted) setIsStreaming(true)
        })
        .catch((err) => {
          console.warn('Playback interrupted or blocked:', err)
        })
    }

    video.addEventListener('loadedmetadata', playVideo)
    video.addEventListener('canplay', playVideo)

    if (video.readyState >= 1) {
      playVideo()
    }

    return () => {
      isMounted = false
      video.removeEventListener('loadedmetadata', playVideo)
      video.removeEventListener('canplay', playVideo)
    }
  }, [stream, step])

  // Trigger camera startup when entering 'camera' step
  useEffect(() => {
    if (isOpen && step === 'camera') {
      void startCamera()
    } else if (step !== 'camera') {
      stopTracks()
    }
    return () => {
      stopTracks()
    }
  }, [isOpen, step, startCamera, stopTracks])

  // Capture snapshot from live video stream
  const handleCapture = () => {
    if (!videoRef.current || !canvasRef.current) return
    const video = videoRef.current
    const canvas = canvasRef.current

    const originalWidth = video.videoWidth || 640
    const originalHeight = video.videoHeight || 480

    if (originalWidth === 0 || originalHeight === 0) {
      console.warn('Video not ready for capture yet')
      return
    }

    // Trigger visual shutter flash
    setIsFlashing(true)
    setTimeout(() => setIsFlashing(false), 160)

    // Normalize resolution: target max dimension 1280px for crisp, lightweight payload
    const maxDim = 1280
    let targetWidth = originalWidth
    let targetHeight = originalHeight

    if (targetWidth > maxDim || targetHeight > maxDim) {
      if (targetWidth > targetHeight) {
        targetHeight = Math.round((targetHeight * maxDim) / targetWidth)
        targetWidth = maxDim
      } else {
        targetWidth = Math.round((targetWidth * maxDim) / targetHeight)
        targetHeight = maxDim
      }
    }

    canvas.width = targetWidth
    canvas.height = targetHeight

    const ctx = canvas.getContext('2d')
    if (!ctx) return

    ctx.save()
    // Mirror only front camera
    if (facingMode === 'user') {
      ctx.translate(targetWidth, 0)
      ctx.scale(-1, 1)
    }
    ctx.drawImage(video, 0, 0, targetWidth, targetHeight)
    ctx.restore()

    const dataUrl = canvas.toDataURL('image/jpeg', 0.85)
    setCapturedImage(dataUrl)
    stopTracks()
    setStep('preview')
  }

  // Native phone camera & file input handler with automatic client-side compression
  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (!file) return

    const reader = new FileReader()
    reader.onload = (event) => {
      const rawDataUrl = event.target?.result as string
      if (!rawDataUrl) return

      // Compress and resize high-res mobile photos to prevent huge base64 payload
      const img = new Image()
      img.onload = () => {
        let w = img.width
        let h = img.height
        const maxDim = 1280

        if (w > maxDim || h > maxDim) {
          if (w > h) {
            h = Math.round((h * maxDim) / w)
            w = maxDim
          } else {
            w = Math.round((w * maxDim) / h)
            h = maxDim
          }
        }

        const offCanvas = document.createElement('canvas')
        offCanvas.width = w
        offCanvas.height = h
        const offCtx = offCanvas.getContext('2d')
        if (offCtx) {
          offCtx.drawImage(img, 0, 0, w, h)
          const optimized = offCanvas.toDataURL('image/jpeg', 0.85)
          setCapturedImage(optimized)
        } else {
          setCapturedImage(rawDataUrl)
        }
        stopTracks()
        setStep('preview')
      }
      img.onerror = () => {
        setCapturedImage(rawDataUrl)
        stopTracks()
        setStep('preview')
      }
      img.src = rawDataUrl
    }
    reader.readAsDataURL(file)
    // Clear input so same file can be picked again if retried
    e.target.value = ''
  }

  const handleRetake = () => {
    setCapturedImage(null)
    setIsStreaming(false)
    setStep('camera')
  }

  const handleSwitchCamera = () => {
    setIsStreaming(false)
    setFacingMode((prev) => (prev === 'user' ? 'environment' : 'user'))
  }

  const handleConfirmSubmit = async () => {
    if (!capturedImage || isSubmitting) return
    setIsSubmitting(true)
    try {
      await onConfirm(capturedImage)
      onClose()
    } catch (err) {
      console.error('Confirmation error:', err)
    } finally {
      setIsSubmitting(false)
    }
  }

  if (!isOpen) return null

  const isCheckIn = mode === 'check-in'
  const actionTitle = isCheckIn ? 'Morning Shift Check-In' : 'Shift Check-Out'
  const actionKicker = isCheckIn ? 'CAMERA ATTENDANCE VERIFICATION' : 'SHIFT WRAP-UP & VERIFICATION'
  const timeString = currentTime.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit' })
  const dateString = currentTime.toLocaleDateString(undefined, {
    weekday: 'long',
    month: 'short',
    day: 'numeric',
    year: 'numeric',
  })

  return (
    <div
      className="fixed inset-0 z-[100] flex items-center justify-center p-3 sm:p-4 bg-black/80 backdrop-blur-sm animate-fade-in"
      role="dialog"
      aria-modal="true"
      aria-labelledby="camera-modal-title"
    >
      <div className="relative w-full max-w-[480px] bg-white dark:bg-[#18221c] border border-[#dce5dc] dark:border-[#2d3a31] rounded-[20px] shadow-2xl overflow-hidden flex flex-col max-h-[94vh]">
        {/* Hidden Canvas for capture rendering */}
        <canvas ref={canvasRef} className="hidden" />

        {/* Hidden native camera file input fallback */}
        <input
          ref={fileInputRef}
          type="file"
          accept="image/*"
          capture="user"
          className="hidden"
          onChange={handleFileChange}
        />

        {/* ================= STEP 1: MORNING PROMPT VIEW ================= */}
        {step === 'prompt' && isCheckIn && (
          <div className="flex flex-col">
            {/* Header */}
            <div className="flex items-center justify-between px-5 py-4 border-b border-[#e6ede5] dark:border-[#26342a] bg-[#f9fbf8] dark:bg-[#151d18]">
              <div className="flex flex-col">
                <span className="font-mono text-[10px] font-black uppercase tracking-wider text-[#3c6b48] dark:text-[#88b693]">
                  MORNING SHIFT • ATTENDANCE
                </span>
                <h2 id="camera-modal-title" className="text-[18px] font-extrabold text-[#193c33] dark:text-[#edf5ef] m-0 leading-tight">
                  Good Morning, {employeeName || 'Team Member'}! ☀️
                </h2>
              </div>
              <button
                type="button"
                onClick={onClose}
                className="w-8 h-8 rounded-full flex items-center justify-center text-[#67776b] hover:text-[#193c33] hover:bg-[#e8efe6] dark:hover:bg-[#253328] transition-colors cursor-pointer"
                title="Dismiss for now"
                aria-label="Dismiss check-in prompt"
              >
                <X size={18} />
              </button>
            </div>

            {/* Prompt Body */}
            <div className="p-6 flex flex-col items-center text-center bg-white dark:bg-[#18221c]">
              {/* Sun & Clock Icon graphic */}
              <div className="relative mb-4">
                <div className="w-18 h-18 sm:w-20 sm:h-20 rounded-full bg-[linear-gradient(135deg,#fef3c7_0%,#fde68a_100%)] dark:bg-[linear-gradient(135deg,#2b2612_0%,#3d3416_100%)] flex items-center justify-center shadow-md">
                  <Sun className="w-10 h-10 text-[#d97706] dark:text-[#fbbf24] animate-pulse" />
                </div>
                <span className="absolute bottom-0 right-0 w-6 h-6 rounded-full bg-[#10b981] border-2 border-white dark:border-[#18221c] flex items-center justify-center text-white shadow">
                  <Clock size={12} />
                </span>
              </div>

              {/* Live Ticking Clock Badge */}
              <div className="inline-flex items-center gap-2 px-3.5 py-1.5 rounded-full bg-[#f0f6ee] dark:bg-[#1f2d23] border border-[#d6e5d3] dark:border-[#2f4236] text-[#193c33] dark:text-[#a5c9b0] mb-2 shadow-xs">
                <span className="w-2.5 h-2.5 rounded-full bg-[#10b981] animate-ping" />
                <span className="font-mono text-[14px] font-bold tracking-wide">{timeString}</span>
              </div>
              <span className="text-[12px] text-[#6b7d72] dark:text-[#90a396] mb-3">{dateString}</span>

              {/* Welcome text */}
              <h3 className="text-[16.5px] font-bold text-[#1a2f26] dark:text-[#edf5ef] m-0 mb-1.5">
                Ready to begin today's shift?
              </h3>
              <p className="text-[13px] text-[#55695b] dark:text-[#9fb2a4] m-0 max-w-[380px] leading-relaxed mb-4">
                Please verify your morning attendance with a quick selfie.
              </p>

              {/* Automatic admin notification banner */}
              <div className="w-full p-3 rounded-[10px] bg-[#f4faf4] dark:bg-[#19241d] border border-[#d8edd8] dark:border-[#283d2d] flex items-start gap-2.5 text-left mb-5">
                <ShieldCheck size={18} className="text-[#10b981] flex-shrink-0 mt-0.5" />
                <div className="flex flex-col text-[11.5px] text-[#2c5339] dark:text-[#a0c5ac] leading-tight">
                  <strong className="font-bold">Automatic Real-Time Notification</strong>
                  <span className="text-[11px] text-[#4d725a] dark:text-[#80a48c] mt-0.5">
                    Your check-in timestamp and selfie photo will be forwarded automatically to Super Admin and Admin.
                  </span>
                </div>
              </div>

              {/* Primary Action Button: Open Camera & Check In */}
              <button
                type="button"
                onClick={() => setStep('camera')}
                className="w-full py-3.5 px-6 rounded-[12px] bg-[#193c33] hover:bg-[#255246] active:bg-[#122e26] text-white text-[14px] font-extrabold shadow-[0_4px_16px_rgba(25,60,51,0.25)] hover:shadow-lg transition-all flex items-center justify-center gap-2.5 cursor-pointer transform hover:-translate-y-0.5"
              >
                <Camera size={19} />
                <span>Open Camera & Check In</span>
              </button>

              {/* Forgot Punch Regularization link */}
              {onRequestAdjustment && (
                <button
                  type="button"
                  onClick={() => {
                    onClose()
                    onRequestAdjustment()
                  }}
                  className="mt-4 text-[12px] text-[#2d5d3e] dark:text-[#88c599] font-semibold underline hover:text-[#193c33] cursor-pointer bg-transparent border-0 p-0"
                >
                  Forgot previous check-in or check-out? Request adjustment →
                </button>
              )}
            </div>

            {/* Prompt Footer */}
            <div className="px-5 py-3 border-t border-[#e6ede5] dark:border-[#26342a] bg-[#f9fbf8] dark:bg-[#151d18] flex items-center justify-center">
              <button
                type="button"
                onClick={onClose}
                className="text-[12.5px] font-medium text-[#67776b] hover:text-[#193c33] dark:text-[#8ca192] dark:hover:text-white transition-colors cursor-pointer py-1 px-3 rounded hover:bg-[#eaf1e8] dark:hover:bg-[#212f24]"
              >
                Remind me later • Skip for now
              </button>
            </div>
          </div>
        )}

        {/* ================= STEP 2: LIVE CAMERA VIEW ================= */}
        {step === 'camera' && (
          <div className="flex flex-col">
            {/* Header */}
            <div className="flex items-center justify-between px-5 py-3.5 border-b border-[#e5ebe4] dark:border-[#26342a] bg-[#f8faf7] dark:bg-[#151d18]">
              <div className="flex items-center gap-2">
                {isCheckIn && (
                  <button
                    type="button"
                    onClick={() => setStep('prompt')}
                    className="w-7 h-7 rounded-full flex items-center justify-center text-[#67776b] hover:text-[#193c33] hover:bg-[#e8efe6] dark:hover:bg-[#253328] transition-colors cursor-pointer"
                    title="Back to prompt"
                  >
                    <ChevronLeft size={18} />
                  </button>
                )}
                <div className="flex flex-col">
                  <span className="font-mono text-[10px] font-bold uppercase tracking-wider text-[#456b4f] dark:text-[#88b693]">
                    {actionKicker}
                  </span>
                  <h2 id="camera-modal-title" className="text-[17px] font-bold text-[#1a2f26] dark:text-[#edf5ef] m-0 leading-tight">
                    {actionTitle}
                  </h2>
                </div>
              </div>
              <button
                type="button"
                onClick={onClose}
                className="w-8 h-8 rounded-full flex items-center justify-center text-[#67776b] hover:text-[#1a2f26] hover:bg-[#e8efe6] dark:hover:bg-[#253328] transition-colors cursor-pointer"
                aria-label="Close camera verification"
              >
                <X size={18} />
              </button>
            </div>

            {/* Viewfinder Area */}
            <div className="relative p-3 sm:p-4 flex flex-col items-center justify-center bg-[#0d1410] overflow-hidden">
              <div className="relative w-full aspect-[4/3] max-w-[420px] rounded-[16px] overflow-hidden bg-black flex items-center justify-center border border-[#2d3a31] shadow-inner">
                {/* Visual Shutter Flash Effect */}
                {isFlashing && (
                  <div className="absolute inset-0 bg-white z-30 transition-opacity duration-150 pointer-events-none" />
                )}

                {/* Live Video Element */}
                <video
                  ref={videoRef}
                  autoPlay
                  playsInline
                  muted
                  className={`w-full h-full object-cover transition-opacity duration-300 ${
                    isStreaming ? 'opacity-100' : 'opacity-0'
                  } ${facingMode === 'user' ? 'scale-x-[-1]' : ''}`}
                />

                {/* Loading state before video begins streaming */}
                {!isStreaming && !cameraError && (
                  <div className="absolute inset-0 flex flex-col items-center justify-center bg-[#0d1410] text-gray-300 gap-3 z-10">
                    <div className="w-10 h-10 border-3 border-emerald-500/30 border-t-emerald-500 rounded-full animate-spin" />
                    <span className="text-[12px] font-medium tracking-wide">Starting camera viewfinder…</span>
                  </div>
                )}

                {/* Viewfinder Face Guide Overlay (visible when active) */}
                {isStreaming && (
                  <div className="absolute inset-0 pointer-events-none flex flex-col items-center justify-center">
                    <div className="w-[180px] h-[220px] rounded-[50%] border-2 border-dashed border-[#edf5ef]/75 shadow-[0_0_0_9999px_rgba(0,0,0,0.35)] flex items-center justify-center">
                      <div className="w-[172px] h-[212px] rounded-[50%] border border-white/25" />
                    </div>
                    <div className="absolute bottom-2.5 px-3 py-1 rounded-full bg-black/60 backdrop-blur-md border border-white/10 text-white text-[11px] font-medium tracking-wide flex items-center gap-1.5 shadow">
                      <span className="w-2 h-2 rounded-full bg-[#10b981] animate-ping" />
                      <span>Center your face • {timeString}</span>
                    </div>
                  </div>
                )}

                {/* Camera Flip / Switch Button */}
                {(hasMultipleCameras || isStreaming) && (
                  <button
                    type="button"
                    onClick={handleSwitchCamera}
                    className="absolute top-2.5 right-2.5 z-20 w-9 h-9 rounded-full bg-black/60 text-white flex items-center justify-center hover:bg-black/80 transition-colors border border-white/15 cursor-pointer shadow-md"
                    title="Switch between front and back camera"
                    aria-label="Switch camera"
                  >
                    <SwitchCamera size={18} />
                  </button>
                )}

                {/* Camera Error / Permission Fallback View */}
                {cameraError && (
                  <div className="absolute inset-0 bg-black/90 flex flex-col items-center justify-center p-5 text-center text-white gap-3 z-20">
                    <AlertCircle size={34} className="text-[#f59e0b]" />
                    <p className="text-[12.5px] leading-relaxed max-w-[320px] text-gray-200 m-0">
                      {cameraError}
                    </p>
                    <div className="flex items-center gap-2 flex-wrap justify-center mt-2">
                      <button
                        type="button"
                        onClick={() => void startCamera()}
                        className="inline-flex items-center gap-1.5 px-3.5 py-2 rounded-[8px] bg-white/15 hover:bg-white/25 text-white text-[12px] font-semibold border border-white/20 transition-colors cursor-pointer"
                      >
                        <RefreshCw size={14} />
                        <span>Retry Camera</span>
                      </button>
                      <button
                        type="button"
                        onClick={() => fileInputRef.current?.click()}
                        className="inline-flex items-center gap-1.5 px-4 py-2 rounded-[8px] bg-[#10b981] hover:bg-[#059669] text-white text-[12px] font-bold transition-colors cursor-pointer shadow-md"
                      >
                        <Smartphone size={15} />
                        <span>Use Phone Camera</span>
                      </button>
                    </div>
                  </div>
                )}
              </div>
            </div>

            {/* Camera Actions & Shutter Area */}
            <div className="px-5 py-4 bg-white dark:bg-[#18221c] border-t border-[#e5ebe4] dark:border-[#26342a] flex items-center justify-between gap-3">
              {/* Phone Camera / File Fallback */}
              <button
                type="button"
                onClick={() => fileInputRef.current?.click()}
                className="inline-flex items-center gap-1.5 px-3 py-2 text-[12px] font-semibold text-[#55695b] hover:text-[#193c33] dark:text-[#9fb2a4] dark:hover:text-white transition-colors cursor-pointer rounded-lg hover:bg-[#f0f5ee] dark:hover:bg-[#202e24]"
                title="Open native phone camera app"
              >
                <Smartphone size={16} />
                <span>Phone Camera</span>
              </button>

              {/* Shutter Button (Centered, Large & Tactile) */}
              <div className="flex items-center justify-center">
                <button
                  type="button"
                  onClick={handleCapture}
                  disabled={!isStreaming || Boolean(cameraError)}
                  className="group relative w-15 h-15 rounded-full border-4 border-[#193c33] dark:border-[#d9ed74] p-1 flex items-center justify-center transition-all cursor-pointer disabled:opacity-40 disabled:cursor-not-allowed hover:scale-105 active:scale-95 shadow-md"
                  aria-label="Capture attendance selfie"
                >
                  <span className="w-full h-full rounded-full bg-[#193c33] dark:bg-[#d9ed74] group-hover:bg-[#255246] dark:group-hover:bg-[#e4f58c] flex items-center justify-center text-white dark:text-[#141d18] transition-colors">
                    <Camera size={22} strokeWidth={2.4} />
                  </span>
                </button>
              </div>

              {/* Switch Camera Button (right aligned) */}
              <button
                type="button"
                onClick={handleSwitchCamera}
                disabled={!isStreaming}
                className="inline-flex items-center gap-1.5 px-3 py-2 text-[12px] font-semibold text-[#55695b] hover:text-[#193c33] dark:text-[#9fb2a4] dark:hover:text-white transition-colors cursor-pointer rounded-lg hover:bg-[#f0f5ee] dark:hover:bg-[#202e24] disabled:opacity-40 disabled:cursor-not-allowed"
                title="Switch front/back camera"
              >
                <SwitchCamera size={16} />
                <span>Flip</span>
              </button>
            </div>
          </div>
        )}

        {/* ================= STEP 3: PREVIEW CAPTURED SNAPSHOT ================= */}
        {step === 'preview' && capturedImage && (
          <div className="flex flex-col">
            {/* Header */}
            <div className="flex items-center justify-between px-5 py-3.5 border-b border-[#e5ebe4] dark:border-[#26342a] bg-[#f8faf7] dark:bg-[#151d18]">
              <div className="flex flex-col">
                <span className="font-mono text-[10px] font-bold uppercase tracking-wider text-[#10b981] flex items-center gap-1">
                  <Sparkles size={12} />
                  SNAPSHOT CAPTURED
                </span>
                <h2 id="camera-modal-title" className="text-[17px] font-bold text-[#1a2f26] dark:text-[#edf5ef] m-0 leading-tight">
                  Confirm {actionTitle}
                </h2>
              </div>
              <button
                type="button"
                onClick={onClose}
                className="w-8 h-8 rounded-full flex items-center justify-center text-[#67776b] hover:text-[#1a2f26] hover:bg-[#e8efe6] dark:hover:bg-[#253328] transition-colors cursor-pointer"
                aria-label="Close"
              >
                <X size={18} />
              </button>
            </div>

            {/* Image Preview Body */}
            <div className="relative p-3 sm:p-4 flex flex-col items-center justify-center bg-[#0d1410] overflow-hidden">
              <div className="relative w-full aspect-[4/3] max-w-[420px] rounded-[16px] overflow-hidden bg-black flex items-center justify-center border border-[#2d3a31] shadow-inner">
                <img
                  src={capturedImage}
                  alt="Captured attendance verification snapshot"
                  className="w-full h-full object-cover"
                />
                <div className="absolute top-3 left-3 px-2.5 py-1 rounded-[6px] bg-[#10b981] text-white font-mono text-[10.5px] font-bold tracking-wider uppercase shadow">
                  VERIFIED SNAPSHOT
                </div>
                <div className="absolute bottom-3 right-3 px-2.5 py-1 rounded-[6px] bg-black/75 backdrop-blur-md text-white font-mono text-[11px] font-semibold border border-white/10 shadow">
                  {timeString}
                </div>
              </div>
            </div>

            {/* Confirmation Actions Footer */}
            <div className="px-5 py-3.5 bg-white dark:bg-[#18221c] border-t border-[#e5ebe4] dark:border-[#26342a] flex items-center justify-between gap-3">
              <button
                type="button"
                onClick={handleRetake}
                disabled={isSubmitting}
                className="inline-flex items-center gap-1.5 px-4 py-2.5 rounded-[10px] border border-[#d6ded5] dark:border-[#35463a] text-[#425447] dark:text-[#cbd8ce] hover:bg-[#f2f6f1] dark:hover:bg-[#202d24] text-[12.5px] font-bold transition-colors cursor-pointer disabled:opacity-50"
              >
                <RefreshCw size={14} />
                <span>Retake</span>
              </button>

              <button
                type="button"
                onClick={handleConfirmSubmit}
                disabled={isSubmitting}
                className="inline-flex items-center gap-2 px-6 py-2.5 rounded-[10px] bg-[#10b981] hover:bg-[#059669] text-white text-[13px] font-extrabold shadow-md hover:shadow-lg transition-all cursor-pointer disabled:opacity-60 disabled:cursor-wait ml-auto"
              >
                {isSubmitting ? (
                  <>
                    <RefreshCw size={16} className="animate-spin" />
                    <span>Saving Verification…</span>
                  </>
                ) : (
                  <>
                    <Check size={18} strokeWidth={2.5} />
                    <span>Confirm & {isCheckIn ? 'Check In' : 'Check Out'}</span>
                  </>
                )}
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  )
}
