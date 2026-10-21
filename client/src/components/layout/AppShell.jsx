import { useState } from "react";
import { NavLink, Outlet, useNavigate } from "react-router-dom";
import useAuth from "../../hooks/useAuth";
import {
  IconDashboard,
  IconSend,
  IconWallet,
  IconTransactions,
  IconPacket,
  IconMesh,
  IconReconcile,
  IconLogout,
} from "../common/Icons";

const navItems = [
  { path: "/", label: "Overview", icon: IconDashboard },
  { path: "/send", label: "Send Payment", icon: IconSend },
  { path: "/wallet", label: "Wallet", icon: IconWallet },
  { path: "/transactions", label: "Transactions", icon: IconTransactions },
  { path: "/packets", label: "Offline Packets", icon: IconPacket },
  { path: "/mesh", label: "Mesh Network", icon: IconMesh },
  { path: "/reconciliation", label: "Reconciliation", icon: IconReconcile },
];

export const AppShell = () => {
  const { user, logout } = useAuth();
  const navigate = useNavigate();
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);

  const handleLogout = async () => {
    await logout();
    navigate("/login");
  };

  return (
    <div className="dashboard-layout">
      {/* Desktop & Tablet Sidebar */}
      <aside className={`dashboard-sidebar ${mobileMenuOpen ? "mobile-open" : ""}`}>
        <div className="sidebar-brand-container">
          <div className="brand-badge">
            <span className="brand-logo-letter">P</span>
            <div className="brand-text-block">
              <span className="brand-title">PayMesh</span>
              <span className="brand-subtitle">Offline Payment Mesh</span>
            </div>
          </div>
          <button
            className="mobile-close-btn"
            onClick={() => setMobileMenuOpen(false)}
            aria-label="Close navigation"
          >
            ✕
          </button>
        </div>

        <nav className="dashboard-nav" aria-label="Main navigation">
          {navItems.map((item) => {
            const IconComponent = item.icon;
            return (
              <NavLink
                key={item.path}
                to={item.path}
                end={item.path === "/"}
                className={({ isActive }) =>
                  `nav-link-btn ${isActive ? "active" : ""}`
                }
                onClick={() => setMobileMenuOpen(false)}
              >
                <span className="nav-link-icon">
                  <IconComponent size={18} />
                </span>
                <span className="nav-link-label">{item.label}</span>
              </NavLink>
            );
          })}
        </nav>

        <div className="sidebar-bottom-panel">
          <div className="network-pill-indicator">
            <span className="live-dot" />
            <span className="indicator-text">Mesh Node Online</span>
          </div>

          <div className="sidebar-user-block">
            <div className="sidebar-avatar">
              {user?.name?.charAt(0).toUpperCase() || "U"}
            </div>
            <div className="sidebar-user-info">
              <span className="sidebar-user-name" title={user?.name}>
                {user?.name || "PayMesh User"}
              </span>
              <span className="sidebar-user-email" title={user?.email}>
                {user?.email}
              </span>
            </div>
            <button
              onClick={handleLogout}
              className="sidebar-logout-btn"
              title="Sign out of PayMesh"
              aria-label="Sign out"
            >
              <IconLogout size={16} />
            </button>
          </div>
        </div>
      </aside>

      {/* Main Content Area */}
      <div className="dashboard-content-area">
        {/* Mobile Top Header */}
        <header className="mobile-top-bar">
          <button
            className="mobile-menu-trigger"
            onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
            aria-label="Toggle navigation menu"
          >
            <span className="hamburger-bar" />
            <span className="hamburger-bar" />
            <span className="hamburger-bar" />
          </button>
          <div className="mobile-brand">
            <span className="brand-logo-letter-sm">P</span>
            <span className="brand-title-sm">PayMesh</span>
          </div>
          <div className="mobile-avatar">
            {user?.name?.charAt(0).toUpperCase() || "U"}
          </div>
        </header>

        {/* Primary Page Container */}
        <main className="dashboard-page-outlet" id="main-content">
          <Outlet />
        </main>
      </div>
    </div>
  );
};

export default AppShell;
