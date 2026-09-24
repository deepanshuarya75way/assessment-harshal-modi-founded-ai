import { Routes, Route, Navigate } from 'react-router-dom'
import { AuthProvider } from './context/AuthContext'
import ProtectedRoute from './components/ProtectedRoute'
import Layout from './components/Layout'
import Login from './pages/Login'
import Register from './pages/Register'
import Dashboard from './pages/Dashboard'
import Inventory from './pages/Inventory'
import Sales from './pages/Sales'
import Suppliers from './pages/Suppliers'
import PurchaseOrders from './pages/PurchaseOrders'
import Forecasts from './pages/Forecasts'
import Analytics from './pages/Analytics'
import Copilot from './pages/Copilot'
import Alerts from './pages/Alerts'
import Settings from './pages/Settings'

export default function App() {
  return (
    <AuthProvider>
      <Routes>
        {/* Public routes */}
        <Route path="/login"    element={<Login />}    />
        <Route path="/register" element={<Register />} />

        {/* Protected routes with sidebar layout */}
        <Route element={<ProtectedRoute><Layout /></ProtectedRoute>}>
          <Route path="/dashboard"       element={<Dashboard />}      />
          <Route path="/inventory"       element={<Inventory />}      />
          <Route path="/sales"           element={<Sales />}          />
          <Route path="/suppliers"       element={<Suppliers />}      />
          <Route path="/purchase-orders" element={<PurchaseOrders />} />
          <Route path="/forecasts"       element={<Forecasts />}      />
          <Route path="/analytics"       element={<Analytics />}      />
          <Route path="/copilot"         element={<Copilot />}        />
          <Route path="/alerts"          element={<Alerts />}         />
          <Route path="/settings"        element={<Settings />}       />
        </Route>

        {/* Default redirect */}
        <Route path="/"  element={<Navigate to="/dashboard" replace />} />
        <Route path="*"  element={<Navigate to="/dashboard" replace />} />
      </Routes>
    </AuthProvider>
  )
}
