"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import {
  ShoppingCart,
  Eye,
  EyeOff,
  Mail,
  Phone,
  MessageCircle,
  CheckCircle2,
  AlertCircle,
} from "lucide-react";

function validateEmail(email: string) {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email);
}

function validatePhone(phone: string) {
  return /^\+?[1-9]\d{6,14}$/.test(phone.replace(/[\s\-()]/g, ""));
}

export default function SignUpPage() {
  const router = useRouter();
  const [signupMethod, setSignupMethod] = useState<
    "email" | "phone" | "whatsapp"
  >("email");
  const [form, setForm] = useState({
    businessName: "",
    name: "",
    email: "",
    password: "",
    phone: "",
    whatsapp: "",
    saasProduct: "retail",
  });
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState("");
  const [fieldErrors, setFieldErrors] = useState<Record<string, string>>({});
  const [loading, setLoading] = useState(false);

  const validateForm = () => {
    const errors: Record<string, string> = {};
    if (!form.businessName.trim())
      errors.businessName = "Business name is required";
    if (!form.name.trim()) errors.name = "Name is required";

    if (signupMethod === "email") {
      if (!form.email) errors.email = "Email is required";
      else if (!validateEmail(form.email))
        errors.email = "Please enter a valid email address";
    }

    if (signupMethod === "phone") {
      if (!form.phone) errors.phone = "Phone number is required";
      else if (!validatePhone(form.phone))
        errors.phone =
          "Please enter a valid phone number (e.g., +256700000000)";
    }

    if (signupMethod === "whatsapp") {
      if (!form.whatsapp) errors.whatsapp = "WhatsApp number is required";
      else if (!validatePhone(form.whatsapp))
        errors.whatsapp =
          "Please enter a valid WhatsApp number (e.g., +256700000000)";
    }

    if (!form.password || form.password.length < 6)
      errors.password = "Password must be at least 6 characters";

    // Cross-validate: if email provided in any method, validate it
    if (form.email && !validateEmail(form.email))
      errors.email = "Please enter a valid email address";
    if (form.phone && !validatePhone(form.phone))
      errors.phone = "Please enter a valid phone number";

    setFieldErrors(errors);
    return Object.keys(errors).length === 0;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");

    if (!validateForm()) return;

    setLoading(true);

    try {
      const payload = {
        ...form,
        phone: signupMethod === "whatsapp" ? form.whatsapp : form.phone,
        signupMethod,
      };
      const res = await fetch("/api/auth/sign-up", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });

      const data = await res.json();
      if (!res.ok) {
        setError(data.error || "Registration failed");
        return;
      }

      router.push("/dashboard");
    } catch {
      setError("Something went wrong. Please try again.");
    } finally {
      setLoading(false);
    }
  };

  const FieldError = ({ field }: { field: string }) => {
    if (!fieldErrors[field]) return null;
    return (
      <p className="mt-1 text-xs text-red-600 flex items-center gap-1">
        <AlertCircle className="w-3 h-3" />
        {fieldErrors[field]}
      </p>
    );
  };

  return (
    <div className="min-h-screen flex bg-[#FFF8F0]">
      {/* Left side - branding */}
      <div className="hidden lg:flex lg:w-1/2 bg-orange-500 relative overflow-hidden items-center justify-center p-12">
        <div className="relative z-10 max-w-md">
          <div className="flex items-center gap-2 mb-8">
            <div className="w-10 h-10 bg-white/20 rounded-lg flex items-center justify-center">
              <ShoppingCart className="w-6 h-6 text-white" />
            </div>
            <span className="text-2xl font-bold text-white">Meka PoS</span>
          </div>
          <h2 className="text-3xl font-bold text-white mb-4">
            Start managing your business today
          </h2>
          <p className="text-orange-100 text-lg mb-8">
            Join hundreds of businesses using Meka PoS to grow their operations.
          </p>
          <div className="space-y-4">
            {[
              "14-day free trial, no credit card",
              "Multi-branch & role-based access",
              "WhatsApp notifications & receipts",
              "Mobile money & credit payments",
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

      {/* Right side - form */}
      <div className="flex-1 flex items-center justify-center px-4 py-12">
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

          <h1 className="text-2xl font-bold text-gray-900">
            Create your account
          </h1>
          <p className="mt-2 text-sm text-gray-600 mb-6">
            Start your 14-day free trial
          </p>

          <div className="bg-white rounded-2xl shadow-sm border border-gray-200 p-8">
            {error && (
              <div className="mb-4 p-3 rounded-lg bg-red-50 border border-red-200 text-red-700 text-sm flex items-center gap-2">
                <AlertCircle className="w-4 h-4 flex-shrink-0" />
                {error}
              </div>
            )}

            {/* Signup Method Toggle */}
            <div className="flex rounded-xl border overflow-hidden mb-6">
              {[
                { key: "email", icon: Mail, label: "Email" },
                { key: "phone", icon: Phone, label: "Phone" },
                { key: "whatsapp", icon: MessageCircle, label: "WhatsApp" },
              ].map((m) => (
                <button
                  key={m.key}
                  type="button"
                  onClick={() => {
                    setSignupMethod(m.key as typeof signupMethod);
                    setFieldErrors({});
                  }}
                  className={`flex-1 flex items-center justify-center gap-1.5 py-2.5 text-xs font-medium transition-colors ${
                    signupMethod === m.key
                      ? "bg-orange-500 text-white"
                      : "bg-gray-50 text-gray-600 hover:bg-gray-100"
                  }`}
                >
                  <m.icon className="w-3.5 h-3.5" />
                  {m.label}
                </button>
              ))}
            </div>

            <form onSubmit={handleSubmit} className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Business Name
                </label>
                <input
                  type="text"
                  value={form.businessName}
                  onChange={(e) =>
                    setForm({ ...form, businessName: e.target.value })
                  }
                  className={`w-full px-3 py-2.5 border rounded-xl text-sm text-gray-900 focus:outline-none focus:ring-2 focus:ring-orange-500/30 focus:border-orange-500 ${fieldErrors.businessName ? "border-red-300" : "border-gray-300"}`}
                  placeholder="My Business"
                  required
                />
                <FieldError field="businessName" />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Your Name
                </label>
                <input
                  type="text"
                  value={form.name}
                  onChange={(e) => setForm({ ...form, name: e.target.value })}
                  className={`w-full px-3 py-2.5 border rounded-xl text-sm text-gray-900 focus:outline-none focus:ring-2 focus:ring-orange-500/30 focus:border-orange-500 ${fieldErrors.name ? "border-red-300" : "border-gray-300"}`}
                  placeholder="John Doe"
                  required
                />
                <FieldError field="name" />
              </div>

              {signupMethod === "email" && (
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Email
                  </label>
                  <input
                    type="email"
                    value={form.email}
                    onChange={(e) =>
                      setForm({ ...form, email: e.target.value })
                    }
                    className={`w-full px-3 py-2.5 border rounded-xl text-sm text-gray-900 focus:outline-none focus:ring-2 focus:ring-orange-500/30 focus:border-orange-500 ${fieldErrors.email ? "border-red-300" : "border-gray-300"}`}
                    placeholder="you@example.com"
                    required
                  />
                  <FieldError field="email" />
                </div>
              )}

              {signupMethod === "phone" && (
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Phone Number
                  </label>
                  <input
                    type="tel"
                    value={form.phone}
                    onChange={(e) =>
                      setForm({ ...form, phone: e.target.value })
                    }
                    className={`w-full px-3 py-2.5 border rounded-xl text-sm text-gray-900 focus:outline-none focus:ring-2 focus:ring-orange-500/30 focus:border-orange-500 ${fieldErrors.phone ? "border-red-300" : "border-gray-300"}`}
                    placeholder="+256 7XX XXX XXX"
                    required
                  />
                  <FieldError field="phone" />
                </div>
              )}

              {signupMethod === "whatsapp" && (
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    <span className="flex items-center gap-1.5">
                      <MessageCircle className="w-3.5 h-3.5 text-green-600" />
                      WhatsApp Number
                    </span>
                  </label>
                  <input
                    type="tel"
                    value={form.whatsapp}
                    onChange={(e) =>
                      setForm({ ...form, whatsapp: e.target.value })
                    }
                    className={`w-full px-3 py-2.5 border rounded-xl text-sm text-gray-900 focus:outline-none focus:ring-2 focus:ring-green-500/30 focus:border-green-500 ${fieldErrors.whatsapp ? "border-red-300" : "border-gray-300"}`}
                    placeholder="+256 7XX XXX XXX"
                    required
                  />
                  <FieldError field="whatsapp" />
                  <p className="mt-1 text-xs text-gray-400">
                    You&apos;ll receive login alerts and receipts via WhatsApp
                  </p>
                </div>
              )}

              {/* Optional cross-fields */}
              {signupMethod !== "email" && (
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Email (optional)
                  </label>
                  <input
                    type="email"
                    value={form.email}
                    onChange={(e) =>
                      setForm({ ...form, email: e.target.value })
                    }
                    className="w-full px-3 py-2.5 border border-gray-300 rounded-xl text-sm text-gray-900 focus:outline-none focus:ring-2 focus:ring-orange-500/30 focus:border-orange-500"
                    placeholder="you@example.com"
                  />
                </div>
              )}

              {signupMethod === "email" && (
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Phone / WhatsApp (optional)
                  </label>
                  <input
                    type="tel"
                    value={form.phone}
                    onChange={(e) =>
                      setForm({ ...form, phone: e.target.value })
                    }
                    className="w-full px-3 py-2.5 border border-gray-300 rounded-xl text-sm text-gray-900 focus:outline-none focus:ring-2 focus:ring-orange-500/30 focus:border-orange-500"
                    placeholder="+256700000000"
                  />
                </div>
              )}

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Password
                </label>
                <div className="relative">
                  <input
                    type={showPassword ? "text" : "password"}
                    value={form.password}
                    onChange={(e) =>
                      setForm({ ...form, password: e.target.value })
                    }
                    className={`w-full px-3 py-2.5 border rounded-xl text-sm text-gray-900 focus:outline-none focus:ring-2 focus:ring-orange-500/30 focus:border-orange-500 pr-10 ${fieldErrors.password ? "border-red-300" : "border-gray-300"}`}
                    placeholder="••••••••"
                    required
                    minLength={6}
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
                <FieldError field="password" />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Business Type
                </label>
                <select
                  value={form.saasProduct}
                  onChange={(e) =>
                    setForm({ ...form, saasProduct: e.target.value })
                  }
                  className="w-full px-3 py-2.5 border border-gray-300 rounded-xl text-sm text-gray-900 focus:outline-none focus:ring-2 focus:ring-orange-500/30 focus:border-orange-500"
                >
                  <option value="retail">Retail POS</option>
                  <option value="pharmacy">Pharmacy POS</option>
                  <option value="clinic">Clinic POS</option>
                </select>
              </div>

              <button
                type="submit"
                disabled={loading}
                className="w-full bg-orange-500 text-white py-3 rounded-xl font-medium text-sm hover:bg-orange-600 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {loading ? "Creating account..." : "Create Account"}
              </button>
            </form>

            <div className="mt-6 text-center text-sm text-gray-600">
              Already have an account?{" "}
              <Link
                href="/sign-in"
                className="text-orange-600 font-medium hover:underline"
              >
                Sign in
              </Link>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
