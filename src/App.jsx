import { BrowserRouter, Route, Routes } from 'react-router-dom'
import MainLayout from './layouts/MainLayout'

import Admin from './pages/Admin'
import Dashboard from './pages/Dashboard'
import Expediente from './pages/Expediente'
import Login from './pages/Login'
import Pacientes from './pages/Pacientes'

export default function App() {
  return (
    <BrowserRouter>
      <Routes>

        <Route path="/" element={<Login />} />

        <Route element={<MainLayout />}>
          <Route path="/dashboard" element={<Dashboard />} />
          <Route path="/pacientes" element={<Pacientes />} />
          <Route path="/expediente" element={<Expediente />} />
          <Route path="/admin" element={<Admin />} />
        </Route>

      </Routes>
    </BrowserRouter>
  )
}
