import { useState } from "react";
import { CreditCard, Download, Zap, Loader2, CheckCircle2 } from "lucide-react";

const INVOICES = [
  { id: "INV-001", date: "2024-01-15", amount: "₱1,499", status: "paid" },
  { id: "INV-002", date: "2024-02-15", amount: "₱1,499", status: "paid" },
  { id: "INV-003", date: "2024-03-15", amount: "₱4,999", status: "paid" },
];

export default function BillingPage() {
  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-xl font-semibold text-foreground">Billing & Subscription</h2>
        <p className="mt-1 text-sm text-muted-foreground">
          Manage your plan, payment method, and invoices
        </p>
      </div>

      {/* Current Plan */}
      <div className="rounded-xl border border-border bg-background p-6">
        <div className="flex items-center justify-between">
          <div>
            <p className="text-sm text-muted-foreground">Current Plan</p>
            <h3 className="mt-1 text-2xl font-bold text-foreground">Growth Plan</h3>
            <p className="mt-1 text-sm text-muted-foreground">₱4,999/month - Renews on April 15, 2024</p>
          </div>
          <a href="/pricing" className="btn-primary h-10 px-4 text-sm">
            <Zap className="h-4 w-4" />
            Upgrade Plan
          </a>
        </div>

        <div className="mt-6 grid grid-cols-1 gap-4 sm:grid-cols-4">
          <div className="rounded-lg bg-secondary/50 p-4">
            <p className="text-xs text-muted-foreground">Seats Used</p>
            <p className="mt-1 text-xl font-semibold">3 / 5</p>
          </div>
          <div className="rounded-lg bg-secondary/50 p-4">
            <p className="text-xs text-muted-foreground">AI Replies Used</p>
            <p className="mt-1 text-xl font-semibold">1,234 / 5,000</p>
          </div>
          <div className="rounded-lg bg-secondary/50 p-4">
            <p className="text-xs text-muted-foreground">Channels Connected</p>
            <p className="mt-1 text-xl font-semibold">3 / All</p>
          </div>
          <div className="rounded-lg bg-secondary/50 p-4">
            <p className="text-xs text-muted-foreground">Storage Used</p>
            <p className="mt-1 text-xl font-semibold">2.1 GB</p>
          </div>
        </div>
      </div>

      {/* Payment Method */}
      <div className="rounded-xl border border-border bg-background p-6">
        <h3 className="font-semibold text-foreground">Payment Method</h3>
        <div className="mt-4 flex items-center gap-4">
          <div className="flex h-12 w-12 items-center justify-center rounded-lg bg-blue-100">
            <CreditCard className="h-6 w-6 text-blue-600" />
          </div>
          <div className="flex-1">
            <p className="font-medium text-foreground">Visa ending in 4242</p>
            <p className="text-sm text-muted-foreground">Expires 12/2025</p>
          </div>
          <button className="btn-surface h-9 px-3 text-xs">
            Update
          </button>
        </div>
      </div>

      {/* Invoices */}
      <div className="rounded-xl border border-border bg-background overflow-hidden">
        <div className="p-6 border-b border-border">
          <h3 className="font-semibold text-foreground">Invoice History</h3>
        </div>
        <div className="divide-y divide-border">
          {INVOICES.map((invoice) => (
            <div key={invoice.id} className="flex items-center gap-4 px-6 py-4 hover:bg-secondary/20 transition-colors">
              <div className="flex-1">
                <p className="font-medium text-foreground">{invoice.id}</p>
                <p className="text-sm text-muted-foreground">{invoice.date}</p>
              </div>
              <p className="font-semibold text-foreground">{invoice.amount}</p>
              <span className="rounded-full bg-green-100 px-2.5 py-1 text-xs font-medium text-green-700">
                {invoice.status.charAt(0).toUpperCase() + invoice.status.slice(1)}
              </span>
              <button className="p-2 text-muted-foreground hover:text-foreground hover:bg-secondary rounded-lg transition-colors">
                <Download className="h-4 w-4" />
              </button>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}