import { Navigate, Route, Routes } from 'react-router-dom'
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
import VideoCallOverlay from './components/chat/VideoCallOverlay'
import { useDynamicFavicon } from './hooks/useDynamicFavicon'

function App() {
  useDynamicFavicon()

  return (
    <NotificationProvider>
      <ChatProvider>
        <VideoCallProvider>
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
            <Route path="/assistant" element={<Navigate to="/dashboard?view=assistant" replace />} />
            <Route path="/ai-employee" element={<Navigate to="/dashboard?view=assistant" replace />} />
            <Route path="/404" element={<NotFound />} />
            <Route path="*" element={<NotFound />} />
          </Routes>
          <VideoCallOverlay />
        </VideoCallProvider>
      </ChatProvider>
    </NotificationProvider>
  )
}

export default App
