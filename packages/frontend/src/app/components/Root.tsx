import { Outlet, Link, useLocation } from "react-router";
import { Activity, Bell, User, FlaskConical, BarChart3, FileText, LayoutDashboard } from "lucide-react";

export function Root() {
  const location = useLocation();

  const isActive = (path: string) => {
    if (path === '/dashboard' && location.pathname === '/dashboard') return true;
    if (path !== '/dashboard' && location.pathname.startsWith(path)) return true;
    return false;
  };

  return (
    <div className="flex h-screen bg-slate-50">
      {/* Sidebar - Deep Clinical Navy */}
      <div className="w-[90px] bg-[#0f172a] flex flex-col items-center py-8 relative shadow-2xl border-r border-slate-800">
        
        {/* Logo - Professional Blue instead of Alert Orange */}
        <div className="mb-12">
          <div className="w-11 h-11 rounded-xl bg-gradient-to-br from-blue-500 to-cyan-400 flex items-center justify-center shadow-lg shadow-blue-500/20">
            <Activity className="w-6 h-6 text-white" />
          </div>
        </div>

        {/* Navigation Icons - Subtle Blue Active States */}
        <nav className="flex-1 flex flex-col gap-4 w-full px-3">
          <NavIcon to="/dashboard" icon={LayoutDashboard} active={isActive('/dashboard') && location.pathname === '/dashboard'} />
          <NavIcon to="/dashboard/alerts" icon={Bell} active={isActive('/dashboard/alerts')} hasBadge={true} />
          <NavIcon to="/dashboard/wards" icon={User} active={isActive('/dashboard/wards') || isActive('/dashboard/patient') || isActive('/dashboard/ward')} />
          <NavIcon to="/dashboard/simulation" icon={FlaskConical} active={isActive('/dashboard/simulation')} />
          <NavIcon to="/dashboard/analytics" icon={BarChart3} active={isActive('/dashboard/analytics')} />
          <NavIcon to="/dashboard/audit" icon={FileText} active={isActive('/dashboard/audit')} />
        </nav>

        {/* Profile at bottom */}
        <Link
          to="/dashboard/profile"
          className={`w-10 h-10 rounded-full flex items-center justify-center text-sm font-bold mt-auto transition-all shadow-md ${
            isActive('/dashboard/profile') 
              ? 'bg-blue-500 text-white ring-2 ring-blue-400/50' 
              : 'bg-slate-800 text-slate-300 hover:bg-slate-700 hover:text-white'
          }`}
        >
          SG
        </Link>
      </div>

      {/* Main Content */}
      <div className="flex-1 overflow-auto h-screen relative">
        <Outlet />
      </div>
    </div>
  );
}

// Helper component for cleaner Nav items
function NavIcon({ to, icon: Icon, active, hasBadge }: { to: string, icon: any, active: boolean, hasBadge?: boolean }) {
  return (
    <Link
      to={to}
      className={`relative w-full aspect-square rounded-xl flex items-center justify-center transition-all duration-200 group ${
        active 
          ? 'bg-blue-500/15 text-blue-400 shadow-inner' 
          : 'text-slate-400 hover:bg-slate-800 hover:text-slate-200'
      }`}
    >
      {active && <div className="absolute left-0 top-1/2 -translate-y-1/2 w-1 h-1/2 bg-blue-400 rounded-r-full" />}
      <Icon className={`w-5 h-5 transition-transform ${active ? 'scale-110' : 'group-hover:scale-110'}`} />
      
      {/* Alert Notification Dot */}
      {hasBadge && (
        <span className="absolute top-2.5 right-3.5 w-2 h-2 rounded-full bg-rose-500 ring-2 ring-[#0f172a]" />
      )}
    </Link>
  );
}