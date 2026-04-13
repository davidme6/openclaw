/** Voice / video call simulation modal */
import { useEffect, useRef, useState } from 'react'

interface Props {
  roleId: string | null
  roleName: string
  roleStatus?: string
  mode: 'voice' | 'video'
  onClose: () => void
}

export default function CallModal({ roleName, mode, onClose }: Props) {
  const [duration, setDuration] = useState(0)
  const timerRef = useRef<ReturnType<typeof setInterval> | null>(null)

  useEffect(() => {
    timerRef.current = setInterval(() => setDuration(d => d + 1), 1000)
    return () => { if (timerRef.current) clearInterval(timerRef.current) }
  }, [])

  const fmt = (s: number) => `${String(Math.floor(s / 60)).padStart(2, '0')}:${String(s % 60).padStart(2, '0')}`

  return (
    <div className="call-modal-overlay" onClick={e => e.target === e.currentTarget && onClose()}>
      <div className="call-modal">
        <div className="call-modal-avatar">
          {roleName.charAt(0)}
        </div>
        <div className="call-modal-name">{roleName}</div>
        <div className="call-modal-status">
          {mode === 'voice' ? '🎙️ 语音通话中' : '📹 视频通话中'}
        </div>
        <div className="call-modal-timer">{fmt(duration)}</div>
        <div className="call-modal-note">
          （此功能为界面演示，实际通话能力需接入语音 API）
        </div>
        <button className="call-modal-end" onClick={onClose}>
          📵 挂断
        </button>
      </div>
    </div>
  )
}
