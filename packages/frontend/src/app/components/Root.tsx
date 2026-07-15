// import { Outlet, Link, useLocation } from "react-router";
// import { Activity, Bell, User, FlaskConical, BarChart3, FileText, LayoutDashboard } from "lucide-react";

// export function Root() {
//   const location = useLocation();

//   const isActive = (path: string) => {
//     if (path === '/dashboard' && location.pathname === '/dashboard') return true;
//     if (path !== '/dashboard' && location.pathname.startsWith(path)) return true;
//     return false;
//   };

//   return (
//     <div className="flex h-screen bg-slate-50">
//       {/* Sidebar - Deep Clinical Navy */}
//       <div className="w-[90px] bg-[#0f172a] flex flex-col items-center py-8 relative shadow-2xl border-r border-slate-800">
        
//         {/* Logo - Professional Blue instead of Alert Orange */}
//         <div className="mb-12">
//           <div className="w-11 h-11 rounded-xl bg-gradient-to-br from-blue-500 to-cyan-400 flex items-center justify-center shadow-lg shadow-blue-500/20">
//             <Activity className="w-6 h-6 text-white" />
//           </div>
//         </div>

//         {/* Navigation Icons - Subtle Blue Active States */}
//         <nav className="flex-1 flex flex-col gap-4 w-full px-3">
//           <NavIcon to="/dashboard" icon={LayoutDashboard} active={isActive('/dashboard') && location.pathname === '/dashboard'} />
//           <NavIcon to="/dashboard/alerts" icon={Bell} active={isActive('/dashboard/alerts')} hasBadge={true} />
//           <NavIcon to="/dashboard/wards" icon={User} active={isActive('/dashboard/wards') || isActive('/dashboard/patient') || isActive('/dashboard/ward')} />
//           <NavIcon to="/dashboard/simulation" icon={FlaskConical} active={isActive('/dashboard/simulation')} />
//           <NavIcon to="/dashboard/analytics" icon={BarChart3} active={isActive('/dashboard/analytics')} />
//           <NavIcon to="/dashboard/audit" icon={FileText} active={isActive('/dashboard/audit')} />
//         </nav>

//         {/* Profile at bottom */}
//         <Link
//           to="/dashboard/profile"
//           className={`w-10 h-10 rounded-full flex items-center justify-center text-sm font-bold mt-auto transition-all shadow-md ${
//             isActive('/dashboard/profile') 
//               ? 'bg-blue-500 text-white ring-2 ring-blue-400/50' 
//               : 'bg-slate-800 text-slate-300 hover:bg-slate-700 hover:text-white'
//           }`}
//         >
//           SG
//         </Link>
//       </div>

//       {/* Main Content */}
//       <div className="flex-1 overflow-auto h-screen relative">
//         <Outlet />
//       </div>
//     </div>
//   );
// }

// // Helper component for cleaner Nav items
// function NavIcon({ to, icon: Icon, active, hasBadge }: { to: string, icon: any, active: boolean, hasBadge?: boolean }) {
//   return (
//     <Link
//       to={to}
//       className={`relative w-full aspect-square rounded-xl flex items-center justify-center transition-all duration-200 group ${
//         active 
//           ? 'bg-blue-500/15 text-blue-400 shadow-inner' 
//           : 'text-slate-400 hover:bg-slate-800 hover:text-slate-200'
//       }`}
//     >
//       {active && <div className="absolute left-0 top-1/2 -translate-y-1/2 w-1 h-1/2 bg-blue-400 rounded-r-full" />}
//       <Icon className={`w-5 h-5 transition-transform ${active ? 'scale-110' : 'group-hover:scale-110'}`} />
      
//       {/* Alert Notification Dot */}
//       {hasBadge && (
//         <span className="absolute top-2.5 right-3.5 w-2 h-2 rounded-full bg-rose-500 ring-2 ring-[#0f172a]" />
//       )}
//     </Link>
//   );
// }


import { useEffect, useState } from "react";
import { Outlet, Link, useLocation } from "react-router";
import {
  Activity,
  Bell,
  User,
  FlaskConical,
  BarChart3,
  FileText,
  LayoutDashboard,
  Users as UsersIcon,
} from "lucide-react";
import { AuthProvider, useAuth } from "../context/AuthContext";
import { alertsApi } from "../../api/alerts";

/* ============================================================
   ARIA app shell — same routes, upgraded sidebar:
   hover tooltips, grouped nav, live clock, system-live pulse.
   Requires: src/styles/aria-theme.css imported globally.
   ============================================================ */

export function Root() {
  return (
    <AuthProvider>
      <RootLayout />
    </AuthProvider>
  );
}

function RootLayout() {
  const location = useLocation();
  const { user } = useAuth();

  // Alert Center badge — lit only while there are active alerts
  const [hasActiveAlerts, setHasActiveAlerts] = useState(false);
  useEffect(() => {
    let cancelled = false;
    const check = async () => {
      try {
        const alerts = await alertsApi.getAll("active");
        if (!cancelled) setHasActiveAlerts(alerts.length > 0);
      } catch {
        // keep last known state on transient failures
      }
    };
    check();
    const id = setInterval(check, 60000);
    return () => {
      cancelled = true;
      clearInterval(id);
    };
  }, []);

  const isActive = (path: string) => {
    if (path === "/dashboard" && location.pathname === "/dashboard") return true;
    if (path !== "/dashboard" && location.pathname.startsWith(path)) return true;
    return false;
  };

  return (
    <div className="flex h-screen bg-slate-50 font-body">
      {/* Sidebar */}
      <div className="w-[90px] bg-[#0f172a] flex flex-col items-center py-6 relative shadow-2xl border-r border-slate-800 z-30">
        {/* Logo */}
        <Link
          to="/dashboard"
          className="mb-8 group relative"
          title="ARIA — Automated Risk & Intervention Assistant"
        >
          <div className="w-11 h-11 rounded-xl bg-gradient-to-br from-blue-500 to-cyan-400 flex items-center justify-center shadow-lg shadow-blue-500/25 transition-transform group-hover:scale-105">
            <Activity className="w-6 h-6 text-white" />
          </div>
        </Link>

        {/* System status */}
        <div className="flex items-center gap-1.5 mb-6 px-2 py-1 rounded-full bg-slate-800/80 border border-slate-700/60">
          <span className="w-1.5 h-1.5 rounded-full bg-teal-400 aria-blink" />
          <span className="font-tele text-[8px] tracking-widest text-slate-400">LIVE</span>
        </div>

        {/* Navigation */}
        <nav className="flex-1 flex flex-col gap-2 w-full px-3">
          <NavIcon
            to="/dashboard"
            icon={LayoutDashboard}
            label="Dashboard"
            active={isActive("/dashboard") && location.pathname === "/dashboard"}
          />
          <NavIcon
            to="/dashboard/alerts"
            icon={Bell}
            label="Alert Center"
            active={isActive("/dashboard/alerts")}
            hasBadge={hasActiveAlerts}
          />
          <NavIcon
            to="/dashboard/wards"
            icon={User}
            label="Wards & Patients"
            active={
              isActive("/dashboard/wards") ||
              isActive("/dashboard/patient") ||
              isActive("/dashboard/ward")
            }
          />

          <div className="h-px bg-slate-800 mx-2 my-2" />

          <NavIcon
            to="/dashboard/simulation"
            icon={FlaskConical}
            label="Training Sandbox"
            active={isActive("/dashboard/simulation")}
          />

          {(user?.role === "admin" || user?.role === "senior") && (
            <NavIcon
              to="/dashboard/analytics"
              icon={BarChart3}
              label="Admin Analytics"
              active={isActive("/dashboard/analytics")}
            />
          )}

          {user?.role === "admin" && (
            <NavIcon
              to="/dashboard/staff"
              icon={UsersIcon}
              label="Staff Management"
              active={isActive("/dashboard/staff")}
            />
          )}

          {user?.role === "admin" && (
            <NavIcon
              to="/dashboard/audit"
              icon={FileText}
              label="Audit Trail"
              active={isActive("/dashboard/audit")}
            />
          )}
        </nav>

        {/* Profile */}
        <Link
          to="/dashboard/profile"
          className={`w-10 h-10 rounded-full flex items-center justify-center text-sm font-bold transition-all shadow-md ${
            isActive("/dashboard/profile")
              ? "bg-blue-500 text-white ring-2 ring-blue-400/50"
              : "bg-slate-800 text-slate-300 hover:bg-slate-700 hover:text-white"
          }`}
        >
          {user ? user.name.substring(0, 2).toUpperCase() : '..'}
        </Link>
      </div>

      {/* Main content */}
      <div className="flex-1 overflow-auto h-screen relative">
        <Outlet />
      </div>
    </div>
  );
}

function NavIcon({
  to,
  icon: Icon,
  label,
  active,
  hasBadge,
}: {
  to: string;
  icon: any;
  label: string;
  active: boolean;
  hasBadge?: boolean;
}) {
  return (
    <Link
      to={to}
      aria-label={label}
      className={`relative w-full aspect-square rounded-xl flex items-center justify-center transition-all duration-200 group ${
        active
          ? "bg-blue-500/15 text-blue-400 shadow-inner"
          : "text-slate-400 hover:bg-slate-800 hover:text-slate-200"
      }`}
    >
      {active && (
        <div className="absolute left-0 top-1/2 -translate-y-1/2 w-1 h-1/2 bg-blue-400 rounded-r-full" />
      )}
      <Icon
        className={`w-5 h-5 transition-transform ${
          active ? "scale-110" : "group-hover:scale-110"
        }`}
      />

      {hasBadge && (
        <span className="absolute top-2.5 right-3.5 w-2 h-2 rounded-full bg-rose-500 ring-2 ring-[#0f172a]" />
      )}

      {/* Tooltip */}
      <span className="pointer-events-none absolute left-[calc(100%+12px)] top-1/2 -translate-y-1/2 whitespace-nowrap rounded-lg bg-slate-900 border border-slate-700 px-3 py-1.5 text-xs font-bold text-slate-200 shadow-xl opacity-0 -translate-x-1 transition-all duration-150 group-hover:opacity-100 group-hover:translate-x-0 z-50">
        {label}
      </span>
    </Link>
  );
}
