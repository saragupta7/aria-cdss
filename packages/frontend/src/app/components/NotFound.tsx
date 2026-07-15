import { Link } from "react-router";
import { Activity, ArrowLeft } from "lucide-react";

// Catch-all 404 — shown for any route that doesn't exist.
export function NotFound() {
  return (
    <div className="min-h-screen flex items-center justify-center bg-slate-50 px-6 font-body">
      <div className="text-center">
        <div className="inline-flex items-center gap-3 mb-8">
          <div className="w-9 h-9 rounded-xl bg-gradient-to-br from-blue-500 to-cyan-400 flex items-center justify-center">
            <Activity className="w-5 h-5 text-white" />
          </div>
          <span className="font-display text-lg font-bold text-slate-900">ARIA</span>
        </div>
        <p className="font-tele text-6xl font-bold text-slate-300 mb-4">404</p>
        <h1 className="font-display text-2xl font-bold text-slate-900 mb-2">Page not found</h1>
        <p className="text-slate-500 font-medium mb-8">
          The page you're looking for doesn't exist or has moved.
        </p>
        <Link
          to="/dashboard"
          className="inline-flex items-center gap-2 px-6 py-3 rounded-xl bg-blue-500 hover:bg-blue-400 text-white font-bold text-sm transition-colors shadow-lg shadow-blue-500/20"
        >
          <ArrowLeft className="w-4 h-4" /> Back to dashboard
        </Link>
      </div>
    </div>
  );
}
