import { BrowserRouter, Routes, Route } from 'react-router-dom'
import Landing from './pages/Landing'
import DiagramPage from './pages/DiagramPage'
import { ToastProvider } from './contexts/ToastContext'

export default function App() {
  return (
    <ToastProvider>
      <BrowserRouter>
        <Routes>
          <Route path="/" element={<Landing />} />
          <Route path="/diagram/:id" element={<DiagramPage />} />
        </Routes>
      </BrowserRouter>
    </ToastProvider>
  )
}
