"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import {
  ShoppingCart,
  Eye,
  EyeOff,
  Phone,
  Mail,
  MessageCircle,
  CheckCircle2,
  AlertCircle,
} from "lucide-react";

export default function SignInPage() {
  const router = useRouter();
  const [loginMethod, setLoginMethod] = useState<
    "email" | "phone" | "whatsapp"
  >("email");
  const [email, setEmail] = useState("");
  const [phone, setPhone] = useState("");
  const [countryCode, setCountryCode] = useState("+256");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  const countryCodes = [
    { code: "+256", country: "UG", flag: "🇺🇬" },
    { code: "+254", country: "KE", flag: "🇰🇪" },
    { code: "+255", country: "TZ", flag: "🇹🇿" },
    { code: "+250", country: "RW", flag: "🇷🇼" },
    { code: "+257", country: "BI", flag: "🇧🇮" },
    { code: "+243", country: "CD", flag: "🇨🇩" },
    { code: "+211", country: "SS", flag: "🇸🇸" },
    { code: "+234", country: "NG", flag: "🇳🇬" },
    { code: "+233", country: "GH", flag: "🇬🇭" },
    { code: "+27", country: "ZA", flag: "🇿🇦" },
    { code: "+1", country: "US", flag: "🇺🇸" },
    { code: "+44", country: "UK", flag: "🇬🇧" },
  ];

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");
    setLoading(true);

    try {
      const payload: Record<string, string> = { password };
      if (loginMethod === "email") {
        payload.email = email;
      } else {
        // Combine country code with phone number
        const fullPhone = countryCode + phone.replace(/^0+/, "");
        payload.phone = fullPhone;
      }

      const res = await fetch("/api/auth/sign-in", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });

      const data = await res.json();
      if (!res.ok) {
        setError(data.error || "Sign in failed");
        return;
      }

      router.push("/dashboard");
    } catch {
      setError("Something went wrong. Please try again.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex bg-[#FFF8F0]">
      {/* Left panel - branding */}
      <div className="hidden lg:flex lg:w-1/2 bg-orange-500 relative overflow-hidden items-center justify-center p-12">
        <div className="relative z-10 max-w-md">
          <div className="flex items-center gap-2 mb-8">
            <div className="w-10 h-10 bg-white/20 rounded-lg flex items-center justify-center">
              <ShoppingCart className="w-6 h-6 text-white" />
            </div>
            <span className="text-2xl font-bold text-white">Meka PoS</span>
          </div>
          <h2 className="text-3xl font-bold text-white mb-4">
            Welcome back to your business command center
          </h2>
          <p className="text-orange-100 text-lg mb-8">
            Access sales, inventory, and reports from anywhere.
          </p>
          <div className="space-y-4">
            {[
              "Sign in with email, phone, or WhatsApp",
              "Real-time business dashboard",
              "Login notifications for security",
              "Multi-branch access",
            ].map((f, i) => (
              <div key={i} className="flex items-center gap-3 text-white">
                <CheckCircle2 className="w-5 h-5 text-orange-200" />
                <span className="text-sm">{f}</span>
              </div>
            ))}
          </div>
        </div>
        <div className="absolute inset-0 bg-gradient-to-br from-orange-400/50 to-transparent" />
        <div className="absolute -bottom-20 -right-20 w-80 h-80 bg-orange-400 rounded-full opacity-30" />
        <div className="absolute -top-10 -left-10 w-40 h-40 bg-orange-600 rounded-full opacity-20" />
      </div>

      {/* Right panel - form */}
      <div className="flex-1 flex items-center justify-center px-4">
        <div className="w-full max-w-md">
          <div className="text-center mb-8 lg:hidden">
            <Link href="/" className="inline-flex items-center gap-2">
              <div className="w-10 h-10 bg-orange-500 rounded-lg flex items-center justify-center">
                <ShoppingCart className="w-6 h-6 text-white" />
              </div>
              <span className="text-2xl font-bold text-gray-900">Meka PoS</span>
            </Link>
          </div>
          <div className="hidden lg:block mb-6">
            <Link
              href="/"
              className="text-sm text-gray-500 hover:text-orange-600 transition-colors"
            >
              &larr; Back to home
            </Link>
          </div>

          <h1 className="text-2xl font-bold text-gray-900">Welcome back</h1>
          <p className="mt-2 text-sm text-gray-600 mb-6">
            Sign in to your account
          </p>

          <div className="bg-white rounded-2xl shadow-sm border border-gray-200 p-8">
            {error && (
              <div className="mb-4 p-3 rounded-lg bg-red-50 border border-red-200 text-red-700 text-sm flex items-center gap-2">
                <AlertCircle className="w-4 h-4 flex-shrink-0" />
                {error}
              </div>
            )}

            <form onSubmit={handleSubmit} className="space-y-4">
              {/* Login Method Toggle */}
              <div className="flex rounded-xl border overflow-hidden">
                {[
                  { key: "email", icon: Mail, label: "Email" },
                  { key: "phone", icon: Phone, label: "Phone" },
                  { key: "whatsapp", icon: MessageCircle, label: "WhatsApp" },
                ].map((m) => (
                  <button
                    key={m.key}
                    type="button"
                    onClick={() => setLoginMethod(m.key as typeof loginMethod)}
                    className={`flex-1 flex items-center justify-center gap-1.5 py-2.5 text-xs font-medium transition-colors ${
                      loginMethod === m.key
                        ? m.key === "whatsapp"
                          ? "bg-green-500 text-white"
                          : "bg-orange-500 text-white"
                        : "bg-gray-50 text-gray-600 hover:bg-gray-100"
                    }`}
                  >
                    <m.icon className="w-3.5 h-3.5" />
                    {m.label}
                  </button>
                ))}
              </div>

              {loginMethod === "email" ? (
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Email
                  </label>
                  <input
                    type="email"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    className="w-full px-3 py-2.5 border border-gray-300 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-orange-500/30 focus:border-orange-500"
                    placeholder="you@example.com"
                    required
                  />
                </div>
              ) : (
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    <span className="flex items-center gap-1.5">
                      {loginMethod === "whatsapp" && (
                        <MessageCircle className="w-3.5 h-3.5 text-green-600" />
                      )}
                      {loginMethod === "whatsapp"
                        ? "WhatsApp Number"
                        : "Phone Number"}
                    </span>
                  </label>
                  <div className="flex gap-2">
                    <select
                      value={countryCode}
                      onChange={(e) => setCountryCode(e.target.value)}
                      className={`w-28 px-2 py-2.5 border border-gray-300 rounded-xl text-sm focus:outline-none focus:ring-2 ${loginMethod === "whatsapp" ? "focus:ring-green-500/30 focus:border-green-500" : "focus:ring-orange-500/30 focus:border-orange-500"}`}
                    >
                      {countryCodes.map((c) => (
                        <option key={c.code} value={c.code}>
                          {c.flag} {c.code}
                        </option>
                      ))}
                    </select>
                    <input
                      type="tel"
                      value={phone}
                      onChange={(e) => setPhone(e.target.value)}
                      className={`flex-1 px-3 py-2.5 border border-gray-300 rounded-xl text-sm focus:outline-none focus:ring-2 ${loginMethod === "whatsapp" ? "focus:ring-green-500/30 focus:border-green-500" : "focus:ring-orange-500/30 focus:border-orange-500"}`}
                      placeholder="7XX XXX XXX"
                      required
                    />
                  </div>
                  {loginMethod === "whatsapp" && (
                    <p className="mt-1 text-xs text-gray-400">
                      Login alert will be sent to this WhatsApp number
                    </p>
                  )}
                </div>
              )}

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Password
                </label>
                <div className="relative">
                  <input
                    type={showPassword ? "text" : "password"}
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    className="w-full px-3 py-2.5 border border-gray-300 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-orange-500/30 focus:border-orange-500 pr-10"
                    placeholder="••••••••"
                    required
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassword(!showPassword)}
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600"
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
                className="w-full bg-orange-500 text-white py-3 rounded-xl font-medium text-sm hover:bg-orange-600 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {loading ? "Signing in..." : "Sign In"}
              </button>
            </form>

            <div className="mt-6 text-center text-sm text-gray-600">
              Don&apos;t have an account?{" "}
              <Link
                href="/sign-up"
                className="text-orange-600 font-medium hover:underline"
              >
                Start free trial
              </Link>
            </div>
          </div>

          {/* Demo Credentials */}
          <div className="mt-6 bg-orange-50 border border-orange-200 rounded-xl p-4">
            <p className="text-sm font-medium text-orange-900 mb-2">
              Demo Accounts
            </p>
            <div className="space-y-1 text-xs text-orange-800">
              <p>
                <strong>Basic:</strong> basic@poscloud.me / basic123
              </p>
              <p>
                <strong>Pro:</strong> pro@poscloud.com / pro123
              </p>
              <p>
                <strong>Enterprise:</strong> enterprise@poscloud.com /
                enterprise23
              </p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
