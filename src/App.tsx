import { useEffect } from 'react'
import { Navigate, Route, Routes, useParams, useSearchParams } from 'react-router-dom'
import Landing from './pages/Landing'
import Account from './pages/Account'
import Login from './pages/Login'
import Register from './pages/Register'
import Dashboard from './pages/Dashboard'
import ForgotPassword from './pages/ForgotPassword'
import ResetPassword from './pages/ResetPassword'
import Profile from './pages/Profile'
import NotFound from './pages/NotFound'
import { NotificationProvider } from './context/NotificationContext'
import { ChatProvider } from './context/ChatContext'
import { VideoCallProvider } from './context/VideoCallContext'
import { MeetingProvider, useMeeting } from './context/MeetingContext'
import VideoCallOverlay from './components/chat/VideoCallOverlay'
import MeetingRoomOverlay from './components/chat/MeetingRoomOverlay'
import { useDynamicFavicon } from './hooks/useDynamicFavicon'

function MeetingQueryWatcher() {
  const [searchParams, setSearchParams] = useSearchParams()
  const { openPreJoin, stage } = useMeeting()
  const meetingCode = searchParams.get('meeting')

  useEffect(() => {
    if (meetingCode && stage === 'idle') {
      void openPreJoin(meetingCode)
      const next = new URLSearchParams(searchParams)
      next.delete('meeting')
      setSearchParams(next, { replace: true })
    }
  }, [meetingCode, stage, openPreJoin, searchParams, setSearchParams])

  return null
}

function MeetingRouteRedirect() {
  const { code } = useParams()
  return <Navigate to={`/dashboard?view=chat&meeting=${encodeURIComponent(code || '')}`} replace />
}

function App() {
  useDynamicFavicon()

  return (
    <NotificationProvider>
      <ChatProvider>
        <VideoCallProvider>
          <MeetingProvider>
            <MeetingQueryWatcher />
            <Routes>
              <Route path="/" element={<Landing />} />
              <Route path="/login" element={<Login />} />
              <Route path="/register" element={<Register />} />
              <Route path="/forgot-password" element={<ForgotPassword />} />
              <Route path="/reset-password" element={<ResetPassword />} />
              <Route path="/account" element={<Account />} />
              <Route path="/profile" element={<Profile />} />
              <Route path="/dashboard" element={<Dashboard />} />
              <Route path="/chat" element={<Navigate to="/dashboard?view=chat" replace />} />
              <Route path="/meeting/:code" element={<MeetingRouteRedirect />} />
              <Route path="/assistant" element={<Navigate to="/dashboard?view=assistant" replace />} />
              <Route path="/ai-employee" element={<Navigate to="/dashboard?view=assistant" replace />} />
              <Route path="/404" element={<NotFound />} />
              <Route path="*" element={<NotFound />} />
            </Routes>
            <VideoCallOverlay />
            <MeetingRoomOverlay />
          </MeetingProvider>
        </VideoCallProvider>
      </ChatProvider>
    </NotificationProvider>
  )
}

export default App
