"use client";

import {
  WifiOff,
  Monitor,
  Download,
  RefreshCw,
  Database,
  Shield,
  Smartphone,
  CheckCircle2,
  Clock,
  HardDrive,
  Cloud,
  Zap,
} from "lucide-react";

const features = [
  {
    icon: WifiOff,
    title: "Offline POS",
    description:
      "Continue processing sales, returns, and payments even without internet. All transactions sync automatically when connectivity is restored.",
    status: "coming_soon" as const,
  },
  {
    icon: Monitor,
    title: "Desktop Application",
    description:
      "Install KashaPOS as a native desktop app on Windows, macOS, or Linux for faster performance and hardware integration.",
    status: "coming_soon" as const,
  },
  {
    icon: Smartphone,
    title: "Mobile App",
    description:
      "Access your POS from Android and iOS devices. Manage inventory, view reports, and process sales from anywhere.",
    status: "coming_soon" as const,
  },
  {
    icon: Database,
    title: "Local Data Cache",
    description:
      "Products, customers, and pricing are cached locally so lookups are instant—even offline.",
    status: "coming_soon" as const,
  },
  {
    icon: RefreshCw,
    title: "Auto Sync",
    description:
      "Offline transactions queue automatically and sync to the cloud in the background once you reconnect. No data is ever lost.",
    status: "coming_soon" as const,
  },
  {
    icon: Shield,
    title: "Conflict Resolution",
    description:
      "Smart merge logic handles inventory conflicts when multiple terminals operate offline simultaneously.",
    status: "coming_soon" as const,
  },
];

const roadmap = [
  {
    quarter: "Q3 2025",
    title: "Offline POS Core",
    items: [
      "Offline sale processing",
      "Local product & customer cache",
      "Auto-sync queue engine",
    ],
  },
  {
    quarter: "Q4 2025",
    title: "Desktop Application",
    items: [
      "Windows & macOS native app",
      "Receipt printer integration",
      "Barcode scanner support",
    ],
  },
  {
    quarter: "Q1 2026",
    title: "Mobile & Advanced",
    items: [
      "Android & iOS apps",
      "Multi-terminal conflict resolution",
      "Offline reports & analytics",
    ],
  },
];

export default function OfflinePage() {
  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
        <div className="flex items-center gap-4">
          <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-gradient-to-br from-sky-500 to-blue-600 shadow-lg shadow-sky-500/20">
            <WifiOff className="h-6 w-6 text-white" />
          </div>
          <div>
            <h1 className="text-2xl font-bold text-gray-900">
              Offline &amp; Desktop
            </h1>
            <p className="text-sm text-gray-500">
              Work without internet &middot; Native desktop &amp; mobile apps
            </p>
          </div>
        </div>
        <span className="inline-flex items-center gap-1.5 rounded-full bg-amber-50 px-3 py-1.5 text-xs font-semibold text-amber-700 ring-1 ring-amber-200">
          <Clock className="h-3.5 w-3.5" />
          Coming Soon
        </span>
      </div>

      {/* Status Banner */}
      <div className="rounded-2xl border border-blue-100 bg-gradient-to-r from-blue-50 to-sky-50 p-5">
        <div className="flex items-start gap-3">
          <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-blue-100">
            <Cloud className="h-5 w-5 text-blue-600" />
          </div>
          <div>
            <h3 className="font-semibold text-blue-900">
              Currently Running Online
            </h3>
            <p className="mt-0.5 text-sm text-blue-700">
              KashaPOS is currently cloud-only. Offline mode and native
              applications are under active development. Your data is securely
              stored in the cloud and accessible from any browser.
            </p>
          </div>
        </div>
      </div>

      {/* Features Grid */}
      <div>
        <h2 className="mb-4 text-lg font-semibold text-gray-900">
          Planned Features
        </h2>
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {features.map((f) => (
            <div
              key={f.title}
              className="group rounded-2xl border border-gray-100 bg-white p-5 shadow-sm transition-shadow hover:shadow-md"
            >
              <div className="mb-3 flex items-center justify-between">
                <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-sky-50 text-sky-600 transition-colors group-hover:bg-sky-100">
                  <f.icon className="h-5 w-5" />
                </div>
                <span className="inline-flex items-center gap-1 rounded-full bg-gray-50 px-2 py-0.5 text-[11px] font-medium text-gray-500">
                  <Clock className="h-3 w-3" />
                  Planned
                </span>
              </div>
              <h3 className="font-semibold text-gray-900">{f.title}</h3>
              <p className="mt-1.5 text-sm leading-relaxed text-gray-500">
                {f.description}
              </p>
            </div>
          ))}
        </div>
      </div>

      {/* Roadmap */}
      <div>
        <h2 className="mb-4 text-lg font-semibold text-gray-900">Roadmap</h2>
        <div className="grid gap-4 sm:grid-cols-3">
          {roadmap.map((phase, idx) => (
            <div
              key={phase.quarter}
              className="rounded-2xl border border-gray-100 bg-white p-5 shadow-sm"
            >
              <div className="mb-3 flex items-center gap-2">
                <span className="flex h-7 w-7 items-center justify-center rounded-lg bg-sky-100 text-xs font-bold text-sky-700">
                  {idx + 1}
                </span>
                <span className="text-sm font-semibold text-gray-900">
                  {phase.quarter}
                </span>
              </div>
              <h3 className="mb-2 font-medium text-gray-800">{phase.title}</h3>
              <ul className="space-y-1.5">
                {phase.items.map((item) => (
                  <li
                    key={item}
                    className="flex items-start gap-2 text-sm text-gray-500"
                  >
                    <CheckCircle2 className="mt-0.5 h-3.5 w-3.5 shrink-0 text-gray-300" />
                    {item}
                  </li>
                ))}
              </ul>
            </div>
          ))}
        </div>
      </div>

      {/* Technical Specs */}
      <div className="rounded-2xl border border-gray-100 bg-white p-5 shadow-sm">
        <h2 className="mb-4 text-lg font-semibold text-gray-900">
          Technical Overview
        </h2>
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          {[
            {
              icon: HardDrive,
              label: "Local Storage",
              value: "IndexedDB + Service Worker",
            },
            {
              icon: RefreshCw,
              label: "Sync Protocol",
              value: "CRDT-based merge",
            },
            {
              icon: Zap,
              label: "Desktop Framework",
              value: "Electron / Tauri",
            },
            {
              icon: Download,
              label: "Install Method",
              value: "PWA + Native Installer",
            },
          ].map((spec) => (
            <div key={spec.label} className="text-center">
              <div className="mx-auto mb-2 flex h-10 w-10 items-center justify-center rounded-xl bg-gray-50">
                <spec.icon className="h-5 w-5 text-gray-400" />
              </div>
              <p className="text-xs font-medium text-gray-400">{spec.label}</p>
              <p className="mt-0.5 text-sm font-semibold text-gray-700">
                {spec.value}
              </p>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
