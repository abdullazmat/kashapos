"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { ShieldCheck, Lock, AlertCircle, Eye, EyeOff } from "lucide-react";

export default function AdminLoginPage() {
  const router = useRouter();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");
    setLoading(true);

    try {
      const res = await fetch("/api/admin/auth/sign-in", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email, password }),
      });

      const data = await res.json();
      if (!res.ok) {
        setError(data.error || "Login failed");
        return;
      }

      router.push("/admin");
    } catch {
      setError("An error occurred during sign in.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-[#0F172A] relative overflow-hidden px-4">
      {/* Decorative background elements */}
      <div className="absolute top-0 right-0 h-[250px] w-[250px] -mr-32 -mt-32 rounded-full bg-orange-500/10 blur-[80px] sm:h-[500px] sm:w-[500px] sm:-mr-64 sm:-mt-64 sm:blur-[120px]" />
      <div className="absolute bottom-0 left-0 h-[250px] w-[250px] -mb-32 -ml-32 rounded-full bg-amber-500/5 blur-[80px] sm:h-[500px] sm:w-[500px] sm:-mb-64 sm:-ml-64 sm:blur-[120px]" />

      <div className="w-full max-w-[420px] relative z-10">
        <div className="text-center mb-10">
          <div className="flex items-center justify-center gap-2.5 mb-6 group transition-all">
            <div className="w-12 h-12 bg-orange-600 rounded-2xl flex items-center justify-center shadow-lg shadow-orange-500/20 group-hover:scale-105 transition-transform duration-300">
              <ShieldCheck className="w-7 h-7 text-white" />
            </div>
            <span className="text-2xl font-bold text-white tracking-tight">
              SaaS <span className="text-orange-500">Master</span>
            </span>
          </div>
          <h1 className="text-2xl font-bold text-white">
            Platform Administration
          </h1>
          <p className="text-slate-400 text-sm mt-2">
            Enter credentials to access the master dashboard.
          </p>
        </div>

        <div className="bg-slate-900/40 backdrop-blur-xl border border-slate-800 rounded-2xl p-8 shadow-2xl">
          {error && (
            <div className="mb-6 p-3 rounded-lg bg-red-500/10 border border-red-500/20 text-red-400 text-sm flex items-center gap-2">
              <AlertCircle className="w-4 h-4 flex-shrink-0" />
              {error}
            </div>
          )}

          <form onSubmit={handleSubmit} className="space-y-5">
            <div>
              <label className="block text-sm font-medium text-slate-300 mb-2">
                Admin Email
              </label>
              <div className="relative">
                <input
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  className="w-full bg-slate-950/50 border border-slate-800 rounded-xl px-4 py-3 text-sm text-white focus:outline-none focus:ring-2 focus:ring-orange-500/50 focus:border-orange-500 transition-all"
                  placeholder="admin@kashapos.com"
                  required
                />
              </div>
            </div>

            <div>
              <label className="block text-sm font-medium text-slate-300 mb-2">
                Security Key
              </label>
              <div className="relative">
                <input
                  type={showPassword ? "text" : "password"}
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  className="w-full bg-slate-950/50 border border-slate-800 rounded-xl px-4 py-3 text-sm text-white focus:outline-none focus:ring-2 focus:ring-orange-500/50 focus:border-orange-500 transition-all pr-12"
                  placeholder="••••••••"
                  required
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute right-4 top-1/2 -translate-y-1/2 text-slate-500 hover:text-slate-300 transition-colors"
                >
                  {showPassword ? (
                    <EyeOff className="w-4 h-4" />
                  ) : (
                    <Eye className="w-4 h-4" />
                  )}
                </button>
              </div>
            </div>

            <button
              type="submit"
              disabled={loading}
              className="w-full bg-orange-600 hover:bg-orange-500 text-white font-semibold py-3.5 rounded-xl transition-all shadow-lg shadow-orange-600/20 disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
            >
              <Lock className="w-4 h-4" />
              {loading ? "Authenticating..." : "Sign In to Master Console"}
            </button>
          </form>
        </div>

        <p className="mt-10 text-center text-slate-500 text-xs">
          This is a restricted area. All access attempts are logged.
          <br />
          &copy; {new Date().getFullYear()} KashaPOS Platform.
        </p>
      </div>
    </div>
  );
}
