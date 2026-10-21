import { BrowserRouter, Routes, Route } from "react-router-dom";
import { AuthProvider } from "./context/AuthContext";
import ProtectedRoute from "./components/common/ProtectedRoute";
import AppShell from "./components/layout/AppShell";

import Login from "./pages/Login";
import Dashboard from "./pages/Dashboard";
import SendPayment from "./pages/SendPayment";
import Wallet from "./pages/Wallet";
import Transactions from "./pages/Transactions";
import OfflinePackets from "./pages/OfflinePackets";
import MeshNetwork from "./pages/MeshNetwork";
import Reconciliation from "./pages/Reconciliation";
import NotFound from "./pages/NotFound";

import "./App.css";

function App() {
  return (
    <AuthProvider>
      <BrowserRouter>
        <Routes>
          {/* Public Auth Route */}
          <Route path="/login" element={<Login />} />

          {/* Protected Application Routes */}
          <Route element={<ProtectedRoute />}>
            <Route element={<AppShell />}>
              <Route path="/" element={<Dashboard />} />
              <Route path="/send" element={<SendPayment />} />
              <Route path="/wallet" element={<Wallet />} />
              <Route path="/transactions" element={<Transactions />} />
              <Route path="/packets" element={<OfflinePackets />} />
              <Route path="/mesh" element={<MeshNetwork />} />
              <Route path="/reconciliation" element={<Reconciliation />} />
              <Route path="*" element={<NotFound />} />
            </Route>
          </Route>
        </Routes>
      </BrowserRouter>
    </AuthProvider>
  );
}

export default App;
