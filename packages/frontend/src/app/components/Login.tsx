import { Link, useNavigate } from "react-router";
import { Activity, Mail, Lock, Loader2, AlertCircle } from "lucide-react";
import { useState } from "react";
// 1. Import your API function from the shared package
import { authApi } from "../../api/auth";

export function Login() {
  const navigate = useNavigate();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  
  // 2. Add loading and error states for the network request
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null); 
    setIsLoading(true); 

    try {
      // Pass them as two separate arguments to match your auth.ts
      await authApi.login(email, password);
      
      // We removed the localStorage line here because your auth.ts is already doing it!

      // Navigate to the ICU dashboard
      navigate("/dashboard");
      
    } catch (err: any) {
      console.error("Login Error:", err);
      setError(
        err.response?.data?.message || 
        "Failed to authenticate. Please check your credentials."
      );
    } finally {
      setIsLoading(false); 
    }
  
  };

  return (
    <div className="min-h-screen bg-vibrant-mesh relative overflow-hidden flex items-center justify-center">
      <div className="relative z-10 w-full max-w-md mx-4">
        <div className="bg-white/85 backdrop-blur-2xl rounded-3xl shadow-[0_8px_32px_rgba(0,0,0,0.08)] border border-white/60 p-10">
          
          <div className="text-center mb-8">
            <div className="inline-flex items-center justify-center w-16 h-16 rounded-full bg-gradient-to-br from-[#f07e4d] to-[#e85d22] mb-4 shadow-sm border border-white/50">
              <Activity className="w-8 h-8 text-white" />
            </div>
            <h1 className="text-3xl font-bold text-gray-800 mb-2">Welcome to ARIA</h1>
            <p className="text-gray-500 font-medium">Sign in to access your dashboard</p>
          </div>

          {/* Conditional Error Alert Banner */}
          {error && (
            <div className="mb-6 p-4 rounded-xl bg-red-50 border border-red-100 flex items-start gap-3">
              <AlertCircle className="w-5 h-5 text-red-500 shrink-0 mt-0.5" />
              <p className="text-sm font-medium text-red-800">{error}</p>
            </div>
          )}

          <form onSubmit={handleSubmit} className="space-y-5">
            <div>
              <label htmlFor="email" className="block text-sm font-semibold text-gray-700 mb-2">
                Email Address
              </label>
              <div className="relative">
                <Mail className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" />
                <input
                  id="email"
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  disabled={isLoading}
                  className="w-full pl-12 pr-4 py-3 bg-white/60 border border-gray-200/80 rounded-xl focus:ring-2 focus:ring-[#f07e4d] focus:border-transparent outline-none transition-all placeholder:text-gray-400 disabled:opacity-50"
                  placeholder="Enter your email"
                  required
                />
              </div>
            </div>

            <div>
              <label htmlFor="password" className="block text-sm font-semibold text-gray-700 mb-2">
                Password
              </label>
              <div className="relative">
                <Lock className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" />
                <input
                  id="password"
                  type="password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  disabled={isLoading}
                  className="w-full pl-12 pr-4 py-3 bg-white/60 border border-gray-200/80 rounded-xl focus:ring-2 focus:ring-[#f07e4d] focus:border-transparent outline-none transition-all placeholder:text-gray-400 disabled:opacity-50"
                  placeholder="Enter your password"
                  required
                />
              </div>
            </div>

            <div className="flex items-center justify-between text-sm mt-2">
              <label className="flex items-center cursor-pointer">
                <input type="checkbox" disabled={isLoading} className="w-4 h-4 rounded border-gray-300 text-[#f07e4d] focus:ring-[#f07e4d] disabled:opacity-50" />
                <span className="ml-2 text-gray-600 font-medium">Remember me</span>
              </label>
              <a href="#forgot" className="text-[#e85d22] hover:text-[#f07e4d] transition-colors font-semibold">
                Forgot password?
              </a>
            </div>

            <button
              type="submit"
              disabled={isLoading}
              className="w-full mt-2 bg-gradient-to-r from-[#f07e4d] to-[#e85d22] text-white py-3.5 rounded-xl font-semibold tracking-wide hover:shadow-lg hover:scale-[1.02] transition-all border border-white/20 disabled:opacity-70 disabled:hover:scale-100 flex items-center justify-center gap-2"
            >
              {/* Toggle between spinner and text based on loading state */}
              {isLoading ? (
                <>
                  <Loader2 className="w-5 h-5 animate-spin" />
                  Authenticating...
                </>
              ) : (
                "Sign In"
              )}
            </button>
          </form>

          <div className="relative my-6">
            <div className="absolute inset-0 flex items-center">
              <div className="w-full border-t border-gray-200"></div>
            </div>
            <div className="relative flex justify-center text-sm">
              <span className="px-4 bg-transparent text-gray-400 font-medium">or continue with</span>
            </div>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <button disabled={isLoading} className="flex items-center justify-center px-4 py-2.5 bg-white/60 border border-gray-200/80 rounded-xl hover:bg-white/90 transition-colors shadow-sm disabled:opacity-50">
              <svg className="w-5 h-5 mr-2" viewBox="0 0 24 24">
                <path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"/>
                <path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"/>
                <path fill="#FBBC05" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"/>
                <path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"/>
              </svg>
              <span className="text-sm font-semibold text-gray-700">Google</span>
            </button>
            <button disabled={isLoading} className="flex items-center justify-center px-4 py-2.5 bg-white/60 border border-gray-200/80 rounded-xl hover:bg-white/90 transition-colors shadow-sm disabled:opacity-50">
              <svg className="w-5 h-5 mr-2" fill="#1877F2" viewBox="0 0 24 24">
                <path d="M24 12.073c0-6.627-5.373-12-12-12s-12 5.373-12 12c0 5.99 4.388 10.954 10.125 11.854v-8.385H7.078v-3.47h3.047V9.43c0-3.007 1.792-4.669 4.533-4.669 1.312 0 2.686.235 2.686.235v2.953H15.83c-1.491 0-1.956.925-1.956 1.874v2.25h3.328l-.532 3.47h-2.796v8.385C19.612 23.027 24 18.062 24 12.073z"/>
              </svg>
              <span className="text-sm font-semibold text-gray-700">Facebook</span>
            </button>
          </div>

          <div className="mt-8 text-center text-sm text-gray-600">
            Don't have an account?{" "}
            <a href="#signup" className="text-[#e85d22] hover:text-[#f07e4d] font-bold transition-colors">
              Sign up
            </a>
          </div>

          <div className="mt-5 text-center">
            <Link to="/" className="text-sm font-medium text-gray-500 hover:text-gray-800 transition-colors">
              ← Back to home
            </Link>
          </div>
        </div>
      </div>
    </div>
  );
}