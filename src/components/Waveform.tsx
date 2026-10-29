import { useEffect, useRef } from 'react'

interface WaveformProps {
  analyserRef: React.RefObject<AnalyserNode | null>
  active: boolean
  barCount?: number
  color?: string
}

export default function Waveform({
  analyserRef,
  active,
  color = '#193c33',
}: WaveformProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null)
  const rafRef = useRef<number | null>(null)
  const intervalRef = useRef<number | null>(null)
  const historyRef = useRef<number[]>([])

  useEffect(() => {
    if (!active) {
      if (rafRef.current !== null) {
        cancelAnimationFrame(rafRef.current)
        rafRef.current = null
      }
      if (intervalRef.current !== null) {
        clearInterval(intervalRef.current)
        intervalRef.current = null
      }
      const canvas = canvasRef.current
      if (canvas) {
        const ctx = canvas.getContext('2d')
        if (ctx) ctx.clearRect(0, 0, canvas.width, canvas.height)
      }
      historyRef.current = []
      return
    }

    const canvas = canvasRef.current
    if (!canvas) return
    const ctx = canvas.getContext('2d')
    if (!ctx) return

    // 1 bar = 2px width + 3px gap = 5px step
    const barStep = 5
    const barWidth = 2
    const minHeight = 2.5 // Small dots for silence

    const syncBarsCount = () => {
      const widthCss = canvas.clientWidth || 300
      const count = Math.max(10, Math.floor(widthCss / barStep))
      const current = historyRef.current
      if (current.length === 0) {
        historyRef.current = new Array(count).fill(0)
      } else if (current.length < count) {
        historyRef.current = [...new Array(count - current.length).fill(0), ...current]
      } else if (current.length > count) {
        historyRef.current = current.slice(-count)
      }
    }

    syncBarsCount()

    // 50ms volume sampling timer
    intervalRef.current = window.setInterval(() => {
      const analyser = analyserRef.current
      let volume = 0

      if (analyser) {
        const bufferLength = analyser.fftSize || 256
        const timeData = new Uint8Array(bufferLength)
        analyser.getByteTimeDomainData(timeData)

        let sumSquares = 0
        for (let i = 0; i < bufferLength; i++) {
          const normalized = (timeData[i] - 128) / 128
          sumSquares += normalized * normalized
        }
        const rms = Math.sqrt(sumSquares / bufferLength)

        // Noise floor suppression and natural speech amplification
        const noiseFloor = 0.015
        const netRms = Math.max(0, rms - noiseFloor) / (1 - noiseFloor)
        volume = Math.min(1, Math.pow(netRms * 4.5, 0.85))
      }

      const history = historyRef.current
      if (history.length > 0) {
        history.shift()
        history.push(volume)
      }
    }, 50)

    // Render loop handling devicePixelRatio
    const draw = () => {
      const currentCanvas = canvasRef.current
      if (!currentCanvas) return
      const currentCtx = currentCanvas.getContext('2d')
      if (!currentCtx) return

      const dpr = window.devicePixelRatio || 1
      const rect = currentCanvas.getBoundingClientRect()
      const widthCss = rect.width
      const heightCss = rect.height

      if (widthCss <= 0 || heightCss <= 0) {
        rafRef.current = requestAnimationFrame(draw)
        return
      }

      const targetW = Math.round(widthCss * dpr)
      const targetH = Math.round(heightCss * dpr)
      if (currentCanvas.width !== targetW || currentCanvas.height !== targetH) {
        currentCanvas.width = targetW
        currentCanvas.height = targetH
        syncBarsCount()
      }

      currentCtx.save()
      currentCtx.scale(dpr, dpr)
      currentCtx.clearRect(0, 0, widthCss, heightCss)

      const history = historyRef.current
      const totalBars = history.length
      const maxHeight = Math.max(10, heightCss - 8)
      const startX = widthCss - totalBars * barStep

      for (let i = 0; i < totalBars; i++) {
        const vol = history[i] || 0
        const barH = Math.max(minHeight, minHeight + vol * (maxHeight - minHeight))
        const x = startX + i * barStep
        const y = (heightCss - barH) / 2

        // Older bars fade slightly toward the left (e.g. 0.28 on left to 1.0 on right)
        const progress = totalBars > 1 ? i / (totalBars - 1) : 1
        currentCtx.globalAlpha = 0.28 + 0.72 * progress
        currentCtx.fillStyle = color

        currentCtx.beginPath()
        if (typeof currentCtx.roundRect === 'function') {
          currentCtx.roundRect(x, y, barWidth, barH, 1)
        } else {
          currentCtx.rect(x, y, barWidth, barH)
        }
        currentCtx.fill()
      }

      currentCtx.restore()
      rafRef.current = requestAnimationFrame(draw)
    }

    rafRef.current = requestAnimationFrame(draw)

    return () => {
      if (rafRef.current !== null) {
        cancelAnimationFrame(rafRef.current)
        rafRef.current = null
      }
      if (intervalRef.current !== null) {
        clearInterval(intervalRef.current)
        intervalRef.current = null
      }
    }
  }, [analyserRef, active, color])

  return (
    <canvas
      ref={canvasRef}
      className="ai-waveform block flex-1 min-w-0"
      aria-hidden="true"
      style={{ width: '100%', height: 36 }}
    />
  )
}