"use client";

import { usePathname } from "next/navigation";
import { Bell, User } from "lucide-react";
import { MobileNav } from "./mobile-nav";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { format } from "date-fns";

const PAGE_TITLES: Record<string, string> = {
  "/dashboard": "Dashboard",
  "/staff": "Staff Management",
  "/products": "Product Management",
  "/sales": "Daily Sales Entry",
  "/stock": "Closing Stock Entry",
  "/expenses": "Expenses",
  "/salary": "Salary Management",
  "/reports": "Reports",
  "/settings": "Settings",
};

export function Topbar() {
  const pathname = usePathname();
  const title = PAGE_TITLES[pathname] ?? "RetailPro";
  const today = format(new Date(), "EEE, dd MMM yyyy");

  return (
    <header className="sticky top-0 z-30 flex h-16 items-center border-b border-border bg-background/80 backdrop-blur-sm px-4 lg:px-6">
      <MobileNav />
      <div className="flex flex-1 items-center justify-between ml-2 lg:ml-0">
        <div>
          <h1 className="text-lg font-semibold">{title}</h1>
          <p className="text-xs text-muted-foreground hidden sm:block">{today}</p>
        </div>
        <div className="flex items-center gap-2">
          <Button variant="ghost" size="icon" className="relative cursor-pointer">
            <Bell className="h-4.5 w-4.5" />
            <Badge className="absolute -top-1 -right-1 h-4 w-4 p-0 flex items-center justify-center text-[10px] bg-primary">
              3
            </Badge>
          </Button>
          <div className="flex h-8 w-8 items-center justify-center rounded-full bg-primary/10 cursor-pointer">
            <User className="h-4 w-4 text-primary" />
          </div>
        </div>
      </div>
    </header>
  );
}
