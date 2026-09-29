import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import { BrowserRouter } from 'react-router-dom'
import { Toaster } from 'react-hot-toast'
import './index.css'
import App from './App.tsx'

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <BrowserRouter>
      <App />
      <Toaster position="top-right" toastOptions={{ duration: 3000, style: { background: '#193c33', color: '#e9eee7', borderRadius: '6px', padding: '12px 16px' }, success: { iconTheme: { primary: '#d9ed74', secondary: '#193c33' }, style: { background: '#193c33', color: '#e9eee7', borderRadius: '6px' } }, error: { iconTheme: { primary: '#ef6b5c', secondary: '#193c33' }, style: { background: '#193c33', color: '#e9eee7', borderRadius: '6px' } } }} />
    </BrowserRouter>
  </StrictMode>,
)
