"use client";

import { useEffect, useState } from "react";
import { createClient } from "@/lib/supabase/client";
import { CommissionRule } from "@/types";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Separator } from "@/components/ui/separator";
import { Skeleton } from "@/components/ui/skeleton";
import { Settings, Store, Percent, Plus, Trash2, Save, KeyRound, Eye, EyeOff } from "lucide-react";
import { toast } from "sonner";

interface StoreSettings {
  store_name: string;
  currency: string;
  monthly_target: number;
  low_stock_threshold: number;
  timezone: string;
}

interface CommissionTierInput {
  min_sales: number;
  max_sales: number | "";
  rate: number;
}

export default function SettingsPage() {
  const supabase = createClient();
  const [settings, setSettings] = useState<StoreSettings>({
    store_name: "",
    currency: "QAR",
    monthly_target: 0,
    low_stock_threshold: 10,
    timezone: "Asia/Qatar",
  });
  const [rules, setRules] = useState<CommissionRule[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [savingRule, setSavingRule] = useState(false);

  // New commission rule form
  const [newRuleName, setNewRuleName] = useState("");
  const [newRuleType, setNewRuleType] = useState<"fixed" | "tiered">("tiered");
  const [fixedRate, setFixedRate] = useState(2);
  const [tiers, setTiers] = useState<CommissionTierInput[]>([
    { min_sales: 0, max_sales: 10000, rate: 1 },
    { min_sales: 10001, max_sales: 20000, rate: 2 },
    { min_sales: 20001, max_sales: "", rate: 3 },
  ]);

  // Password change
  const [pwCurrent, setPwCurrent] = useState("");
  const [pwNew, setPwNew] = useState("");
  const [pwConfirm, setPwConfirm] = useState("");
  const [showPw, setShowPw] = useState(false);
  const [changingPw, setChangingPw] = useState(false);

  useEffect(() => { loadData(); }, []);

  async function changePassword() {
    if (!pwCurrent || !pwNew || !pwConfirm) { toast.error("Fill all password fields"); return; }
    if (pwNew.length < 6) { toast.error("New password must be at least 6 characters"); return; }
    if (pwNew !== pwConfirm) { toast.error("New passwords do not match"); return; }
    setChangingPw(true);
    // Verify current password by re-authenticating
    const { data: { user } } = await supabase.auth.getUser();
    const email = user?.email ?? "";
    const { error: signInErr } = await supabase.auth.signInWithPassword({ email, password: pwCurrent });
    if (signInErr) { toast.error("Current password is incorrect"); setChangingPw(false); return; }
    const { error } = await supabase.auth.updateUser({ password: pwNew });
    if (error) { toast.error(error.message); } else {
      toast.success("Password changed successfully!");
      setPwCurrent(""); setPwNew(""); setPwConfirm("");
    }
    setChangingPw(false);
  }

  async function loadData() {
    setLoading(true);
    const [settingsRes, rulesRes] = await Promise.all([
      supabase.from("settings").select("*").limit(1).single(),
      supabase.from("commission_rules").select("*").order("created_at"),
    ]);
    if (settingsRes.data) {
      setSettings({
        store_name: settingsRes.data.store_name,
        currency: settingsRes.data.currency,
        monthly_target: settingsRes.data.monthly_target ?? 0,
        low_stock_threshold: settingsRes.data.low_stock_threshold,
        timezone: settingsRes.data.timezone,
      });
    }
    setRules((rulesRes.data as CommissionRule[]) ?? []);
    setLoading(false);
  }

  async function saveSettings() {
    setSaving(true);
    const { data: existing } = await supabase.from("settings").select("id").limit(1).single();
    const payload = { ...settings };

    let error;
    if (existing) {
      ({ error } = await supabase.from("settings").update(payload).eq("id", existing.id));
    } else {
      ({ error } = await supabase.from("settings").insert(payload));
    }

    if (error) { toast.error(error.message); } else { toast.success("Settings saved!"); }
    setSaving(false);
  }

  async function saveCommissionRule() {
    if (!newRuleName.trim()) { toast.error("Enter a rule name"); return; }
    setSavingRule(true);

    const payload = newRuleType === "fixed"
      ? { name: newRuleName, type: "fixed", fixed_rate: fixedRate, is_active: true }
      : {
          name: newRuleName,
          type: "tiered",
          tiers: tiers.map((t) => ({ min_sales: t.min_sales, max_sales: t.max_sales || undefined, rate: t.rate })),
          is_active: true,
        };

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const { error } = await supabase.from("commission_rules").insert(payload as any);
    if (error) { toast.error(error.message); } else { toast.success("Commission rule added!"); setNewRuleName(""); }
    setSavingRule(false);
    loadData();
  }

  async function deleteRule(id: string) {
    const { error } = await supabase.from("commission_rules").delete().eq("id", id);
    if (error) { toast.error(error.message); return; }
    toast.success("Rule deleted");
    loadData();
  }

  function addTier() {
    const last = tiers[tiers.length - 1];
    const nextMin = last ? (typeof last.max_sales === "number" ? last.max_sales + 1 : 0) : 0;
    setTiers([...tiers, { min_sales: nextMin, max_sales: "", rate: 4 }]);
  }

  if (loading) {
    return (
      <div className="space-y-4">
        <Skeleton className="h-64 rounded-2xl" />
        <Skeleton className="h-64 rounded-2xl" />
      </div>
    );
  }

  return (
    <div className="space-y-4 max-w-3xl">
      {/* Change Password */}
      <Card className="border-border">
        <CardHeader className="pb-3">
          <CardTitle className="text-sm font-semibold flex items-center gap-2">
            <KeyRound className="h-4 w-4 text-primary" />
            Change Password
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            <div className="space-y-1.5">
              <Label>Current Password</Label>
              <div className="relative">
                <Input
                  type={showPw ? "text" : "password"}
                  value={pwCurrent}
                  onChange={(e) => setPwCurrent(e.target.value)}
                  placeholder="Enter current password"
                  className="pr-9"
                />
                <button
                  type="button"
                  className="absolute right-2.5 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground cursor-pointer"
                  onClick={() => setShowPw((v) => !v)}
                >
                  {showPw ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                </button>
              </div>
            </div>
            <div className="space-y-1.5">
              <Label>New Password</Label>
              <Input
                type={showPw ? "text" : "password"}
                value={pwNew}
                onChange={(e) => setPwNew(e.target.value)}
                placeholder="Min 6 characters"
              />
            </div>
            <div className="space-y-1.5">
              <Label>Confirm New Password</Label>
              <Input
                type={showPw ? "text" : "password"}
                value={pwConfirm}
                onChange={(e) => setPwConfirm(e.target.value)}
                placeholder="Repeat new password"
              />
            </div>
          </div>
          <Button onClick={changePassword} disabled={changingPw} className="gap-2">
            <KeyRound className="h-4 w-4" />
            {changingPw ? "Updating..." : "Update Password"}
          </Button>
        </CardContent>
      </Card>

      {/* Store Settings */}
      <Card className="border-border">
        <CardHeader className="pb-3">
          <CardTitle className="text-sm font-semibold flex items-center gap-2">
            <Store className="h-4 w-4 text-primary" />
            Store Settings
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div className="space-y-1.5">
              <Label>Store Name</Label>
              <Input
                value={settings.store_name}
                onChange={(e) => setSettings((p) => ({ ...p, store_name: e.target.value }))}
                placeholder="My Retail Store"
              />
            </div>
            <div className="space-y-1.5">
              <Label>Currency</Label>
              <Select
                value={settings.currency}
                onValueChange={(v) => setSettings((p) => ({ ...p, currency: v ?? p.currency }))}
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="QAR">QAR — Qatari Riyal</SelectItem>
                  <SelectItem value="USD">USD — US Dollar</SelectItem>
                  <SelectItem value="AED">AED — UAE Dirham</SelectItem>
                  <SelectItem value="SAR">SAR — Saudi Riyal</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-1.5">
              <Label>Monthly Sales Target (QAR)</Label>
              <Input
                type="number"
                value={settings.monthly_target}
                onChange={(e) => setSettings((p) => ({ ...p, monthly_target: Number(e.target.value) }))}
              />
            </div>
            <div className="space-y-1.5">
              <Label>Low Stock Alert Threshold</Label>
              <Input
                type="number"
                value={settings.low_stock_threshold}
                onChange={(e) => setSettings((p) => ({ ...p, low_stock_threshold: Number(e.target.value) }))}
              />
            </div>
            <div className="space-y-1.5">
              <Label>Timezone</Label>
              <Select
                value={settings.timezone}
                onValueChange={(v) => setSettings((p) => ({ ...p, timezone: v ?? p.timezone }))}
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="Asia/Qatar">Asia/Qatar (UTC+3)</SelectItem>
                  <SelectItem value="Asia/Dubai">Asia/Dubai (UTC+4)</SelectItem>
                  <SelectItem value="Asia/Kolkata">Asia/Kolkata (UTC+5:30)</SelectItem>
                  <SelectItem value="UTC">UTC</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>
          <Button onClick={saveSettings} disabled={saving} className="gap-2">
            <Save className="h-4 w-4" />
            {saving ? "Saving..." : "Save Settings"}
          </Button>
        </CardContent>
      </Card>

      {/* Commission Rules */}
      <Card className="border-border">
        <CardHeader className="pb-3">
          <CardTitle className="text-sm font-semibold flex items-center gap-2">
            <Percent className="h-4 w-4 text-primary" />
            Commission Rules
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          {/* Existing Rules */}
          {rules.length > 0 && (
            <div className="space-y-2">
              {rules.map((rule) => (
                <div key={rule.id} className="flex items-start justify-between p-3 rounded-xl border border-border">
                  <div>
                    <div className="flex items-center gap-2">
                      <p className="font-medium text-sm">{rule.name}</p>
                      <Badge variant={rule.is_active ? "default" : "secondary"} className="text-[10px]">
                        {rule.is_active ? "Active" : "Inactive"}
                      </Badge>
                      <Badge variant="outline" className="text-[10px] capitalize">{rule.type}</Badge>
                    </div>
                    {rule.type === "fixed" && (
                      <p className="text-xs text-muted-foreground mt-1">{rule.fixed_rate}% flat commission</p>
                    )}
                    {rule.type === "tiered" && rule.tiers && (
                      <div className="flex flex-wrap gap-1.5 mt-1">
                        {(rule.tiers as { min_sales: number; max_sales?: number; rate: number }[]).map((t, i) => (
                          <span key={i} className="text-[10px] bg-muted px-2 py-0.5 rounded-full">
                            {t.min_sales.toLocaleString()}–{t.max_sales ? t.max_sales.toLocaleString() : "∞"} = {t.rate}%
                          </span>
                        ))}
                      </div>
                    )}
                  </div>
                  <Button
                    size="icon"
                    variant="ghost"
                    className="h-7 w-7 cursor-pointer text-muted-foreground hover:text-destructive shrink-0"
                    onClick={() => deleteRule(rule.id)}
                  >
                    <Trash2 className="h-3.5 w-3.5" />
                  </Button>
                </div>
              ))}
            </div>
          )}

          <Separator />

          {/* Add New Rule */}
          <div>
            <p className="text-sm font-medium mb-3">Add New Rule</p>
            <div className="space-y-3">
              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-1.5">
                  <Label>Rule Name</Label>
                  <Input value={newRuleName} onChange={(e) => setNewRuleName(e.target.value)} placeholder="Standard Commission" />
                </div>
                <div className="space-y-1.5">
                  <Label>Type</Label>
                  <Select value={newRuleType} onValueChange={(v) => setNewRuleType(v as "fixed" | "tiered")}>
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="fixed">Fixed Rate</SelectItem>
                      <SelectItem value="tiered">Tiered (Sales-based)</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>

              {newRuleType === "fixed" ? (
                <div className="space-y-1.5">
                  <Label>Commission Rate (%)</Label>
                  <Input
                    type="number"
                    step="0.01"
                    value={fixedRate}
                    onChange={(e) => setFixedRate(Number(e.target.value))}
                    className="max-w-xs"
                  />
                </div>
              ) : (
                <div className="space-y-2">
                  <Label>Tiers</Label>
                  {tiers.map((tier, i) => (
                    <div key={i} className="flex items-center gap-2">
                      <Input
                        type="number"
                        value={tier.min_sales}
                        onChange={(e) => setTiers((t) => t.map((x, j) => j === i ? { ...x, min_sales: Number(e.target.value) } : x))}
                        placeholder="Min"
                        className="w-24"
                      />
                      <span className="text-muted-foreground text-xs">—</span>
                      <Input
                        type="number"
                        value={tier.max_sales}
                        onChange={(e) => setTiers((t) => t.map((x, j) => j === i ? { ...x, max_sales: e.target.value ? Number(e.target.value) : "" } : x))}
                        placeholder="Max (∞)"
                        className="w-24"
                      />
                      <span className="text-muted-foreground text-xs">=</span>
                      <Input
                        type="number"
                        step="0.01"
                        value={tier.rate}
                        onChange={(e) => setTiers((t) => t.map((x, j) => j === i ? { ...x, rate: Number(e.target.value) } : x))}
                        placeholder="%"
                        className="w-16"
                      />
                      <span className="text-xs text-muted-foreground">%</span>
                      {tiers.length > 1 && (
                        <Button
                          size="icon"
                          variant="ghost"
                          className="h-7 w-7 cursor-pointer"
                          onClick={() => setTiers((t) => t.filter((_, j) => j !== i))}
                        >
                          <Trash2 className="h-3 w-3" />
                        </Button>
                      )}
                    </div>
                  ))}
                  <Button variant="outline" size="sm" onClick={addTier} className="gap-1.5 mt-1">
                    <Plus className="h-3.5 w-3.5" /> Add Tier
                  </Button>
                </div>
              )}

              <Button onClick={saveCommissionRule} disabled={savingRule} className="gap-2">
                <Plus className="h-4 w-4" />
                {savingRule ? "Saving..." : "Add Rule"}
              </Button>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
