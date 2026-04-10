import { BrowserRouter, Routes, Route } from 'react-router-dom'
import Landing from './pages/Landing'
import DiagramPage from './pages/DiagramPage'

export default function App() {
  return (
    <BrowserRouter>
      <Routes>
        <Route path="/" element={<Landing />} />
        <Route path="/diagram/:id" element={<DiagramPage />} />
      </Routes>
    </BrowserRouter>
  )
}
