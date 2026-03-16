import Link from "next/link";
import {
  FileText,
  TrendingDown,
  DollarSign,
  Calendar,
  Receipt,
  BarChart3,
} from "lucide-react";

const financeModules = [
  {
    title: "Expenses",
    description: "Track and manage all outgoing operational costs.",
    href: "/dashboard/expenses",
    icon: TrendingDown,
  },
  {
    title: "Invoices",
    description: "Monitor invoice lifecycle, balances, and collections.",
    href: "/dashboard/invoices",
    icon: FileText,
  },
  {
    title: "Cash Flow",
    description: "View report, summary, and quick-period cash insights.",
    href: "/dashboard/cashflow?tab=report",
    icon: DollarSign,
  },
  {
    title: "Fiscal Year Management",
    description: "Configure fiscal years, run summaries, and archive periods.",
    href: "/dashboard/fiscal-years?tab=config",
    icon: Calendar,
  },
  {
    title: "Taxes",
    description: "Review tax settings and compliance-related totals.",
    href: "/dashboard/taxes",
    icon: Receipt,
  },
  {
    title: "Reports",
    description: "Export and analyze finance-driven performance reports.",
    href: "/dashboard/reports",
    icon: BarChart3,
  },
];

export default function FinancePage() {
  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-gray-900">Finance</h1>
        <p className="mt-1 text-sm text-gray-500">
          Central finance workspace with clear access to expenses, invoicing,
          cash flow, fiscal-year controls, taxes, and reports.
        </p>
      </div>

      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
        {financeModules.map((item) => (
          <Link
            key={item.title}
            href={item.href}
            className="group rounded-2xl border border-gray-100 bg-white p-5 shadow-sm transition-all hover:-translate-y-0.5 hover:border-orange-200 hover:shadow-md"
          >
            <div className="flex items-center gap-3">
              <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-orange-50 text-orange-600">
                <item.icon className="h-5 w-5" />
              </div>
              <h2 className="text-sm font-semibold text-gray-900 group-hover:text-orange-600">
                {item.title}
              </h2>
            </div>
            <p className="mt-3 text-sm text-gray-500">{item.description}</p>
          </Link>
        ))}
      </div>
    </div>
  );
}
