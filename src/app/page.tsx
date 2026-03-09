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
} from "lucide-react";

export default function Home() {
  return (
    <div className="min-h-screen bg-white">
      {/* Navigation */}
      <nav className="border-b bg-white/80 backdrop-blur-sm sticky top-0 z-50">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between items-center h-16">
            <div className="flex items-center gap-2">
              <div className="w-8 h-8 bg-primary rounded-lg flex items-center justify-center">
                <ShoppingCart className="w-5 h-5 text-white" />
              </div>
              <span className="text-xl font-bold text-gray-900">KashaPOS</span>
            </div>
            <div className="hidden md:flex items-center gap-8">
              <a
                href="#features"
                className="text-sm text-gray-600 hover:text-gray-900"
              >
                Features
              </a>
              <a
                href="#pricing"
                className="text-sm text-gray-600 hover:text-gray-900"
              >
                Pricing
              </a>
              <a
                href="#products"
                className="text-sm text-gray-600 hover:text-gray-900"
              >
                Products
              </a>
            </div>
            <div className="flex items-center gap-3">
              <Link
                href="/sign-in"
                className="text-sm font-medium text-gray-700 hover:text-gray-900 px-4 py-2"
              >
                Sign In
              </Link>
              <Link
                href="/sign-up"
                className="text-sm font-medium bg-primary text-white px-4 py-2 rounded-lg hover:bg-primary/90 transition-colors"
              >
                Start Free Trial
              </Link>
            </div>
          </div>
        </div>
      </nav>

      {/* Hero */}
      <section className="py-20 lg:py-32">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 text-center">
          <div className="inline-flex items-center gap-2 bg-primary/10 text-primary px-4 py-1.5 rounded-full text-sm font-medium mb-6">
            <Zap className="w-4 h-4" />
            Built for African businesses
          </div>
          <h1 className="text-4xl md:text-6xl font-bold text-gray-900 max-w-4xl mx-auto leading-tight">
            The complete POS platform for your{" "}
            <span className="text-primary">growing business</span>
          </h1>
          <p className="mt-6 text-lg md:text-xl text-gray-600 max-w-2xl mx-auto">
            Manage sales, inventory, purchases, and reports from a single
            system. Multi-branch support, mobile money payments, and offline
            mode included.
          </p>
          <div className="mt-10 flex flex-col sm:flex-row gap-4 justify-center">
            <Link
              href="/sign-up"
              className="inline-flex items-center justify-center gap-2 bg-primary text-white px-8 py-3 rounded-lg text-lg font-medium hover:bg-primary/90 transition-colors"
            >
              Start Free 14-Day Trial
              <ArrowRight className="w-5 h-5" />
            </Link>
            <Link
              href="/sign-in"
              className="inline-flex items-center justify-center gap-2 border border-gray-300 text-gray-700 px-8 py-3 rounded-lg text-lg font-medium hover:bg-gray-50 transition-colors"
            >
              Sign In to Dashboard
            </Link>
          </div>
          <p className="mt-4 text-sm text-gray-500">
            No credit card required. Cancel anytime.
          </p>
        </div>
      </section>

      {/* Features */}
      <section id="features" className="py-20 bg-gray-50">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center mb-16">
            <h2 className="text-3xl font-bold text-gray-900">
              Everything you need to run your business
            </h2>
            <p className="mt-4 text-lg text-gray-600">
              Powerful tools designed for retailers, pharmacies, and clinics
            </p>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
            {[
              {
                icon: ShoppingCart,
                title: "POS Terminal",
                desc: "Fast checkout with barcode scanning, discounts, tax handling, and receipt printing.",
              },
              {
                icon: Package,
                title: "Inventory Management",
                desc: "Track stock across branches, set reorder levels, and manage product variants.",
              },
              {
                icon: BarChart3,
                title: "Reports & Analytics",
                desc: "Sales reports, inventory reports, and business dashboards with real-time data.",
              },
              {
                icon: Users,
                title: "Customer & Vendor Management",
                desc: "Manage customer records, vendor profiles, purchase orders, and invoicing.",
              },
              {
                icon: Smartphone,
                title: "Mobile Money Integration",
                desc: "Accept MTN Mobile Money and Airtel Money payments directly at checkout.",
              },
              {
                icon: Shield,
                title: "Multi-Branch & Roles",
                desc: "Support multiple branches with role-based access for Admins, Managers, and Cashiers.",
              },
              {
                icon: Globe,
                title: "Offline Mode",
                desc: "Continue selling even without internet. Auto-sync when connection is restored.",
              },
              {
                icon: Zap,
                title: "Fast & Cloud-Based",
                desc: "Access your POS from any device. Always up-to-date with automatic backups.",
              },
              {
                icon: CheckCircle2,
                title: "Multi-Tenant SaaS",
                desc: "Each business gets its own isolated workspace. Perfect for franchise operations.",
              },
            ].map((feature, i) => (
              <div
                key={i}
                className="bg-white rounded-xl p-6 border border-gray-200 hover:shadow-lg transition-shadow"
              >
                <div className="w-12 h-12 bg-primary/10 rounded-lg flex items-center justify-center mb-4">
                  <feature.icon className="w-6 h-6 text-primary" />
                </div>
                <h3 className="text-lg font-semibold text-gray-900 mb-2">
                  {feature.title}
                </h3>
                <p className="text-gray-600 text-sm">{feature.desc}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Products */}
      <section id="products" className="py-20">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center mb-16">
            <h2 className="text-3xl font-bold text-gray-900">
              One platform, multiple solutions
            </h2>
            <p className="mt-4 text-lg text-gray-600">
              Tailored POS solutions for different industries
            </p>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
            {[
              {
                name: "Retail POS",
                desc: "For shops, supermarkets, and retail stores. Full inventory, barcode, and multi-branch support.",
                color: "bg-blue-500",
              },
              {
                name: "Pharmacy POS",
                desc: "For pharmacies and drug shops. Expiry tracking, batch management, and regulatory compliance.",
                color: "bg-green-500",
              },
              {
                name: "Clinic POS",
                desc: "For clinics and health centers. Patient billing, service management, and payment tracking.",
                color: "bg-purple-500",
              },
            ].map((product, i) => (
              <div
                key={i}
                className="rounded-xl border border-gray-200 overflow-hidden hover:shadow-lg transition-shadow"
              >
                <div className={`${product.color} h-2`} />
                <div className="p-8">
                  <h3 className="text-xl font-bold text-gray-900 mb-3">
                    {product.name}
                  </h3>
                  <p className="text-gray-600 mb-6">{product.desc}</p>
                  <Link
                    href="/sign-up"
                    className="text-primary font-medium inline-flex items-center gap-1 hover:underline"
                  >
                    Get started <ArrowRight className="w-4 h-4" />
                  </Link>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Pricing */}
      <section id="pricing" className="py-20 bg-gray-50">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center mb-16">
            <h2 className="text-3xl font-bold text-gray-900">
              Simple, transparent pricing
            </h2>
            <p className="mt-4 text-lg text-gray-600">
              Start free, upgrade as you grow
            </p>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-8 max-w-5xl mx-auto">
            {[
              {
                name: "Basic",
                price: "UGX 50,000",
                period: "/month",
                features: [
                  "1 Branch",
                  "2 Users",
                  "POS Terminal",
                  "Basic Reports",
                  "Email Support",
                ],
                cta: "Start Free Trial",
                featured: false,
              },
              {
                name: "Professional",
                price: "UGX 150,000",
                period: "/month",
                features: [
                  "3 Branches",
                  "10 Users",
                  "POS + Inventory",
                  "Advanced Reports",
                  "Mobile Money",
                  "Priority Support",
                ],
                cta: "Start Free Trial",
                featured: true,
              },
              {
                name: "Enterprise",
                price: "UGX 350,000",
                period: "/month",
                features: [
                  "Unlimited Branches",
                  "Unlimited Users",
                  "Full Platform Access",
                  "Custom Reports",
                  "API Access",
                  "Dedicated Support",
                ],
                cta: "Contact Sales",
                featured: false,
              },
            ].map((plan, i) => (
              <div
                key={i}
                className={`rounded-xl border p-8 ${
                  plan.featured
                    ? "border-primary bg-white shadow-xl scale-105"
                    : "border-gray-200 bg-white"
                }`}
              >
                {plan.featured && (
                  <span className="inline-block bg-primary text-white text-xs font-medium px-3 py-1 rounded-full mb-4">
                    Most Popular
                  </span>
                )}
                <h3 className="text-lg font-semibold text-gray-900">
                  {plan.name}
                </h3>
                <div className="mt-4 flex items-baseline gap-1">
                  <span className="text-3xl font-bold text-gray-900">
                    {plan.price}
                  </span>
                  <span className="text-gray-500">{plan.period}</span>
                </div>
                <ul className="mt-6 space-y-3">
                  {plan.features.map((f, j) => (
                    <li
                      key={j}
                      className="flex items-center gap-2 text-sm text-gray-600"
                    >
                      <CheckCircle2 className="w-4 h-4 text-primary flex-shrink-0" />
                      {f}
                    </li>
                  ))}
                </ul>
                <Link
                  href="/sign-up"
                  className={`mt-8 block text-center py-2.5 rounded-lg font-medium text-sm transition-colors ${
                    plan.featured
                      ? "bg-primary text-white hover:bg-primary/90"
                      : "border border-gray-300 text-gray-700 hover:bg-gray-50"
                  }`}
                >
                  {plan.cta}
                </Link>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Footer */}
      <footer className="bg-gray-900 text-gray-400 py-12">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex flex-col md:flex-row justify-between items-center">
            <div className="flex items-center gap-2 mb-4 md:mb-0">
              <div className="w-8 h-8 bg-primary rounded-lg flex items-center justify-center">
                <ShoppingCart className="w-5 h-5 text-white" />
              </div>
              <span className="text-lg font-bold text-white">KashaPOS</span>
            </div>
            <p className="text-sm">
              &copy; {new Date().getFullYear()} KashaPOS. All rights reserved.
            </p>
          </div>
        </div>
      </footer>
    </div>
  );
}
