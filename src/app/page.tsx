"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import {
  ShoppingCart,
  BarChart3,
  Package,
  Users,
  Shield,
  Smartphone,
  ArrowRight,
  CheckCircle2,
  Zap,
  Globe,
  ChevronDown,
  ChevronUp,
  Receipt,
  Wallet,
  TrendingUp,
  Warehouse,
  FileText,
  CreditCard,
  Bell,
  RotateCcw,
  Layers,
  Settings,
  PieChart,
  Star,
  Play,
  Menu,
  X,
} from "lucide-react";

const faqs = [
  {
    q: "How long is the free trial?",
    a: "You get a full 14-day free trial with access to all features. No credit card required to start.",
  },
  {
    q: "Can I use Meka PoS on my phone?",
    a: "Yes! Meka PoS is fully responsive and works on any device — phone, tablet, or desktop. Access your POS from anywhere.",
  },
  {
    q: "Does it work offline?",
    a: "Yes. Our offline mode lets you continue selling without internet. All data syncs automatically when your connection is restored.",
  },
  {
    q: "What payment methods are supported?",
    a: "We support cash, bank transfer, mobile money (MTN, Airtel), and credit sales. Credit sales include automated reminders via WhatsApp and email.",
  },
  {
    q: "Can I manage multiple branches?",
    a: "Absolutely. Meka PoS supports multi-branch operations with stock transfers, branch-specific reporting, and role-based access.",
  },
  {
    q: "How do I get receipts to my customers?",
    a: "Receipts can be printed, emailed, or sent via WhatsApp as a PDF automatically when a sale is completed.",
  },
  {
    q: "Is my data secure?",
    a: "Yes. Each business runs in its own isolated workspace with encrypted data, secure authentication, and regular backups.",
  },
  {
    q: "Can I sign up with WhatsApp?",
    a: "Yes! You can register and log in using your WhatsApp number. You'll receive login notifications on WhatsApp for added security.",
  },
];

const testimonials = [
  {
    name: "Sarah Nakamya",
    role: "Owner, Kampala Pharmacy",
    text: "Meka PoS transformed how we manage our pharmacy. Batch tracking and expiry alerts saved us from so much waste.",
    rating: 5,
  },
  {
    name: "David Ochieng",
    role: "Manager, ShopRite Stores",
    text: "We went from paper records to a fully digital system in one day. The multi-branch feature is exactly what we needed.",
    rating: 5,
  },
  {
    name: "Grace Atim",
    role: "Director, MedCare Clinic",
    text: "The invoicing and WhatsApp receipts have made our billing process seamless. Patients love the convenience.",
    rating: 5,
  },
];

export default function Home() {
  const [openFaq, setOpenFaq] = useState<number | null>(null);
  const [mobileMenu, setMobileMenu] = useState(false);
  const [scrolled, setScrolled] = useState(false);

  useEffect(() => {
    const handleScroll = () => setScrolled(window.scrollY > 20);
    window.addEventListener("scroll", handleScroll);
    return () => window.removeEventListener("scroll", handleScroll);
  }, []);

  return (
    <div className="min-h-screen bg-white font-sans">
      {/* Navigation */}
      <nav
        className={`fixed top-0 left-0 right-0 z-50 transition-all duration-300 ${scrolled ? "bg-white/80 backdrop-blur-xl shadow-sm border-b border-gray-100" : "bg-transparent"}`}
      >
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between items-center h-18">
            <div className="flex items-center gap-2.5">
              <div className="w-9 h-9 bg-gradient-to-br from-orange-500 to-amber-500 rounded-xl flex items-center justify-center shadow-lg shadow-orange-500/25">
                <ShoppingCart className="w-5 h-5 text-white" />
              </div>
              <span className="text-xl font-bold text-gray-900 tracking-tight">
                Meka<span className="text-orange-500">PoS</span>
              </span>
            </div>
            <div className="hidden md:flex items-center gap-8">
              <a
                href="#features"
                className="text-[13px] font-medium text-gray-600 hover:text-gray-900 transition-colors"
              >
                Features
              </a>
              <a
                href="#how-it-works"
                className="text-[13px] font-medium text-gray-600 hover:text-gray-900 transition-colors"
              >
                How It Works
              </a>
              <a
                href="#pricing"
                className="text-[13px] font-medium text-gray-600 hover:text-gray-900 transition-colors"
              >
                Pricing
              </a>
              <a
                href="#faq"
                className="text-[13px] font-medium text-gray-600 hover:text-gray-900 transition-colors"
              >
                FAQ
              </a>
            </div>
            <div className="hidden md:flex items-center gap-3">
              <Link
                href="/sign-in"
                className="text-[13px] font-medium text-gray-700 hover:text-orange-600 px-4 py-2 transition-colors"
              >
                Sign In
              </Link>
              <Link
                href="/sign-up"
                className="text-[13px] font-semibold bg-gradient-to-r from-orange-500 to-amber-500 text-white px-6 py-2.5 rounded-full hover:shadow-lg hover:shadow-orange-500/25 transition-all hover:-translate-y-0.5"
              >
                Start Free Trial
              </Link>
            </div>
            <button
              onClick={() => setMobileMenu(!mobileMenu)}
              className="md:hidden p-2"
            >
              {mobileMenu ? (
                <X className="w-5 h-5" />
              ) : (
                <Menu className="w-5 h-5" />
              )}
            </button>
          </div>
        </div>
        {/* Mobile Menu */}
        {mobileMenu && (
          <div className="md:hidden bg-white/95 backdrop-blur-xl border-t border-gray-100 px-4 py-6 space-y-4">
            <a
              href="#features"
              className="block text-sm font-medium text-gray-700"
            >
              Features
            </a>
            <a
              href="#how-it-works"
              className="block text-sm font-medium text-gray-700"
            >
              How It Works
            </a>
            <a
              href="#pricing"
              className="block text-sm font-medium text-gray-700"
            >
              Pricing
            </a>
            <a href="#faq" className="block text-sm font-medium text-gray-700">
              FAQ
            </a>
            <div className="pt-4 border-t border-gray-100 flex flex-col gap-3">
              <Link
                href="/sign-in"
                className="text-sm font-medium text-gray-700 text-center py-2"
              >
                Sign In
              </Link>
              <Link
                href="/sign-up"
                className="text-sm font-semibold bg-gradient-to-r from-orange-500 to-amber-500 text-white py-3 rounded-full text-center"
              >
                Start Free Trial
              </Link>
            </div>
          </div>
        )}
      </nav>

      {/* Hero Section */}
      <section className="relative min-h-screen flex items-center overflow-hidden">
        {/* Background gradient mesh */}
        <div className="absolute inset-0">
          <div className="absolute top-0 right-0 w-[800px] h-[800px] bg-gradient-to-bl from-orange-100/80 via-amber-50/40 to-transparent rounded-full blur-3xl" />
          <div className="absolute bottom-0 left-0 w-[600px] h-[600px] bg-gradient-to-tr from-orange-50/60 via-transparent to-transparent rounded-full blur-3xl" />
          <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[400px] h-[400px] bg-gradient-to-br from-amber-100/30 to-transparent rounded-full blur-3xl" />
        </div>

        {/* Grid pattern overlay */}
        <div
          className="absolute inset-0 opacity-[0.03]"
          style={{
            backgroundImage: `linear-gradient(rgba(0,0,0,0.1) 1px, transparent 1px), linear-gradient(90deg, rgba(0,0,0,0.1) 1px, transparent 1px)`,
            backgroundSize: "60px 60px",
          }}
        />

        <div className="relative max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 pt-28 pb-20">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-16 items-center">
            <div className="max-w-xl">
              {/* Badge */}
              <div className="inline-flex items-center gap-2 bg-orange-50 border border-orange-200/60 rounded-full px-4 py-1.5 mb-8">
                <span className="w-2 h-2 bg-orange-500 rounded-full animate-pulse" />
                <span className="text-xs font-semibold text-orange-700 tracking-wide uppercase">
                  Now with AI-powered insights
                </span>
              </div>

              <h1 className="text-5xl md:text-6xl lg:text-[68px] font-extrabold text-gray-900 leading-[1.08] tracking-tight">
                Run your
                <br />
                business{" "}
                <span className="bg-gradient-to-r from-orange-500 via-amber-500 to-orange-600 bg-clip-text text-transparent">
                  smarter
                </span>
              </h1>

              <p className="mt-7 text-lg md:text-xl text-gray-500 leading-relaxed max-w-md">
                The all-in-one POS platform for sales, inventory, invoicing, and
                multi-branch management. Built for African businesses.
              </p>

              <div className="mt-10 flex flex-col sm:flex-row gap-4">
                <Link
                  href="/sign-up"
                  className="group inline-flex items-center justify-center gap-2.5 bg-gray-900 text-white px-8 py-4 rounded-full text-[15px] font-semibold hover:bg-gray-800 transition-all shadow-xl shadow-gray-900/10 hover:-translate-y-0.5"
                >
                  Get Started Free
                  <ArrowRight className="w-4 h-4 group-hover:translate-x-0.5 transition-transform" />
                </Link>
                <a
                  href="#features"
                  className="group inline-flex items-center justify-center gap-2.5 text-gray-600 px-6 py-4 text-[15px] font-medium hover:text-gray-900 transition-colors"
                >
                  <div className="w-10 h-10 rounded-full border-2 border-gray-200 flex items-center justify-center group-hover:border-orange-300 transition-colors">
                    <Play className="w-4 h-4 ml-0.5" />
                  </div>
                  See how it works
                </a>
              </div>

              <div className="mt-10 flex items-center gap-6">
                <div className="flex -space-x-2.5">
                  {[
                    "bg-gradient-to-br from-orange-400 to-amber-500",
                    "bg-gradient-to-br from-blue-400 to-indigo-500",
                    "bg-gradient-to-br from-green-400 to-emerald-500",
                    "bg-gradient-to-br from-purple-400 to-pink-500",
                  ].map((bg, i) => (
                    <div
                      key={i}
                      className={`w-9 h-9 ${bg} rounded-full border-2 border-white flex items-center justify-center text-white text-xs font-bold`}
                    >
                      {["SN", "DO", "GA", "JK"][i]}
                    </div>
                  ))}
                </div>
                <div>
                  <div className="flex gap-0.5">
                    {[...Array(5)].map((_, i) => (
                      <Star
                        key={i}
                        className="w-3.5 h-3.5 fill-amber-400 text-amber-400"
                      />
                    ))}
                  </div>
                  <p className="text-xs text-gray-500 mt-0.5">
                    Trusted by{" "}
                    <span className="font-semibold text-gray-700">500+</span>{" "}
                    businesses
                  </p>
                </div>
              </div>
            </div>

            {/* Hero Visual — Dashboard Mockup */}
            <div className="relative hidden lg:block">
              {/* Browser window mockup */}
              <div className="relative z-10 animate-float">
                <div className="bg-white rounded-2xl shadow-2xl shadow-gray-900/10 border border-gray-200/60 overflow-hidden">
                  {/* Browser bar */}
                  <div className="flex items-center gap-2 px-4 py-3 bg-gray-50 border-b border-gray-100">
                    <div className="flex gap-1.5">
                      <div className="w-3 h-3 rounded-full bg-red-400" />
                      <div className="w-3 h-3 rounded-full bg-yellow-400" />
                      <div className="w-3 h-3 rounded-full bg-green-400" />
                    </div>
                    <div className="flex-1 mx-4">
                      <div className="bg-white rounded-lg px-3 py-1.5 text-[11px] text-gray-400 border border-gray-200 max-w-xs">
                        app.mekapos.com/dashboard
                      </div>
                    </div>
                  </div>
                  {/* Dashboard content */}
                  <div className="p-5 bg-gradient-to-br from-gray-50 to-white">
                    {/* Dashboard header */}
                    <div className="flex items-center justify-between mb-5">
                      <div>
                        <div className="h-3 w-28 bg-gray-200 rounded-full mb-2" />
                        <div className="h-2 w-40 bg-gray-100 rounded-full" />
                      </div>
                      <div className="flex gap-2">
                        <div className="h-8 w-20 bg-orange-100 rounded-lg" />
                        <div className="h-8 w-8 bg-orange-500 rounded-lg" />
                      </div>
                    </div>
                    {/* Stats row */}
                    <div className="grid grid-cols-4 gap-3 mb-5">
                      {[
                        {
                          value: "UGX 4.2M",
                          label: "Revenue",
                          color: "from-orange-500 to-amber-500",
                          change: "+12%",
                        },
                        {
                          value: "156",
                          label: "Orders",
                          color: "from-blue-500 to-indigo-500",
                          change: "+8%",
                        },
                        {
                          value: "1,240",
                          label: "Products",
                          color: "from-emerald-500 to-green-500",
                          change: "+3%",
                        },
                        {
                          value: "89",
                          label: "Customers",
                          color: "from-purple-500 to-pink-500",
                          change: "+15%",
                        },
                      ].map((s, i) => (
                        <div
                          key={i}
                          className="bg-white rounded-xl p-3 border border-gray-100 shadow-sm"
                        >
                          <p className="text-[10px] text-gray-400 mb-1">
                            {s.label}
                          </p>
                          <p className="text-sm font-bold text-gray-900">
                            {s.value}
                          </p>
                          <span
                            className={`text-[9px] font-semibold bg-gradient-to-r ${s.color} bg-clip-text text-transparent`}
                          >
                            {s.change}
                          </span>
                        </div>
                      ))}
                    </div>
                    {/* Chart placeholder */}
                    <div className="bg-white rounded-xl p-4 border border-gray-100 shadow-sm">
                      <div className="flex justify-between items-center mb-4">
                        <div className="h-2.5 w-20 bg-gray-200 rounded-full" />
                        <div className="flex gap-1">
                          <div className="h-5 w-12 bg-gray-100 rounded text-[8px] flex items-center justify-center text-gray-400">
                            Week
                          </div>
                          <div className="h-5 w-12 bg-orange-500 rounded text-[8px] flex items-center justify-center text-white">
                            Month
                          </div>
                        </div>
                      </div>
                      <div className="flex items-end gap-1.5 h-24">
                        {[40, 65, 45, 80, 55, 90, 70, 85, 60, 95, 75, 88].map(
                          (h, i) => (
                            <div
                              key={i}
                              className="flex-1 rounded-t-md transition-all"
                              style={{
                                height: `${h}%`,
                                background:
                                  i === 9
                                    ? "linear-gradient(to top, #f97316, #f59e0b)"
                                    : "#f3f4f6",
                              }}
                            />
                          ),
                        )}
                      </div>
                    </div>
                  </div>
                </div>
              </div>

              {/* Floating notification card */}
              <div className="absolute -left-12 top-1/3 z-20 animate-float-delayed">
                <div className="bg-white rounded-2xl shadow-xl shadow-gray-900/10 p-4 border border-gray-100 w-56">
                  <div className="flex items-center gap-3 mb-3">
                    <div className="w-8 h-8 bg-green-100 rounded-full flex items-center justify-center">
                      <TrendingUp className="w-4 h-4 text-green-600" />
                    </div>
                    <div>
                      <p className="text-[11px] font-semibold text-gray-900">
                        New Sale
                      </p>
                      <p className="text-[10px] text-gray-400">Just now</p>
                    </div>
                  </div>
                  <div className="flex justify-between items-center">
                    <span className="text-xs text-gray-500">Mobile Money</span>
                    <span className="text-sm font-bold text-gray-900">
                      UGX 125,000
                    </span>
                  </div>
                </div>
              </div>

              {/* Floating stats card */}
              <div className="absolute -right-6 bottom-12 z-20 animate-float">
                <div className="bg-gradient-to-br from-orange-500 to-amber-500 rounded-2xl shadow-xl shadow-orange-500/25 p-4 text-white w-44">
                  <div className="flex items-center gap-2 mb-2">
                    <BarChart3 className="w-4 h-4 opacity-80" />
                    <span className="text-[11px] font-medium opacity-80">
                      Today&apos;s Sales
                    </span>
                  </div>
                  <p className="text-2xl font-bold">UGX 2.8M</p>
                  <div className="flex items-center gap-1 mt-1">
                    <TrendingUp className="w-3 h-3" />
                    <span className="text-[10px] font-medium">
                      +23% vs yesterday
                    </span>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Trusted By — Marquee */}
      <section className="py-14 border-y border-gray-100 bg-gray-50/50 overflow-hidden">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <p className="text-center text-xs font-semibold text-gray-400 uppercase tracking-widest mb-10">
            Trusted by forward-thinking businesses across Africa
          </p>
          <div className="flex justify-center items-center gap-x-16 gap-y-6 flex-wrap opacity-40 grayscale hover:grayscale-0 hover:opacity-70 transition-all duration-500">
            {[
              "RetailHub",
              "PharmaConnect",
              "ShopEasy",
              "MedClinic",
              "TradePoint",
              "FreshMart",
            ].map((name, i) => (
              <span
                key={i}
                className="text-xl md:text-2xl font-bold text-gray-800 whitespace-nowrap"
              >
                {name}
              </span>
            ))}
          </div>
        </div>
      </section>

      {/* Features — Bento Grid */}
      <section id="features" className="py-24 bg-white">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center max-w-2xl mx-auto mb-20">
            <div className="inline-flex items-center gap-2 bg-orange-50 border border-orange-200/60 rounded-full px-4 py-1.5 mb-6">
              <Zap className="w-3.5 h-3.5 text-orange-500" />
              <span className="text-xs font-semibold text-orange-700 uppercase tracking-wide">
                Features
              </span>
            </div>
            <h2 className="text-4xl md:text-5xl font-extrabold text-gray-900 tracking-tight">
              Everything your business needs
            </h2>
            <p className="mt-5 text-lg text-gray-500 leading-relaxed">
              From point-of-sale to advanced analytics, all the tools designed
              for retailers, pharmacies, and clinics in one powerful platform.
            </p>
          </div>

          {/* Bento Grid */}
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
            {/* Large featured card */}
            <div className="lg:col-span-2 lg:row-span-2 rounded-3xl bg-gradient-to-br from-gray-900 via-gray-800 to-gray-900 p-10 text-white relative overflow-hidden group">
              <div className="absolute top-0 right-0 w-80 h-80 bg-gradient-to-bl from-orange-500/20 to-transparent rounded-full blur-3xl" />
              <div className="relative z-10">
                <div className="w-14 h-14 bg-white/10 rounded-2xl flex items-center justify-center mb-6 backdrop-blur-sm border border-white/10">
                  <ShoppingCart className="w-7 h-7 text-orange-400" />
                </div>
                <h3 className="text-2xl md:text-3xl font-bold mb-3">
                  Lightning-fast POS Terminal
                </h3>
                <p className="text-gray-400 text-base leading-relaxed max-w-md mb-8">
                  Complete checkout in under 2 seconds. Barcode scanning,
                  multiple payment methods, instant receipt via print, email, or
                  WhatsApp.
                </p>
                {/* Mini POS preview */}
                <div className="bg-white/5 backdrop-blur-sm rounded-2xl border border-white/10 p-5">
                  <div className="grid grid-cols-3 gap-3 mb-4">
                    {[
                      "Paracetamol",
                      "Amoxicillin",
                      "Vitamin C",
                      "Bandage Tape",
                      "Syringe 5ml",
                      "Face Mask",
                    ].map((item, i) => (
                      <div
                        key={i}
                        className="bg-white/5 rounded-xl p-3 text-center border border-white/5 hover:bg-white/10 transition-colors cursor-pointer"
                      >
                        <div className="w-8 h-8 bg-gradient-to-br from-orange-400/20 to-amber-400/20 rounded-lg mx-auto mb-2 flex items-center justify-center">
                          <Package className="w-4 h-4 text-orange-300" />
                        </div>
                        <p className="text-[10px] text-gray-300 truncate">
                          {item}
                        </p>
                      </div>
                    ))}
                  </div>
                  <div className="flex items-center justify-between pt-3 border-t border-white/10">
                    <div>
                      <p className="text-[10px] text-gray-500">Total</p>
                      <p className="text-lg font-bold text-white">UGX 85,000</p>
                    </div>
                    <div className="flex gap-2">
                      <div className="h-8 px-3 bg-white/10 rounded-lg text-[10px] flex items-center gap-1 text-gray-300">
                        <CreditCard className="w-3 h-3" /> Card
                      </div>
                      <div className="h-8 px-4 bg-gradient-to-r from-orange-500 to-amber-500 rounded-lg text-[10px] flex items-center font-semibold">
                        Pay Now
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            </div>

            {/* Inventory */}
            <div className="rounded-3xl bg-gradient-to-br from-orange-50 to-amber-50/50 p-8 border border-orange-100/50 group hover:shadow-xl hover:shadow-orange-100/50 transition-all duration-300">
              <div className="w-12 h-12 bg-gradient-to-br from-orange-500 to-amber-500 rounded-2xl flex items-center justify-center mb-5 shadow-lg shadow-orange-500/20">
                <Package className="w-6 h-6 text-white" />
              </div>
              <h3 className="text-lg font-bold text-gray-900 mb-2">
                Smart Inventory
              </h3>
              <p className="text-gray-500 text-sm leading-relaxed mb-5">
                Real-time stock tracking across all branches. Automatic reorder
                alerts and product image management.
              </p>
              <div className="flex items-center gap-3">
                <div className="flex-1 bg-white rounded-xl p-3 border border-orange-100">
                  <p className="text-[10px] text-gray-400 mb-1">In Stock</p>
                  <p className="text-lg font-bold text-gray-900">1,247</p>
                  <div className="w-full bg-orange-100 rounded-full h-1.5 mt-2">
                    <div
                      className="bg-gradient-to-r from-orange-500 to-amber-500 h-1.5 rounded-full"
                      style={{ width: "78%" }}
                    />
                  </div>
                </div>
                <div className="flex-1 bg-white rounded-xl p-3 border border-orange-100">
                  <p className="text-[10px] text-gray-400 mb-1">Low Stock</p>
                  <p className="text-lg font-bold text-red-500">23</p>
                  <div className="w-full bg-red-100 rounded-full h-1.5 mt-2">
                    <div
                      className="bg-red-400 h-1.5 rounded-full"
                      style={{ width: "15%" }}
                    />
                  </div>
                </div>
              </div>
            </div>

            {/* Reports */}
            <div className="rounded-3xl bg-gradient-to-br from-emerald-50 to-green-50/50 p-8 border border-emerald-100/50 group hover:shadow-xl hover:shadow-emerald-100/50 transition-all duration-300">
              <div className="w-12 h-12 bg-gradient-to-br from-emerald-500 to-green-500 rounded-2xl flex items-center justify-center mb-5 shadow-lg shadow-emerald-500/20">
                <BarChart3 className="w-6 h-6 text-white" />
              </div>
              <h3 className="text-lg font-bold text-gray-900 mb-2">
                Powerful Analytics
              </h3>
              <p className="text-gray-500 text-sm leading-relaxed mb-5">
                PDF reports, profit analysis, and trend insights. Day, week,
                month, quarter, and annual views.
              </p>
              <div className="flex items-end gap-1 h-16">
                {[30, 50, 35, 70, 45, 85, 60, 90, 55, 75].map((h, i) => (
                  <div
                    key={i}
                    className="flex-1 rounded-t-sm transition-all duration-300 group-hover:opacity-100"
                    style={{
                      height: `${h}%`,
                      background:
                        i >= 7
                          ? "linear-gradient(to top, #10b981, #34d399)"
                          : "#d1fae5",
                      opacity: 0.6 + i * 0.04,
                    }}
                  />
                ))}
              </div>
            </div>

            {/* Customer Management */}
            <div className="rounded-3xl bg-gradient-to-br from-blue-50 to-indigo-50/50 p-8 border border-blue-100/50 group hover:shadow-xl hover:shadow-blue-100/50 transition-all duration-300">
              <div className="w-12 h-12 bg-gradient-to-br from-blue-500 to-indigo-500 rounded-2xl flex items-center justify-center mb-5 shadow-lg shadow-blue-500/20">
                <Users className="w-6 h-6 text-white" />
              </div>
              <h3 className="text-lg font-bold text-gray-900 mb-2">
                Customer 360&deg;
              </h3>
              <p className="text-gray-500 text-sm leading-relaxed mb-4">
                Track credit limits, payments, balances. Full purchase history
                and smart credit reminders.
              </p>
              <div className="flex -space-x-2">
                {[
                  "from-orange-400 to-amber-400",
                  "from-blue-400 to-indigo-400",
                  "from-green-400 to-emerald-400",
                  "from-purple-400 to-pink-400",
                  "from-red-400 to-rose-400",
                ].map((g, i) => (
                  <div
                    key={i}
                    className={`w-8 h-8 rounded-full bg-gradient-to-br ${g} border-2 border-white`}
                  />
                ))}
                <div className="w-8 h-8 rounded-full bg-gray-100 border-2 border-white flex items-center justify-center text-[10px] font-semibold text-gray-500">
                  +84
                </div>
              </div>
            </div>

            {/* Mobile Money */}
            <div className="rounded-3xl bg-gradient-to-br from-amber-50 to-yellow-50/50 p-8 border border-amber-100/50 group hover:shadow-xl hover:shadow-amber-100/50 transition-all duration-300">
              <div className="w-12 h-12 bg-gradient-to-br from-amber-500 to-yellow-500 rounded-2xl flex items-center justify-center mb-5 shadow-lg shadow-amber-500/20">
                <Smartphone className="w-6 h-6 text-white" />
              </div>
              <h3 className="text-lg font-bold text-gray-900 mb-2">
                Mobile Money
              </h3>
              <p className="text-gray-500 text-sm leading-relaxed mb-4">
                Accept MTN MoMo and Airtel Money. Send receipts via WhatsApp PDF
                instantly after each sale.
              </p>
              <div className="flex gap-2">
                {["MTN", "Airtel", "Cash"].map((m, i) => (
                  <span
                    key={i}
                    className="text-[10px] font-semibold bg-white border border-amber-200 text-amber-700 px-3 py-1.5 rounded-full"
                  >
                    {m}
                  </span>
                ))}
              </div>
            </div>

            {/* Multi-Branch */}
            <div className="rounded-3xl bg-gradient-to-br from-purple-50 to-pink-50/50 p-8 border border-purple-100/50 group hover:shadow-xl hover:shadow-purple-100/50 transition-all duration-300">
              <div className="w-12 h-12 bg-gradient-to-br from-purple-500 to-pink-500 rounded-2xl flex items-center justify-center mb-5 shadow-lg shadow-purple-500/20">
                <Shield className="w-6 h-6 text-white" />
              </div>
              <h3 className="text-lg font-bold text-gray-900 mb-2">
                Multi-Branch &amp; Roles
              </h3>
              <p className="text-gray-500 text-sm leading-relaxed mb-4">
                Unlimited branches with role-based access control. Stock
                transfers and branch-specific reporting.
              </p>
              <div className="flex gap-2">
                {["Admin", "Manager", "Cashier"].map((r, i) => (
                  <span
                    key={i}
                    className={`text-[10px] font-semibold px-3 py-1.5 rounded-full ${i === 0 ? "bg-purple-100 text-purple-700" : i === 1 ? "bg-pink-100 text-pink-700" : "bg-gray-100 text-gray-600"}`}
                  >
                    {r}
                  </span>
                ))}
              </div>
            </div>
          </div>

          {/* Additional features row */}
          <div className="grid grid-cols-2 md:grid-cols-4 gap-5 mt-5">
            {[
              {
                icon: Receipt,
                title: "Invoicing",
                desc: "Custom templates, auto-send via email & WhatsApp",
                color: "text-indigo-500",
                bg: "bg-indigo-50",
              },
              {
                icon: Layers,
                title: "Batch Tracking",
                desc: "FIFO/LIFO costing, expiry dates, batch numbers",
                color: "text-pink-500",
                bg: "bg-pink-50",
              },
              {
                icon: Globe,
                title: "Offline Mode",
                desc: "Keep selling offline, auto-sync when reconnected",
                color: "text-gray-700",
                bg: "bg-gray-50",
              },
              {
                icon: Bell,
                title: "Smart Alerts",
                desc: "WhatsApp & email for sales, credit & low stock",
                color: "text-amber-500",
                bg: "bg-amber-50",
              },
            ].map((f, i) => (
              <div
                key={i}
                className="rounded-2xl bg-white border border-gray-100 p-6 hover:shadow-lg hover:shadow-gray-100/80 transition-all duration-300 group"
              >
                <div
                  className={`w-10 h-10 ${f.bg} rounded-xl flex items-center justify-center mb-4`}
                >
                  <f.icon className={`w-5 h-5 ${f.color}`} />
                </div>
                <h4 className="text-sm font-bold text-gray-900 mb-1">
                  {f.title}
                </h4>
                <p className="text-xs text-gray-500 leading-relaxed">
                  {f.desc}
                </p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* How It Works */}
      <section id="how-it-works" className="py-24 relative overflow-hidden">
        {/* Background */}
        <div className="absolute inset-0 bg-gradient-to-b from-gray-50 to-white" />
        <div className="absolute top-0 left-1/2 -translate-x-1/2 w-[800px] h-[800px] bg-gradient-to-br from-orange-50/60 to-transparent rounded-full blur-3xl" />

        <div className="relative max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center max-w-2xl mx-auto mb-20">
            <div className="inline-flex items-center gap-2 bg-orange-50 border border-orange-200/60 rounded-full px-4 py-1.5 mb-6">
              <Settings className="w-3.5 h-3.5 text-orange-500" />
              <span className="text-xs font-semibold text-orange-700 uppercase tracking-wide">
                How It Works
              </span>
            </div>
            <h2 className="text-4xl md:text-5xl font-extrabold text-gray-900 tracking-tight">
              Up and running in minutes
            </h2>
            <p className="mt-5 text-lg text-gray-500">
              Three simple steps to transform how you run your business
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-8 relative">
            {/* Connecting line */}
            <div className="hidden md:block absolute top-24 left-[20%] right-[20%] h-[2px] bg-gradient-to-r from-orange-200 via-orange-300 to-orange-200" />

            {[
              {
                step: "01",
                title: "Create Your Account",
                desc: "Sign up with email, phone, or WhatsApp in under 60 seconds. Set up your business profile and invite your team.",
                icon: Settings,
                color: "from-orange-500 to-amber-500",
              },
              {
                step: "02",
                title: "Add Your Products",
                desc: "Import or add your inventory with images, categories, pricing, stock levels, and batch information.",
                icon: Package,
                color: "from-blue-500 to-indigo-500",
              },
              {
                step: "03",
                title: "Start Selling",
                desc: "Use the POS terminal, track sales in real-time, manage customers, and watch your business grow.",
                icon: TrendingUp,
                color: "from-emerald-500 to-green-500",
              },
            ].map((item, i) => (
              <div key={i} className="relative group">
                <div className="bg-white rounded-3xl p-8 border border-gray-100 shadow-sm hover:shadow-xl transition-all duration-500 hover:-translate-y-1">
                  {/* Step icon */}
                  <div
                    className={`w-12 h-12 rounded-2xl bg-gradient-to-br ${item.color} flex items-center justify-center mb-6 shadow-lg`}
                  >
                    <item.icon className="w-6 h-6 text-white" />
                  </div>
                  <div className="inline-flex items-center gap-2 mb-4">
                    <span className="text-xs font-bold text-orange-500 bg-orange-50 px-2.5 py-1 rounded-full">
                      Step {item.step}
                    </span>
                  </div>
                  <h3 className="text-xl font-bold text-gray-900 mb-3">
                    {item.title}
                  </h3>
                  <p className="text-gray-500 text-sm leading-relaxed">
                    {item.desc}
                  </p>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Dashboard Preview Section */}
      <section className="py-24 bg-gradient-to-b from-white to-gray-50">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center max-w-2xl mx-auto mb-16">
            <div className="inline-flex items-center gap-2 bg-orange-50 border border-orange-200/60 rounded-full px-4 py-1.5 mb-6">
              <PieChart className="w-3.5 h-3.5 text-orange-500" />
              <span className="text-xs font-semibold text-orange-700 uppercase tracking-wide">
                Dashboard
              </span>
            </div>
            <h2 className="text-4xl md:text-5xl font-extrabold text-gray-900 tracking-tight">
              Every metric at a glance
            </h2>
            <p className="mt-5 text-lg text-gray-500">
              Real-time insights across daily, weekly, monthly, quarterly, and
              annual views
            </p>
          </div>

          <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-10">
            {[
              {
                icon: TrendingUp,
                label: "Sales Revenue",
                value: "Track Daily",
                gradient: "from-orange-500 to-amber-500",
                shadow: "shadow-orange-500/20",
              },
              {
                icon: ShoppingCart,
                label: "Total Orders",
                value: "Real-time",
                gradient: "from-blue-500 to-indigo-500",
                shadow: "shadow-blue-500/20",
              },
              {
                icon: Package,
                label: "Stock Levels",
                value: "Low Stock Alerts",
                gradient: "from-emerald-500 to-green-500",
                shadow: "shadow-emerald-500/20",
              },
              {
                icon: Users,
                label: "Customers",
                value: "Active Tracking",
                gradient: "from-purple-500 to-pink-500",
                shadow: "shadow-purple-500/20",
              },
            ].map((m, i) => (
              <div
                key={i}
                className={`bg-gradient-to-br ${m.gradient} rounded-2xl p-6 text-white shadow-xl ${m.shadow} hover:-translate-y-1 transition-transform duration-300`}
              >
                <m.icon className="w-7 h-7 mb-4 opacity-80" />
                <p className="text-xl font-bold">{m.value}</p>
                <p className="text-sm opacity-75 mt-1">{m.label}</p>
              </div>
            ))}
          </div>

          {/* Quick Actions */}
          <div className="bg-white rounded-3xl p-8 border border-gray-100 shadow-sm">
            <div className="flex items-center gap-3 mb-6">
              <div className="w-8 h-8 bg-orange-50 rounded-lg flex items-center justify-center">
                <Zap className="w-4 h-4 text-orange-500" />
              </div>
              <h3 className="text-lg font-bold text-gray-900">Quick Actions</h3>
            </div>
            <div className="grid grid-cols-3 sm:grid-cols-4 md:grid-cols-6 gap-3">
              {[
                { icon: ShoppingCart, label: "New Sale" },
                { icon: TrendingUp, label: "Add Expense" },
                { icon: Users, label: "Customers" },
                { icon: Warehouse, label: "Transfer" },
                { icon: FileText, label: "Invoice" },
                { icon: PieChart, label: "Reports" },
                { icon: RotateCcw, label: "Returns" },
                { icon: Wallet, label: "Payments" },
                { icon: Package, label: "Products" },
                { icon: Settings, label: "Settings" },
                { icon: CreditCard, label: "Purchases" },
                { icon: Receipt, label: "Receipts" },
              ].map((action, i) => (
                <div
                  key={i}
                  className="flex flex-col items-center gap-2 rounded-2xl p-4 hover:bg-orange-50 transition-all cursor-pointer group border border-transparent hover:border-orange-100"
                >
                  <div className="w-11 h-11 bg-gray-50 rounded-xl flex items-center justify-center group-hover:bg-white group-hover:shadow-sm transition-all">
                    <action.icon className="w-5 h-5 text-gray-400 group-hover:text-orange-500 transition-colors" />
                  </div>
                  <span className="text-[11px] font-medium text-gray-500 group-hover:text-gray-700 transition-colors">
                    {action.label}
                  </span>
                </div>
              ))}
            </div>
          </div>
        </div>
      </section>

      {/* Industry Solutions */}
      <section className="py-24 bg-white">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center max-w-2xl mx-auto mb-16">
            <div className="inline-flex items-center gap-2 bg-orange-50 border border-orange-200/60 rounded-full px-4 py-1.5 mb-6">
              <Globe className="w-3.5 h-3.5 text-orange-500" />
              <span className="text-xs font-semibold text-orange-700 uppercase tracking-wide">
                Solutions
              </span>
            </div>
            <h2 className="text-4xl md:text-5xl font-extrabold text-gray-900 tracking-tight">
              Built for your industry
            </h2>
            <p className="mt-5 text-lg text-gray-500">
              Tailored POS solutions for different sectors
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            {[
              {
                name: "Retail POS",
                desc: "For shops, supermarkets, and retail stores. Full inventory control, barcode scanning, and multi-branch operations.",
                icon: ShoppingCart,
                gradient: "from-orange-500 to-amber-500",
                features: ["Barcode Scanning", "Multi-Branch", "Stock Alerts"],
              },
              {
                name: "Pharmacy POS",
                desc: "For pharmacies and drug shops. Expiry tracking, batch management, FIFO/LIFO costing, and compliance reporting.",
                icon: Shield,
                gradient: "from-emerald-500 to-green-500",
                features: ["Expiry Tracking", "Batch Control", "FIFO/LIFO"],
              },
              {
                name: "Clinic POS",
                desc: "For clinics and health centers. Patient billing, service management, payment tracking, and invoice customization.",
                icon: Users,
                gradient: "from-blue-500 to-indigo-500",
                features: ["Patient Billing", "Services", "Custom Invoices"],
              },
            ].map((product, i) => (
              <div
                key={i}
                className="group rounded-3xl border border-gray-100 bg-white overflow-hidden hover:shadow-2xl hover:shadow-gray-200/50 transition-all duration-500 hover:-translate-y-1"
              >
                <div
                  className={`bg-gradient-to-br ${product.gradient} p-8 relative overflow-hidden`}
                >
                  <div className="absolute top-0 right-0 w-32 h-32 bg-white/10 rounded-full -translate-y-8 translate-x-8" />
                  <div className="relative">
                    <div className="w-14 h-14 bg-white/20 backdrop-blur-sm rounded-2xl flex items-center justify-center mb-4 border border-white/20">
                      <product.icon className="w-7 h-7 text-white" />
                    </div>
                    <h3 className="text-2xl font-bold text-white">
                      {product.name}
                    </h3>
                  </div>
                </div>
                <div className="p-8">
                  <p className="text-gray-500 text-sm leading-relaxed mb-6">
                    {product.desc}
                  </p>
                  <div className="flex flex-wrap gap-2 mb-6">
                    {product.features.map((f, j) => (
                      <span
                        key={j}
                        className="text-[11px] font-medium bg-gray-50 text-gray-600 px-3 py-1.5 rounded-full border border-gray-100"
                      >
                        {f}
                      </span>
                    ))}
                  </div>
                  <Link
                    href="/sign-up"
                    className="group/link inline-flex items-center gap-2 text-sm font-semibold text-gray-900 hover:text-orange-600 transition-colors"
                  >
                    Get started{" "}
                    <ArrowRight className="w-4 h-4 group-hover/link:translate-x-0.5 transition-transform" />
                  </Link>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Testimonials */}
      <section className="py-24 bg-gray-50">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center max-w-2xl mx-auto mb-16">
            <div className="inline-flex items-center gap-2 bg-orange-50 border border-orange-200/60 rounded-full px-4 py-1.5 mb-6">
              <Star className="w-3.5 h-3.5 text-orange-500" />
              <span className="text-xs font-semibold text-orange-700 uppercase tracking-wide">
                Testimonials
              </span>
            </div>
            <h2 className="text-4xl md:text-5xl font-extrabold text-gray-900 tracking-tight">
              Loved by businesses
            </h2>
            <p className="mt-5 text-lg text-gray-500">
              See what our customers have to say
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            {testimonials.map((t, i) => (
              <div
                key={i}
                className="bg-white rounded-3xl p-8 border border-gray-100 hover:shadow-xl transition-all duration-300 hover:-translate-y-1"
              >
                <div className="flex gap-1 mb-5">
                  {[...Array(t.rating)].map((_, j) => (
                    <Star
                      key={j}
                      className="w-4 h-4 fill-amber-400 text-amber-400"
                    />
                  ))}
                </div>
                <p className="text-gray-600 text-sm leading-relaxed mb-6">
                  &ldquo;{t.text}&rdquo;
                </p>
                <div className="flex items-center gap-3 pt-5 border-t border-gray-50">
                  <div
                    className={`w-10 h-10 rounded-full bg-gradient-to-br ${["from-orange-400 to-amber-400", "from-blue-400 to-indigo-400", "from-emerald-400 to-green-400"][i]} flex items-center justify-center text-white text-xs font-bold`}
                  >
                    {t.name
                      .split(" ")
                      .map((n) => n[0])
                      .join("")}
                  </div>
                  <div>
                    <p className="text-sm font-semibold text-gray-900">
                      {t.name}
                    </p>
                    <p className="text-xs text-gray-400">{t.role}</p>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Pricing */}
      <section id="pricing" className="py-24 bg-white">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center max-w-2xl mx-auto mb-16">
            <div className="inline-flex items-center gap-2 bg-orange-50 border border-orange-200/60 rounded-full px-4 py-1.5 mb-6">
              <CreditCard className="w-3.5 h-3.5 text-orange-500" />
              <span className="text-xs font-semibold text-orange-700 uppercase tracking-wide">
                Pricing
              </span>
            </div>
            <h2 className="text-4xl md:text-5xl font-extrabold text-gray-900 tracking-tight">
              Simple, honest pricing
            </h2>
            <p className="mt-5 text-lg text-gray-500">
              Start free. Upgrade as you grow. No hidden fees.
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 max-w-7xl mx-auto">
            {[
              {
                name: "Basic",
                price: "UGX 50,000",
                period: "/per month",
                desc: "Basic plan for small businesses",
                features: [
                  "7-day free trial",
                  "Up to 1 user",
                  "Up to 1 branch",
                  "Inventory tracking",
                  "Sales management",
                  "Purchase management",
                  "Financial reports",
                ],
                cta: "Get Started",
                featured: true,
              },
              {
                name: "Premium",
                price: "UGX 100,000",
                period: "/per month",
                desc: "Premium plan with unlimited features",
                features: [
                  "7-day free trial",
                  "Unlimited users",
                  "Unlimited branches",
                  "Inventory tracking",
                  "Sales management",
                  "Purchase management",
                  "Financial reports",
                  "Customer and supplier management",
                  "Advanced security",
                ],
                cta: "Get Started",
                featured: false,
              },
              {
                name: "Corporate",
                price: "Custom",
                period: "",
                desc: "Corporate plan for medium to large businesses with Payment and eFris integration",
                features: [
                  "7-day free trial",
                  "Unlimited users",
                  "Up to 4 branches",
                  "All Premium features",
                  "Payment integration",
                  "eFris integration",
                  "Customer and supplier management",
                  "Advanced security",
                ],
                cta: "Contact Sales",
                featured: false,
              },
              {
                name: "Enterprise",
                price: "Custom",
                period: "",
                desc: "Enterprise plan with full capabilities including Payment and eFris integration",
                features: [
                  "7-day free trial",
                  "All Corporate features",
                  "Up to 7 branches",
                  "Payment integration",
                  "eFris integration",
                  "Priority support",
                  "Custom integrations",
                  "Dedicated account manager",
                ],
                cta: "Contact Sales",
                featured: false,
              },
            ].map((plan, i) => (
              <div
                key={i}
                className={`relative rounded-3xl border p-8 transition-all duration-300 hover:-translate-y-1 ${
                  plan.featured
                    ? "border-orange-300 bg-gradient-to-b from-orange-50/80 to-white shadow-xl shadow-orange-100/50 md:scale-105"
                    : "border-gray-100 bg-white hover:shadow-xl hover:shadow-gray-100/50"
                }`}
              >
                {plan.featured && (
                  <div className="absolute -top-3.5 left-1/2 -translate-x-1/2">
                    <span className="inline-block bg-gradient-to-r from-orange-500 to-amber-500 text-white text-[11px] font-bold px-5 py-1.5 rounded-full shadow-lg shadow-orange-500/20 uppercase tracking-wide">
                      Most Popular
                    </span>
                  </div>
                )}
                <div className="mb-6">
                  <h3 className="text-lg font-bold text-gray-900">
                    {plan.name}
                  </h3>
                  <p className="text-xs text-gray-400 mt-1">{plan.desc}</p>
                </div>
                <div className="flex items-baseline gap-1 mb-8">
                  <span className="text-4xl font-extrabold text-gray-900 tracking-tight">
                    {plan.price}
                  </span>
                  <span className="text-sm text-gray-400">{plan.period}</span>
                </div>
                <ul className="space-y-3.5 mb-8">
                  {plan.features.map((f, j) => (
                    <li
                      key={j}
                      className="flex items-center gap-3 text-sm text-gray-600"
                    >
                      <CheckCircle2
                        className={`w-4 h-4 flex-shrink-0 ${plan.featured ? "text-orange-500" : "text-gray-300"}`}
                      />
                      {f}
                    </li>
                  ))}
                </ul>
                <Link
                  href={`/dashboard/subscription?plan=${encodeURIComponent(plan.name.toLowerCase())}`}
                  className={`block text-center py-3.5 rounded-full text-sm font-semibold transition-all ${
                    plan.featured
                      ? "bg-gradient-to-r from-orange-500 to-amber-500 text-white shadow-lg shadow-orange-500/20 hover:shadow-xl hover:shadow-orange-500/30 hover:-translate-y-0.5"
                      : "border border-gray-200 text-gray-700 hover:bg-gray-50 hover:border-gray-300"
                  }`}
                >
                  {plan.cta}
                </Link>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* FAQ */}
      <section id="faq" className="py-24 bg-gray-50">
        <div className="max-w-3xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center mb-16">
            <div className="inline-flex items-center gap-2 bg-orange-50 border border-orange-200/60 rounded-full px-4 py-1.5 mb-6">
              <span className="text-xs font-semibold text-orange-700 uppercase tracking-wide">
                FAQ
              </span>
            </div>
            <h2 className="text-4xl md:text-5xl font-extrabold text-gray-900 tracking-tight">
              Got questions?
            </h2>
            <p className="mt-5 text-lg text-gray-500">
              Everything you need to know about Meka PoS
            </p>
          </div>
          <div className="space-y-3">
            {faqs.map((faq, i) => (
              <div
                key={i}
                className={`bg-white rounded-2xl border transition-all duration-300 ${openFaq === i ? "border-orange-200 shadow-lg shadow-orange-50" : "border-gray-100 hover:border-gray-200"}`}
              >
                <button
                  onClick={() => setOpenFaq(openFaq === i ? null : i)}
                  className="w-full flex items-center justify-between px-6 py-5 text-left"
                >
                  <span className="text-[15px] font-semibold text-gray-900 pr-4">
                    {faq.q}
                  </span>
                  <div
                    className={`w-8 h-8 rounded-full flex items-center justify-center flex-shrink-0 transition-colors ${openFaq === i ? "bg-orange-100" : "bg-gray-50"}`}
                  >
                    {openFaq === i ? (
                      <ChevronUp className="w-4 h-4 text-orange-500" />
                    ) : (
                      <ChevronDown className="w-4 h-4 text-gray-400" />
                    )}
                  </div>
                </button>
                <div
                  className={`overflow-hidden transition-all duration-300 ${openFaq === i ? "max-h-40 opacity-100" : "max-h-0 opacity-0"}`}
                >
                  <div className="px-6 pb-5">
                    <p className="text-sm text-gray-500 leading-relaxed">
                      {faq.a}
                    </p>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* CTA */}
      <section className="py-24 relative overflow-hidden">
        <div className="absolute inset-0 bg-gradient-to-br from-gray-900 via-gray-800 to-gray-900" />
        <div className="absolute top-0 right-0 w-[600px] h-[600px] bg-gradient-to-bl from-orange-500/15 to-transparent rounded-full blur-3xl" />
        <div className="absolute bottom-0 left-0 w-[400px] h-[400px] bg-gradient-to-tr from-amber-500/10 to-transparent rounded-full blur-3xl" />

        <div className="relative max-w-3xl mx-auto px-4 text-center">
          <div className="inline-flex items-center gap-2 bg-white/10 border border-white/10 rounded-full px-4 py-1.5 mb-8">
            <span className="w-2 h-2 bg-green-400 rounded-full animate-pulse" />
            <span className="text-xs font-semibold text-white/70 uppercase tracking-wide">
              Free 14-day trial
            </span>
          </div>
          <h2 className="text-4xl md:text-5xl lg:text-6xl font-extrabold text-white tracking-tight leading-tight">
            Ready to grow your
            <br />
            <span className="bg-gradient-to-r from-orange-400 to-amber-400 bg-clip-text text-transparent">
              business?
            </span>
          </h2>
          <p className="mt-6 text-lg text-gray-400 max-w-lg mx-auto">
            Join hundreds of businesses across Africa using Meka PoS to manage
            sales, inventory, customers, and more.
          </p>
          <div className="mt-10 flex flex-col sm:flex-row gap-4 justify-center">
            <Link
              href="/sign-up"
              className="group inline-flex items-center justify-center gap-2.5 bg-gradient-to-r from-orange-500 to-amber-500 text-white px-8 py-4 rounded-full text-base font-semibold shadow-xl shadow-orange-500/20 hover:shadow-2xl hover:shadow-orange-500/30 hover:-translate-y-0.5 transition-all"
            >
              Start Your Free Trial
              <ArrowRight className="w-4 h-4 group-hover:translate-x-0.5 transition-transform" />
            </Link>
            <a
              href="#pricing"
              className="inline-flex items-center justify-center gap-2 text-white/70 px-6 py-4 text-base font-medium hover:text-white border border-white/10 rounded-full hover:bg-white/5 transition-all"
            >
              View Pricing
            </a>
          </div>
        </div>
      </section>

      {/* Footer */}
      <footer className="bg-gray-900 text-gray-400 pt-20 pb-10 border-t border-white/5">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="grid grid-cols-2 md:grid-cols-4 gap-10 mb-16">
            <div className="col-span-2 md:col-span-1">
              <div className="flex items-center gap-2.5 mb-5">
                <div className="w-9 h-9 bg-gradient-to-br from-orange-500 to-amber-500 rounded-xl flex items-center justify-center">
                  <ShoppingCart className="w-5 h-5 text-white" />
                </div>
                <span className="text-lg font-bold text-white tracking-tight">
                  Meka<span className="text-orange-400">PoS</span>
                </span>
              </div>
              <p className="text-sm text-gray-500 leading-relaxed max-w-xs">
                Modern cloud-based POS system built for businesses across
                Africa.
              </p>
            </div>
            <div>
              <h4 className="text-xs font-bold text-white uppercase tracking-widest mb-5">
                Product
              </h4>
              <ul className="space-y-3 text-sm">
                {["Features", "Pricing", "Solutions", "Changelog"].map(
                  (item) => (
                    <li key={item}>
                      <a
                        href={`#${item.toLowerCase()}`}
                        className="text-gray-500 hover:text-white transition-colors"
                      >
                        {item}
                      </a>
                    </li>
                  ),
                )}
              </ul>
            </div>
            <div>
              <h4 className="text-xs font-bold text-white uppercase tracking-widest mb-5">
                Support
              </h4>
              <ul className="space-y-3 text-sm">
                {["FAQ", "Contact Us", "Documentation", "WhatsApp"].map(
                  (item) => (
                    <li key={item}>
                      <a
                        href="#"
                        className="text-gray-500 hover:text-white transition-colors"
                      >
                        {item}
                      </a>
                    </li>
                  ),
                )}
              </ul>
            </div>
            <div>
              <h4 className="text-xs font-bold text-white uppercase tracking-widest mb-5">
                Legal
              </h4>
              <ul className="space-y-3 text-sm">
                {["Privacy Policy", "Terms of Service", "Cookie Policy"].map(
                  (item) => (
                    <li key={item}>
                      <a
                        href="#"
                        className="text-gray-500 hover:text-white transition-colors"
                      >
                        {item}
                      </a>
                    </li>
                  ),
                )}
              </ul>
            </div>
          </div>
          <div className="border-t border-white/5 pt-8 flex flex-col md:flex-row justify-between items-center gap-4">
            <p className="text-xs text-gray-600">
              &copy; {new Date().getFullYear()} Meka PoS. All rights reserved.
            </p>
            <p className="text-xs text-gray-600">
              Built with care for African businesses
            </p>
          </div>
        </div>
      </footer>

      <style jsx>{`
        @keyframes float {
          0%,
          100% {
            transform: translateY(0px);
          }
          50% {
            transform: translateY(-12px);
          }
        }
        @keyframes float-delayed {
          0%,
          100% {
            transform: translateY(0px);
          }
          50% {
            transform: translateY(-8px);
          }
        }
        .animate-float {
          animation: float 6s ease-in-out infinite;
        }
        .animate-float-delayed {
          animation: float-delayed 5s ease-in-out infinite;
          animation-delay: 1s;
        }
      `}</style>
    </div>
  );
}
