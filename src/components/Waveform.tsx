import { useEffect, useRef } from 'react'

interface WaveformProps {
  analyserRef: React.RefObject<AnalyserNode | null>
  active: boolean
  barCount?: number
  color?: string
}

export default function Waveform({ analyserRef, active, barCount = 32, color = '#2f4a3f' }: WaveformProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null)
  const rafRef = useRef<number | null>(null)

  useEffect(() => {
    if (!active) {
      if (rafRef.current) { cancelAnimationFrame(rafRef.current); rafRef.current = null }
      const ctx = canvasRef.current?.getContext('2d')
      if (ctx && canvasRef.current) {
        ctx.clearRect(0, 0, canvasRef.current.width, canvasRef.current.height)
      }
      return
    }

    const canvas = canvasRef.current
    if (!canvas) return
    const ctx = canvas.getContext('2d')
    if (!ctx) return

    const data = new Uint8Array(128)
    const heights = new Float32Array(barCount).fill(4)

    const draw = () => {
      const analyser = analyserRef.current
      if (analyser) {
        analyser.getByteFrequencyData(data)
        const step = Math.floor(data.length / barCount)
        for (let i = 0; i < barCount; i++) {
          let sum = 0
          for (let j = 0; j < step; j++) sum += data[i * step + j]
          const avg = step > 0 ? sum / step / 255 : 0
          const target = 4 + avg * 28
          heights[i] += (target - heights[i]) * 0.35
        }
      }

      const dpr = window.devicePixelRatio || 1
      const w = canvas.clientWidth * dpr
      const h = canvas.clientHeight * dpr
      if (canvas.width !== w || canvas.height !== h) {
        canvas.width = w
        canvas.height = h
      }
      ctx.clearRect(0, 0, w, h)
      const barW = w / barCount
      const gap = Math.max(2, barW * 0.25)
      for (let i = 0; i < barCount; i++) {
        const bh = Math.max(4, heights[i] * dpr)
        const x = i * barW + gap / 2
        const y = (h - bh) / 2
        ctx.fillStyle = color
        ctx.beginPath()
        ctx.roundRect(x, y, barW - gap, bh, 3)
        ctx.fill()
      }
      rafRef.current = requestAnimationFrame(draw)
    }

    rafRef.current = requestAnimationFrame(draw)
    return () => {
      if (rafRef.current) { cancelAnimationFrame(rafRef.current); rafRef.current = null }
    }
  }, [analyserRef, active, barCount, color])

  return (
    <canvas
      ref={canvasRef}
      className="ai-waveform"
      aria-hidden="true"
      style={{ width: '100%', height: 56 }}
    />
  )
}