import type { MetricDef } from "./types";

/**
 * Accounting-tab metrics. Every entry is Tier B (`source: "metrics"`,
 * `template: "quickbooks"`) — there's no local Postgres data source for
 * QuickBooks figures, unlike the other three tabs which have a Tier-A
 * fallback. All entries are gated on `requires: ["accounting_connected"]` so
 * the picker disables them (with a "Connect QuickBooks" reason) until the
 * user has completed the OAuth flow (Phase A).
 *
 * QBO Reports API (ProfitAndLoss, BalanceSheet) return summary figures for a
 * date range; the Query API (Invoice, Bill) returns row-level records for
 * AR/AP detail. `key` selects the fetcher in
 * api-server/src/lib/metrics/quickbooks-reports.ts.
 */
export const ACCOUNTING_METRICS: MetricDef[] = [
  // ── Profit & Loss ──────────────────────────────────────────────────────
  { id: "acct.revenue.total", tab: "accounting", label: "Total Revenue", category: "Profit & Loss", description: "Total income for the period (QuickBooks Profit & Loss report).", unit: "USD", window: "30d", render: "kpi", dataKey: "acct.revenue.total", source: "metrics", defaultSelected: true, template: "quickbooks", templateParams: { key: "acct.revenue.total" }, requires: ["accounting_connected"] },
  { id: "acct.expenses.total", tab: "accounting", label: "Total Expenses", category: "Profit & Loss", description: "Total expenses for the period (QuickBooks Profit & Loss report).", unit: "USD", window: "30d", render: "kpi", dataKey: "acct.expenses.total", source: "metrics", defaultSelected: true, template: "quickbooks", templateParams: { key: "acct.expenses.total" }, requires: ["accounting_connected"] },
  { id: "acct.netIncome", tab: "accounting", label: "Net Income", category: "Profit & Loss", description: "Total revenue minus total expenses for the period.", unit: "USD", window: "30d", render: "kpi", dataKey: "acct.netIncome", source: "metrics", defaultSelected: true, template: "quickbooks", templateParams: { key: "acct.netIncome" }, requires: ["accounting_connected"] },
  { id: "acct.revenue.byMonth", tab: "accounting", label: "Revenue by Month", category: "Profit & Loss", description: "Monthly income breakdown (QuickBooks Profit & Loss, summarized by month).", unit: "USD", window: "all", render: "bar", dataKey: "acct.revenue.byMonth", source: "metrics", defaultSelected: true, template: "quickbooks", templateParams: { key: "acct.revenue.byMonth" }, requires: ["accounting_connected"] },
  { id: "acct.expenses.byCategory", tab: "accounting", label: "Expenses by Category", category: "Profit & Loss", description: "Expense breakdown by account category (QuickBooks Profit & Loss detail).", unit: "USD", window: "30d", render: "donut", dataKey: "acct.expenses.byCategory", source: "metrics", defaultSelected: true, template: "quickbooks", templateParams: { key: "acct.expenses.byCategory" }, requires: ["accounting_connected"] },
  { id: "acct.grossProfitMargin", tab: "accounting", label: "Gross Profit Margin", category: "Profit & Loss", description: "(Revenue − COGS) / Revenue for the period.", unit: "%", window: "30d", render: "kpi", dataKey: "acct.grossProfitMargin", source: "metrics", defaultSelected: false, template: "quickbooks", templateParams: { key: "acct.grossProfitMargin" }, requires: ["accounting_connected"] },

  // ── Balance Sheet ──────────────────────────────────────────────────────
  { id: "acct.cashBalance", tab: "accounting", label: "Cash Balance", category: "Balance Sheet", description: "Total cash and bank account balance (QuickBooks Balance Sheet, as of today).", unit: "USD", window: "all", render: "kpi", dataKey: "acct.cashBalance", source: "metrics", defaultSelected: true, template: "quickbooks", templateParams: { key: "acct.cashBalance" }, requires: ["accounting_connected"] },
  { id: "acct.accountsReceivable", tab: "accounting", label: "Accounts Receivable", category: "Balance Sheet", description: "Total outstanding customer invoices (QuickBooks Balance Sheet).", unit: "USD", window: "all", render: "kpi", dataKey: "acct.accountsReceivable", source: "metrics", defaultSelected: true, template: "quickbooks", templateParams: { key: "acct.accountsReceivable" }, requires: ["accounting_connected"] },
  { id: "acct.accountsPayable", tab: "accounting", label: "Accounts Payable", category: "Balance Sheet", description: "Total outstanding vendor bills (QuickBooks Balance Sheet).", unit: "USD", window: "all", render: "kpi", dataKey: "acct.accountsPayable", source: "metrics", defaultSelected: false, template: "quickbooks", templateParams: { key: "acct.accountsPayable" }, requires: ["accounting_connected"] },
  { id: "acct.currentRatio", tab: "accounting", label: "Current Ratio", category: "Balance Sheet", description: "Current assets / current liabilities (QuickBooks Balance Sheet).", unit: "", window: "all", render: "kpi", dataKey: "acct.currentRatio", source: "metrics", defaultSelected: false, template: "quickbooks", templateParams: { key: "acct.currentRatio" }, requires: ["accounting_connected"] },

  // ── Invoices / receivables detail ──────────────────────────────────────
  { id: "acct.invoices.overdue", tab: "accounting", label: "Overdue Invoices", category: "Invoices", description: "Open invoices past their due date (QuickBooks Invoice query).", unit: "", window: "all", render: "table", dataKey: "acct.invoices.overdue", source: "metrics", defaultSelected: true, template: "quickbooks", templateParams: { key: "acct.invoices.overdue" }, requires: ["accounting_connected"], topN: 50 },
  { id: "acct.invoices.byStatus", tab: "accounting", label: "Invoices by Status", category: "Invoices", description: "Open invoice count grouped by paid/overdue/pending (QuickBooks Invoice query).", unit: "count", window: "all", render: "donut", dataKey: "acct.invoices.byStatus", source: "metrics", defaultSelected: false, template: "quickbooks", templateParams: { key: "acct.invoices.byStatus" }, requires: ["accounting_connected"] },
  { id: "acct.invoices.agingBuckets", tab: "accounting", label: "AR Aging", category: "Invoices", description: "Outstanding receivables grouped by days overdue (0-30/31-60/61-90/90+).", unit: "USD", window: "all", render: "bar", dataKey: "acct.invoices.agingBuckets", source: "metrics", defaultSelected: false, template: "quickbooks", templateParams: { key: "acct.invoices.agingBuckets" }, requires: ["accounting_connected"] },

  // ── Expenses / vendors detail ──────────────────────────────────────────
  { id: "acct.expenses.topVendors", tab: "accounting", label: "Top Vendors by Spend", category: "Expenses", description: "Vendors ranked by total bill amount for the period.", unit: "USD", window: "30d", render: "hbar", dataKey: "acct.expenses.topVendors", source: "metrics", defaultSelected: false, template: "quickbooks", templateParams: { key: "acct.expenses.topVendors" }, requires: ["accounting_connected"] },
  { id: "acct.expenses.byMonth", tab: "accounting", label: "Expenses by Month", category: "Expenses", description: "Monthly expense breakdown (QuickBooks Profit & Loss, summarized by month).", unit: "USD", window: "all", render: "bar", dataKey: "acct.expenses.byMonth", source: "metrics", defaultSelected: false, template: "quickbooks", templateParams: { key: "acct.expenses.byMonth" }, requires: ["accounting_connected"] },
];
