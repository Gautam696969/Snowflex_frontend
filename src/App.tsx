import { Navigate, Route, Routes } from 'react-router-dom'
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

function App() {
  return (
    <NotificationProvider>
      <ChatProvider>
        <Routes>
          <Route path="/login" element={<Login />} />
          <Route path="/register" element={<Register />} />
          <Route path="/forgot-password" element={<ForgotPassword />} />
          <Route path="/reset-password" element={<ResetPassword />} />
          <Route path="/account" element={<Account />} />
          <Route path="/profile" element={<Profile />} />
          <Route path="/dashboard" element={<Dashboard />} />
          <Route path="/chat" element={<Navigate to="/dashboard?view=chat" replace />} />
          <Route path="/404" element={<NotFound />} />
          <Route path="*" element={<NotFound />} />
        </Routes>
      </ChatProvider>
    </NotificationProvider>
  )
}

export default App
