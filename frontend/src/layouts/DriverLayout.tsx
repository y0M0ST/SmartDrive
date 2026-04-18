import { Link, Outlet, useLocation } from "react-router-dom";
import { CalendarDays, Bell, UserRound, LogOut } from "lucide-react";
import { useEffect, useMemo, useState } from "react";
import { useTheme } from "next-themes";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { cn } from "@/lib/utils";
import { readStoredUserFullName } from "@/lib/adminAccess";

const NAV = [
  { to: "/portal/driver/schedule", label: "Lịch chạy", icon: CalendarDays },
  { to: "/portal/driver/notifications", label: "Thông báo", icon: Bell },
  { to: "/portal/driver/me", label: "Cá nhân", icon: UserRound },
] as const;

/**
 * Cổng tài xế:
 * - **< md**: UI app (notch, header thân thiện, bottom tab).
 * - **≥ md**: cùng “khung” với Admin/Agency — sidebar cố định, topbar dính, vùng nội dung `p-8` + `bg-background`.
 */
export default function DriverLayout() {
  const location = useLocation();
  const { theme, resolvedTheme, setTheme } = useTheme();
  const [mounted, setMounted] = useState(false);

  useEffect(() => setMounted(true), []);

  const displayName = useMemo(() => readStoredUserFullName() || "bác tài", [location.pathname]);

  const isDark = mounted && (theme === "system" ? resolvedTheme : theme) === "dark";

  if (!mounted) {
    return (
      <div className="flex min-h-dvh items-center justify-center bg-background text-muted-foreground">
        Đang tải…
      </div>
    );
  }

  return (
    <div
      className={cn(
        "flex min-h-dvh w-full antialiased md:min-h-screen",
        /* Chỉ áp nền “app” lên mobile — tránh dark:bg cạnh tranh với md:bg-background (gây main tối, sidebar sáng) */
        "max-md:bg-[#f8fafc] max-md:text-slate-900 max-md:dark:bg-[#0f172a] max-md:dark:text-slate-100",
        "md:bg-background md:text-foreground",
      )}
    >
      {/* Sidebar — giống MainLayout (chỉ desktop) */}
      <aside
        className={cn(
          "fixed inset-y-0 left-0 z-40 hidden w-72 flex-col border-r border-border bg-card p-6 text-card-foreground transition-colors md:flex",
        )}
      >
        <div className="mb-10 flex items-center gap-3 px-2">
          <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-blue-600 text-base font-bold text-white shadow-lg">
            SD
          </div>
          <span className="text-xl font-extrabold italic tracking-tight text-foreground">Safe Drive</span>
        </div>

        <nav className="custom-scrollbar flex flex-1 flex-col space-y-1 overflow-y-auto pr-2">
          {NAV.map((item) => {
            const isActive =
              location.pathname === item.to ||
              (item.to === "/portal/driver/schedule" && location.pathname === "/portal/driver");
            const Icon = item.icon;
            return (
              <Link
                key={item.to}
                to={item.to}
                className={cn(
                  "flex items-center gap-3 rounded-xl px-4 py-3 text-[13px] font-bold transition-all",
                  isActive
                    ? isDark
                      ? "bg-blue-950/45 text-blue-400 shadow-none ring-1 ring-blue-900/60 [&_svg]:text-blue-400"
                      : "bg-white text-blue-700 shadow-sm ring-1 ring-blue-200/90 [&_svg]:text-blue-600"
                    : "text-slate-600 hover:bg-slate-50 hover:text-slate-900 dark:text-muted-foreground dark:hover:bg-muted dark:hover:text-foreground",
                )}
              >
                <Icon size={18} strokeWidth={isActive ? 2.5 : 2} />
                {item.label}
              </Link>
            );
          })}
        </nav>

        <div className="mt-auto rounded-2xl border border-border bg-muted/60 p-4">
          <p className="text-[11px] font-extrabold uppercase tracking-wider text-foreground">Tài xế</p>
          <p className="mt-0.5 text-[10px] font-medium text-muted-foreground">Safe Drive · Cổng tài xế</p>
          <button
            type="button"
            onClick={() => {
              localStorage.clear();
              window.location.replace("/login");
            }}
            className="mt-3 flex w-full items-center justify-center gap-2 rounded-xl border border-border bg-background py-2 text-xs font-bold text-foreground transition hover:bg-muted"
          >
            <LogOut size={16} />
            Đăng xuất
          </button>
        </div>
      </aside>

      {/* Cột nội dung — một Outlet, chia UI theo breakpoint */}
      <div className="flex min-h-dvh w-full min-h-0 flex-1 flex-col md:ml-72 md:min-h-screen">
        <div className="flex min-h-dvh min-h-0 flex-1 flex-col md:min-h-screen">
          {/* App: notch + header (chỉ dưới breakpoint md) */}
          <div className="mx-auto w-full max-w-[480px] shrink-0 bg-white dark:bg-[#1e293b] md:max-w-none md:bg-transparent md:dark:bg-transparent">
            <div
              className="pointer-events-none flex justify-center bg-white pt-2 pb-1 dark:bg-[#1e293b] md:hidden"
              aria-hidden
            >
              <div
                className={cn(
                  "h-6 w-[104px] rounded-full",
                  "bg-zinc-900/95 shadow-[inset_0_1px_0_rgba(255,255,255,0.08)] ring-1 ring-black/20",
                  "dark:bg-black dark:ring-white/10",
                )}
              />
            </div>

            <header className="z-30 border-b border-slate-200/90 bg-white px-4 pb-3 dark:border-slate-600/50 dark:bg-[#1e293b] md:hidden">
              <p className="text-[15px] font-medium leading-snug text-slate-600 dark:text-slate-300">
                Chào bác tài,{" "}
                <span className="font-bold text-blue-600 dark:text-blue-400">{displayName}</span>
                <span className="text-slate-600 dark:text-slate-300">!</span>
              </p>
              <p className="mt-1 text-[11px] font-medium tracking-wide text-slate-400 dark:text-slate-500">
                Safe Drive · Cổng tài xế
              </p>
            </header>
          </div>

          <header className="sticky top-0 z-50 hidden h-20 w-full shrink-0 items-center gap-4 border-b border-border bg-card/90 px-6 text-card-foreground backdrop-blur-md transition-colors md:flex lg:px-8">
            <div className="min-w-0 flex-1">
              <p className="text-sm font-extrabold tracking-tight text-foreground">Safe Drive</p>
              <p className="mt-0.5 truncate text-xs text-muted-foreground">
                Cổng tài xế · <span className="font-semibold text-foreground">{displayName}</span>
              </p>
            </div>

            <div className="ml-auto flex shrink-0 items-center gap-3 sm:gap-4">
              <div className="flex items-center gap-2 border-r border-border pr-3 sm:gap-3 sm:pr-4">
                <span className="whitespace-nowrap text-sm font-bold text-foreground">Theme</span>
                <button
                  type="button"
                  onClick={() => setTheme(isDark ? "light" : "dark")}
                  className={cn(
                    "relative inline-flex h-5 w-10 shrink-0 rounded-full transition-colors duration-300",
                    isDark ? "bg-blue-600" : "bg-slate-300",
                  )}
                  aria-label="Chuyển giao diện sáng/tối"
                >
                  <span
                    className={cn(
                      "pointer-events-none absolute top-1 size-3 rounded-full bg-white shadow-sm transition-all duration-300 ease-out",
                      isDark ? "right-1 left-auto" : "left-1 right-auto",
                    )}
                  />
                </button>
              </div>

              <DropdownMenu>
                <DropdownMenuTrigger className="outline-none">
                  <div className="group flex items-center gap-3 rounded-2xl p-1.5 transition-all hover:bg-muted">
                    <div className="flex size-10 items-center justify-center overflow-hidden rounded-full border-2 border-border bg-muted">
                      <UserRound className="size-5 text-muted-foreground" strokeWidth={1.5} />
                    </div>
                    <div className="hidden text-left sm:block">
                      <p className="text-sm font-bold leading-none text-foreground">{displayName}</p>
                      <p className="mt-0.5 text-[10px] font-medium text-muted-foreground">Tài xế</p>
                    </div>
                  </div>
                </DropdownMenuTrigger>
                <DropdownMenuContent
                  align="end"
                  className="mt-2 w-56 rounded-2xl border-border bg-popover p-2 text-popover-foreground shadow-2xl"
                >
                  <Link to="/portal/driver/me">
                    <DropdownMenuItem className="flex cursor-pointer items-center gap-3 rounded-xl p-3 outline-none hover:bg-muted focus:bg-muted">
                      <UserRound size={18} className="text-muted-foreground" />
                      <span className="text-sm font-bold">Trang cá nhân</span>
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
                    <LogOut size={18} />
                    <span className="text-sm font-bold">Đăng xuất</span>
                  </DropdownMenuItem>
                </DropdownMenuContent>
              </DropdownMenu>
            </div>
          </header>

          <main
            className={cn(
              "min-h-0 flex-1 overflow-y-auto overscroll-y-contain",
              "mx-auto w-full max-w-[480px] px-3 pt-3 pb-2",
              "max-md:bg-[#f8fafc] max-md:dark:bg-[#0f172a]/40",
              "md:mx-0 md:max-w-none md:bg-background md:px-6 md:py-6 md:text-foreground lg:px-8 lg:py-8",
            )}
          >
            <Outlet />
          </main>

          <nav
            className={cn(
              "sticky bottom-0 z-40 mx-auto w-full max-w-[480px] shrink-0 border-t border-slate-200/80 px-2 py-1.5 dark:border-slate-600/40",
              "backdrop-blur-md",
              "bg-white/85 dark:bg-[#1e293b]/90",
              "pb-[max(0.35rem,env(safe-area-inset-bottom))]",
              "md:hidden",
            )}
            aria-label="Điều hướng chính"
          >
            <ul className="flex items-stretch justify-around gap-0.5">
              {NAV.map(({ to, label, icon: Icon }) => {
                const active =
                  location.pathname === to ||
                  (to === "/portal/driver/schedule" && location.pathname === "/portal/driver");
                return (
                  <li key={to} className="min-w-0 flex-1">
                    <Link
                      to={to}
                      className={cn(
                        "flex flex-col items-center justify-center gap-0.5 rounded-xl py-1.5 text-[10px] transition-all",
                        active
                          ? "font-extrabold text-blue-600 dark:text-blue-400"
                          : "font-medium text-slate-400 hover:text-slate-600 dark:text-slate-500 dark:hover:text-slate-300",
                      )}
                    >
                      <Icon
                        className={cn(
                          "size-[22px] transition-transform",
                          active && "scale-110 stroke-[2.5px] text-blue-600 dark:text-blue-400",
                          !active && "stroke-[1.75px]",
                        )}
                        aria-hidden
                      />
                      <span className="truncate">{label}</span>
                    </Link>
                  </li>
                );
              })}
            </ul>
          </nav>
        </div>
      </div>
    </div>
  );
}
