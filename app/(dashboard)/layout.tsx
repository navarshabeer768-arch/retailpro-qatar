import { Sidebar } from "@/components/layout/sidebar";
import { Topbar } from "@/components/layout/topbar";
import { AuthGuard } from "@/components/auth-guard";

export default function DashboardLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <AuthGuard>
      <div className="flex h-screen overflow-hidden bg-background">
        {/* Sidebar - desktop */}
        <aside className="hidden lg:flex lg:w-64 lg:shrink-0 border-r border-sidebar-border">
          <Sidebar />
        </aside>

        {/* Main content */}
        <div className="flex flex-1 flex-col min-w-0 overflow-hidden">
          <Topbar />
          <main className="flex-1 overflow-y-auto p-4 lg:p-6">
            {children}
          </main>
        </div>
      </div>
    </AuthGuard>
  );
}
