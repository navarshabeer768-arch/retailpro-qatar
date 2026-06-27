"use client";

import { useEffect, useState } from "react";
import { createClient } from "@/lib/supabase/client";
import { formatCurrency, formatDate } from "@/lib/utils";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { Alert, AlertDescription } from "@/components/ui/alert";
import {
  TrendingUp, TrendingDown, DollarSign, CreditCard, Banknote, Users,
  Package, AlertTriangle, Trophy, ArrowUpRight, ArrowDownRight, Receipt,
  Calendar
} from "lucide-react";
import {
  AreaChart, Area, BarChart, Bar, XAxis, YAxis, CartesianGrid,
  Tooltip, ResponsiveContainer, Legend
} from "recharts";
import { format, subDays } from "date-fns";

interface StatsCard {
  title: string;
  value: string;
  icon: React.ElementType;
  color: string;
  change?: number;
}

interface SalesData {
  date: string;
  cash: number;
  card: number;
  credit: number;
  total: number;
}

interface StaffRanking {
  name: string;
  total_sales: number;
  rank: number;
}

interface LowStockItem {
  name: string;
  current_stock: number;
  low_stock_threshold: number;
}

export default function DashboardPage() {
  const supabase = createClient();
  const today = format(new Date(), "yyyy-MM-dd");
  const currentMonth = format(new Date(), "yyyy-MM");

  const [loading, setLoading] = useState(true);
  const [todaySales, setTodaySales] = useState({ cash: 0, card: 0, credit: 0, total: 0, count: 0 });
  const [monthlySales, setMonthlySales] = useState(0);
  const [monthlyExpenses, setMonthlyExpenses] = useState(0);
  const [stockValue, setStockValue] = useState(0);
  const [staffCount, setStaffCount] = useState(0);
  const [topPerformer, setTopPerformer] = useState<{ name: string; sales: number } | null>(null);
  const [salaryPayable, setSalaryPayable] = useState(0);
  const [lowStockItems, setLowStockItems] = useState<LowStockItem[]>([]);
  const [weekSalesData, setWeekSalesData] = useState<SalesData[]>([]);
  const [staffLeaderboard, setStaffLeaderboard] = useState<StaffRanking[]>([]);

  useEffect(() => {
    loadDashboard();
  }, []);

  async function loadDashboard() {
    setLoading(true);
    try {
      await Promise.all([
        loadTodaySales(),
        loadMonthlySales(),
        loadMonthlyExpenses(),
        loadStockValue(),
        loadStaffCount(),
        loadLowStock(),
        loadWeekSales(),
        loadStaffLeaderboard(),
        loadSalaryPayable(),
      ]);
    } finally {
      setLoading(false);
    }
  }

  async function loadTodaySales() {
    const { data } = await supabase
      .from("daily_sales")
      .select("cash_sales,card_sales,credit_sales,total_sales")
      .eq("sale_date", today);

    if (data) {
      const agg = data.reduce(
        (acc, r) => ({
          cash: acc.cash + r.cash_sales,
          card: acc.card + r.card_sales,
          credit: acc.credit + r.credit_sales,
          total: acc.total + r.total_sales,
          count: acc.count + 1,
        }),
        { cash: 0, card: 0, credit: 0, total: 0, count: 0 }
      );
      setTodaySales(agg);
    }
  }

  async function loadMonthlySales() {
    const start = `${currentMonth}-01`;
    const end = `${currentMonth}-31`;
    const { data } = await supabase
      .from("daily_sales")
      .select("total_sales")
      .gte("sale_date", start)
      .lte("sale_date", end);
    if (data) setMonthlySales(data.reduce((s, r) => s + r.total_sales, 0));
  }

  async function loadMonthlyExpenses() {
    const start = `${currentMonth}-01`;
    const end = `${currentMonth}-31`;
    const { data } = await supabase
      .from("expenses")
      .select("amount")
      .gte("expense_date", start)
      .lte("expense_date", end);
    if (data) setMonthlyExpenses(data.reduce((s, r) => s + r.amount, 0));
  }

  async function loadStockValue() {
    const { data } = await supabase.from("products").select("current_stock,sell_price").eq("is_active", true);
    if (data) setStockValue(data.reduce((s, r) => s + r.current_stock * r.sell_price, 0));
  }

  async function loadStaffCount() {
    const { count } = await supabase.from("staff").select("*", { count: "exact", head: true }).eq("is_active", true);
    setStaffCount(count ?? 0);
  }

  async function loadLowStock() {
    const { data } = await supabase
      .from("products")
      .select("name,current_stock,low_stock_threshold")
      .eq("is_active", true);
    const low = (data ?? []).filter((p) => p.current_stock <= p.low_stock_threshold).slice(0, 5);
    setLowStockItems(low);
  }

  async function loadWeekSales() {
    const days = Array.from({ length: 7 }, (_, i) => format(subDays(new Date(), 6 - i), "yyyy-MM-dd"));
    const { data } = await supabase
      .from("daily_sales")
      .select("sale_date,cash_sales,card_sales,credit_sales,total_sales")
      .in("sale_date", days);

    const map = new Map(data?.map((r) => [r.sale_date, r]) ?? []);
    setWeekSalesData(
      days.map((d) => ({
        date: format(new Date(d), "EEE"),
        cash: map.get(d)?.cash_sales ?? 0,
        card: map.get(d)?.card_sales ?? 0,
        credit: map.get(d)?.credit_sales ?? 0,
        total: map.get(d)?.total_sales ?? 0,
      }))
    );
  }

  async function loadStaffLeaderboard() {
    const start = `${currentMonth}-01`;
    const end = `${currentMonth}-31`;
    const { data } = await supabase
      .from("daily_sales")
      .select("staff_id,total_sales,staff(name)")
      .gte("sale_date", start)
      .lte("sale_date", end);

    if (data) {
      const map = new Map<string, { name: string; total: number }>();
      for (const r of data) {
        const staffObj = r.staff as { name: string } | { name: string }[] | null;
        const name = Array.isArray(staffObj) ? (staffObj[0]?.name ?? "Unknown") : (staffObj?.name ?? "Unknown");
        const cur = map.get(r.staff_id) ?? { name, total: 0 };
        map.set(r.staff_id, { name, total: cur.total + r.total_sales });
      }
      const sorted = [...map.values()]
        .sort((a, b) => b.total - a.total)
        .slice(0, 5)
        .map((s, i) => ({ name: s.name, total_sales: s.total, rank: i + 1 }));
      setStaffLeaderboard(sorted);
      if (sorted[0]) setTopPerformer({ name: sorted[0].name, sales: sorted[0].total_sales });
    }
  }

  async function loadSalaryPayable() {
    const { data } = await supabase.from("salaries").select("total_salary").eq("month", currentMonth);
    if (data) setSalaryPayable(data.reduce((s, r) => s + r.total_salary, 0));
  }

  const statCards: StatsCard[] = [
    { title: "Today's Sales", value: formatCurrency(todaySales.total), icon: TrendingUp, color: "text-primary" },
    { title: "Cash Sales", value: formatCurrency(todaySales.cash), icon: Banknote, color: "text-emerald-500" },
    { title: "Card Sales", value: formatCurrency(todaySales.card), icon: CreditCard, color: "text-blue-500" },
    { title: "Credit Sales", value: formatCurrency(todaySales.credit), icon: Receipt, color: "text-amber-500" },
    { title: "Monthly Sales", value: formatCurrency(monthlySales), icon: Calendar, color: "text-violet-500" },
    { title: "Monthly Expenses", value: formatCurrency(monthlyExpenses), icon: ArrowDownRight, color: "text-red-500" },
    { title: "Stock Value", value: formatCurrency(stockValue), icon: Package, color: "text-cyan-500" },
    { title: "Salary Payable", value: formatCurrency(salaryPayable), icon: DollarSign, color: "text-orange-500" },
  ];

  if (loading) {
    return (
      <div className="space-y-6">
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
          {Array.from({ length: 8 }).map((_, i) => (
            <Skeleton key={i} className="h-28 rounded-2xl" />
          ))}
        </div>
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
          <Skeleton className="h-72 rounded-2xl" />
          <Skeleton className="h-72 rounded-2xl" />
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Stats Grid */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
        {statCards.map((stat) => (
          <Card key={stat.title} className="border-border hover:border-primary/30 transition-colors">
            <CardContent className="p-4">
              <div className="flex items-start justify-between">
                <div className="min-w-0">
                  <p className="text-xs text-muted-foreground truncate">{stat.title}</p>
                  <p className="text-lg font-bold mt-1 truncate">{stat.value}</p>
                </div>
                <div className={`p-2 rounded-xl bg-current/10 shrink-0 ml-2`}>
                  <stat.icon className={`h-4 w-4 ${stat.color}`} />
                </div>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

      {/* Charts Row */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        {/* Weekly Sales Area Chart */}
        <Card className="border-border">
          <CardHeader className="pb-3">
            <CardTitle className="text-sm font-semibold">Weekly Sales (Last 7 Days)</CardTitle>
          </CardHeader>
          <CardContent>
            <ResponsiveContainer width="100%" height={220}>
              <AreaChart data={weekSalesData}>
                <defs>
                  <linearGradient id="cashGrad" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#22c55e" stopOpacity={0.3} />
                    <stop offset="95%" stopColor="#22c55e" stopOpacity={0} />
                  </linearGradient>
                  <linearGradient id="cardGrad" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#3b82f6" stopOpacity={0.3} />
                    <stop offset="95%" stopColor="#3b82f6" stopOpacity={0} />
                  </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="3 3" stroke="currentColor" strokeOpacity={0.05} />
                <XAxis dataKey="date" tick={{ fontSize: 11, fill: "currentColor", opacity: 0.5 }} axisLine={false} tickLine={false} />
                <YAxis tick={{ fontSize: 10, fill: "currentColor", opacity: 0.5 }} axisLine={false} tickLine={false} tickFormatter={(v) => `${(v / 1000).toFixed(0)}k`} />
                <Tooltip
                  contentStyle={{ background: "hsl(var(--card))", border: "1px solid hsl(var(--border))", borderRadius: "12px", fontSize: 12 }}
                  formatter={(v: unknown) => formatCurrency(Number(v))}
                />
                <Area type="monotone" dataKey="cash" stroke="#22c55e" fill="url(#cashGrad)" strokeWidth={2} name="Cash" />
                <Area type="monotone" dataKey="card" stroke="#3b82f6" fill="url(#cardGrad)" strokeWidth={2} name="Card" />
              </AreaChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>

        {/* Staff Leaderboard */}
        <Card className="border-border">
          <CardHeader className="pb-3">
            <div className="flex items-center justify-between">
              <CardTitle className="text-sm font-semibold">Staff Leaderboard</CardTitle>
              <Badge variant="secondary" className="text-xs">{formatDate(new Date(), "MMM yyyy")}</Badge>
            </div>
          </CardHeader>
          <CardContent>
            {staffLeaderboard.length === 0 ? (
              <div className="flex flex-col items-center justify-center h-40 text-muted-foreground">
                <Users className="h-8 w-8 mb-2 opacity-30" />
                <p className="text-sm">No sales data this month</p>
              </div>
            ) : (
              <div className="space-y-3">
                {staffLeaderboard.map((s) => (
                  <div key={s.rank} className="flex items-center gap-3">
                    <div className={`flex h-7 w-7 items-center justify-center rounded-full text-xs font-bold shrink-0 ${
                      s.rank === 1 ? "bg-amber-500 text-white" :
                      s.rank === 2 ? "bg-slate-400 text-white" :
                      s.rank === 3 ? "bg-amber-700 text-white" :
                      "bg-muted text-muted-foreground"
                    }`}>
                      {s.rank === 1 ? <Trophy className="h-3.5 w-3.5" /> : s.rank}
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-medium truncate">{s.name}</p>
                      <div className="mt-1 h-1.5 rounded-full bg-muted overflow-hidden">
                        <div
                          className="h-full rounded-full bg-primary"
                          style={{ width: `${staffLeaderboard[0] ? (s.total_sales / staffLeaderboard[0].total_sales) * 100 : 0}%` }}
                        />
                      </div>
                    </div>
                    <p className="text-sm font-semibold shrink-0">{formatCurrency(s.total_sales)}</p>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>
      </div>

      {/* Bottom Row */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
        {/* Today's Summary */}
        <Card className="border-border">
          <CardHeader className="pb-3">
            <CardTitle className="text-sm font-semibold">Today&apos;s Summary</CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            <div className="flex justify-between items-center">
              <span className="text-sm text-muted-foreground">Staff Reported</span>
              <Badge variant="secondary">{todaySales.count}</Badge>
            </div>
            <div className="flex justify-between items-center">
              <span className="text-sm text-muted-foreground">Top Performer</span>
              <span className="text-sm font-medium">{topPerformer?.name ?? "—"}</span>
            </div>
            <div className="flex justify-between items-center">
              <span className="text-sm text-muted-foreground">Active Staff</span>
              <Badge variant="outline">{staffCount}</Badge>
            </div>
            <div className="flex justify-between items-center border-t border-border pt-3">
              <span className="text-sm font-medium">Total Sales</span>
              <span className="font-bold text-primary">{formatCurrency(todaySales.total)}</span>
            </div>
          </CardContent>
        </Card>

        {/* Sales Bar Chart */}
        <Card className="border-border lg:col-span-2">
          <CardHeader className="pb-3">
            <CardTitle className="text-sm font-semibold">Sales by Type (This Week)</CardTitle>
          </CardHeader>
          <CardContent>
            <ResponsiveContainer width="100%" height={160}>
              <BarChart data={weekSalesData} barSize={14}>
                <CartesianGrid strokeDasharray="3 3" stroke="currentColor" strokeOpacity={0.05} vertical={false} />
                <XAxis dataKey="date" tick={{ fontSize: 11, fill: "currentColor", opacity: 0.5 }} axisLine={false} tickLine={false} />
                <YAxis tick={{ fontSize: 10, fill: "currentColor", opacity: 0.5 }} axisLine={false} tickLine={false} tickFormatter={(v) => `${(v / 1000).toFixed(0)}k`} />
                <Tooltip
                  contentStyle={{ background: "hsl(var(--card))", border: "1px solid hsl(var(--border))", borderRadius: "12px", fontSize: 12 }}
                  formatter={(v: unknown) => formatCurrency(Number(v))}
                />
                <Bar dataKey="cash" fill="#22c55e" radius={[4, 4, 0, 0]} name="Cash" />
                <Bar dataKey="card" fill="#3b82f6" radius={[4, 4, 0, 0]} name="Card" />
                <Bar dataKey="credit" fill="#f59e0b" radius={[4, 4, 0, 0]} name="Credit" />
                <Legend iconSize={8} iconType="circle" wrapperStyle={{ fontSize: 11 }} />
              </BarChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>
      </div>

      {/* Low Stock Alerts */}
      {lowStockItems.length > 0 && (
        <Alert className="border-amber-500/30 bg-amber-500/5">
          <AlertTriangle className="h-4 w-4 text-amber-500" />
          <AlertDescription>
            <span className="font-semibold text-amber-500">Low Stock Alert:</span>
            <span className="ml-2 text-sm">
              {lowStockItems.map((i) => `${i.name} (${i.current_stock})`).join(", ")}
            </span>
          </AlertDescription>
        </Alert>
      )}
    </div>
  );
}
