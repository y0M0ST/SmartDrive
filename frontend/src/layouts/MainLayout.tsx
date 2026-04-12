import { Link, useLocation, Outlet } from "react-router-dom";
import * as Icons from "lucide-react";
import { useTheme } from "next-themes";
import { useState, useEffect, useMemo } from "react";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "../components/ui/dropdown-menu";
import {
  isSuperAdmin,
  readStoredUserRole,
  readStoredUserFullName,
} from "@/lib/adminAccess";

/** Menu vận hành nhà xe — Super Admin không thấy các mục này. */
const AGENCY_MENU_ITEMS = [
  { icon: Icons.LayoutDashboard, label: "Dashboard nhà xe", path: "/admin/dashboard" },
  {
    icon: Icons.Users,
    label: "Tài xế & tài khoản",
    path: "/admin/drivers",
  },
  { icon: Icons.Clipboard, label: "Quản lí tuyến đường", path: "/admin/routes" },
  { icon: Icons.Calendar, label: "Quản lí chuyến đi", path: "/admin/trips" },
  { icon: Icons.Monitor, label: "Lịch sử vi phạm", path: "/admin/violations" },
  { icon: Icons.History, label: "Đánh giá và xếp hạng", path: "/admin/ratings" },
  { icon: Icons.MessageSquare, label: "Thống kê thu nhập & báo cáo", path: "/admin/finance" },
  { icon: Icons.Car, label: "Quản lí xe", path: "/admin/vehicles" },
];

/** Trung tâm Super Admin — tách khỏi UI đại lý. */
const SUPER_MENU_ITEMS = [
  { icon: Icons.LayoutDashboard, label: "Tổng quan hệ thống", path: "/admin/super/overview" },
  { icon: Icons.Building2, label: "Quản lý đại lý", path: "/admin/super/agencies" },
  { icon: Icons.Package, label: "Gói cước (demo)", path: "/admin/super/plans" },
  { icon: Icons.ScrollText, label: "Nhật ký hệ thống", path: "/admin/super/logs" },
];

export default function MainLayout() {
  const location = useLocation();
  const { theme, resolvedTheme, setTheme } = useTheme();
  const [mounted, setMounted] = useState(false);

  useEffect(() => setMounted(true), []);
  /* next-themes (attribute="class") đã gắn .dark lên <html> — không toggle thủ công để tránh lệch trạng thái */

  const role = useMemo(() => readStoredUserRole(), [location.pathname]);
  const superUser = isSuperAdmin(role);
  const menuItems = superUser ? SUPER_MENU_ITEMS : AGENCY_MENU_ITEMS;
  const displayName = readStoredUserFullName() || "Quản trị viên";
  const modeLabel = superUser ? "Super Admin" : "Đại lý (Agency)";

  if (!mounted) return null;

  const isDark = (theme === "system" ? resolvedTheme : theme) === "dark";

  return (
    // THẺ CHA: Ép màu nền tối nhất cho toàn trang
    <div className="flex min-h-screen bg-background text-foreground antialiased transition-colors duration-300">
      
      {/* SIDEBAR: Đổi bg-white -> dark:bg-slate-900 */}
      <aside className="w-72 border-r border-border bg-card text-card-foreground flex flex-col p-6 fixed h-full z-40 transition-colors">
        <div className="flex items-center gap-3 mb-10 px-2">
          <div className="w-10 h-10 bg-blue-600 rounded-xl flex items-center justify-center text-white font-bold shadow-lg">SD</div>
          <span className="text-xl font-extrabold tracking-tight italic text-foreground">Safe Drive</span>
        </div>

        <nav className="flex-1 space-y-1 overflow-y-auto pr-2 custom-scrollbar">
          {menuItems.map((item) => {
            const isActive = location.pathname === item.path;
            return (
              <Link
                key={item.path}
                to={item.path}
                className={`flex items-center gap-3 rounded-xl px-4 py-3 text-[13px] font-bold transition-all ${
                  isActive
                    ? isDark
                      ? "bg-blue-950/45 text-blue-400 shadow-none ring-1 ring-blue-900/60 [&_svg]:text-blue-400"
                      : "bg-white text-blue-700 shadow-sm ring-1 ring-blue-200/90 [&_svg]:text-blue-600"
                    : "text-slate-600 hover:bg-slate-50 hover:text-slate-900 dark:text-muted-foreground dark:hover:bg-muted dark:hover:text-foreground"
                }`}
              >
                <item.icon size={18} strokeWidth={isActive ? 2.5 : 2} />
                {item.label}
              </Link>
            );
          })}
        </nav>

        <div className="mt-auto rounded-2xl border border-border bg-muted/60 p-4">
          <p className="text-[11px] font-extrabold uppercase tracking-wider text-foreground">
            {modeLabel}
          </p>
          <p className="mt-0.5 text-[10px] font-medium text-muted-foreground">
            Safe Drive · v1.0.0.11
          </p>
        </div>
      </aside>

      {/* RIGHT SIDE */}
      <main className="flex-1 ml-72 flex flex-col min-h-screen">
        
        {/* TOPBAR: Đổi bg-white/80 -> dark:bg-slate-900/80 */}
        <header className="sticky top-0 z-50 flex h-20 items-center justify-between border-b border-border bg-card/90 px-8 text-card-foreground backdrop-blur-md transition-colors">
          <div className="group relative w-80">
            <Icons.Search
              className="absolute left-3 top-1/2 size-[18px] -translate-y-1/2 text-muted-foreground group-focus-within:text-primary"
              aria-hidden
            />
            <input
              className="h-10 w-full rounded-xl border-none bg-muted pl-10 text-sm text-foreground outline-none transition-all placeholder:text-muted-foreground focus:ring-2 focus:ring-primary/30"
              placeholder="Quick search..."
              aria-label="Tìm nhanh"
            />
          </div>

          <div className="flex items-center gap-5">
            <div className="flex items-center gap-4 border-r border-border pr-5 text-muted-foreground">
              <span className="mr-1 text-sm font-bold text-foreground">Theme</span>
              
              {/* NÚT GẠT THEME */}
              <button
  type="button"
  onClick={() => setTheme(isDark ? "light" : "dark")}
  className={`relative h-5 w-10 rounded-full transition-colors duration-300 ${
    isDark ? "bg-blue-600" : "bg-slate-300"
  }`}
  aria-label="Toggle theme"
>
  <span
    className={`absolute top-1 size-3 rounded-full bg-white transition-transform duration-300 ${
      isDark ? "translate-x-6" : "translate-x-1"
    }`}
  />
</button>

              <Icons.Mail
                size={20}
                className="cursor-pointer text-muted-foreground transition-colors hover:text-primary"
                aria-hidden
              />
              <div className="relative">
                <Icons.Bell
                  size={20}
                  className="cursor-pointer text-muted-foreground transition-colors hover:text-primary"
                  aria-hidden
                />
                <span className="absolute -right-1 -top-1 size-2 rounded-full border-2 border-card bg-red-500" />
              </div>
            </div>

            <DropdownMenu>
              <DropdownMenuTrigger className="outline-none">
                <div className="group flex items-center gap-3 rounded-2xl p-1.5 transition-all hover:bg-muted">
                  <div className="flex size-10 items-center justify-center overflow-hidden rounded-full border-2 border-border bg-muted">
                    <Icons.UserCircle className="size-full text-muted-foreground" strokeWidth={1} />
                  </div>
                  <div className="text-left">
                    <p className="text-sm font-bold leading-none text-foreground">{displayName}</p>
                    <p className="mt-0.5 text-[10px] font-medium text-muted-foreground">{modeLabel}</p>
                  </div>
                  <Icons.ChevronDown
                    size={16}
                    className="text-muted-foreground transition-transform group-data-[state=open]:rotate-180"
                  />
                </div>
              </DropdownMenuTrigger>
              <DropdownMenuContent
                align="end"
                className="mt-2 w-56 rounded-2xl border-border bg-popover p-2 text-popover-foreground shadow-2xl"
              >
                <Link to="/admin/profile">
                  <DropdownMenuItem className="flex cursor-pointer items-center gap-3 rounded-xl p-3 outline-none hover:bg-muted focus:bg-muted">
                    <Icons.UserCircle size={18} className="text-muted-foreground" />
                    <span className="text-sm font-bold">Tài khoản của tôi</span>
                  </DropdownMenuItem>
                </Link>
                <div className="mx-2 my-1 h-px bg-border" />
                <DropdownMenuItem
                  onClick={() => {
                    localStorage.clear();
                    window.location.replace("/login");
                  }}
                  className="flex cursor-pointer items-center gap-3 rounded-xl p-3 text-red-600 outline-none hover:bg-red-50 focus:bg-red-50 dark:text-red-400 dark:hover:bg-red-950/40 dark:focus:bg-red-950/40"
                >
                  <Icons.LogOut size={18} />
                  <span className="text-sm font-bold">Đăng xuất</span>
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          </div>
        </header>

        {/* PHẦN RUỘT TRANG: Cực kỳ quan trọng, phải có bg-transparent hoặc bg-slate-950 */}
        <div className="flex-1 bg-background p-8 text-foreground transition-colors">
          <Outlet />
        </div>
      </main>
    </div>
  );
}