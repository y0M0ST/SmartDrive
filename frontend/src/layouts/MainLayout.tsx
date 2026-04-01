import { Link, useLocation } from "react-router-dom";
import * as Icons from "lucide-react";
import { useTheme } from "next-themes"; // Thêm dòng này
import { useState, useEffect } from "react"; // Thêm dòng này
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "../components/ui/dropdown-menu";

const MENU_ITEMS = [
  { icon: Icons.LayoutDashboard, label: "Dashboard", path: "/admin/dashboard" },
  { icon: Icons.Users, label: "Quản lí tài xế", path: "/admin/drivers" },
  { icon: Icons.Clipboard, label: "Quản lí tuyến đường", path: "/admin/routes" },
  { icon: Icons.Calendar, label: "Quản lí chuyến đi", path: "/admin/trips" },
  { icon: Icons.Monitor, label: "Lịch sử vi phạm", path: "/admin/violations" },
  { icon: Icons.History, label: "Đánh giá và xếp hạng", path: "/admin/ratings" },
  { icon: Icons.MessageSquare, label: "Thống kê thu nhập & báo cáo", path: "/admin/finance" },
  { icon: Icons.Building, label: "Quản lí tài khoản", path: "/admin/accounts" },
  { icon: Icons.Car, label: "Quản lí xe", path: "/admin/vehicles" },
];

export default function MainLayout({ children }: { children: React.ReactNode }) {
  const location = useLocation();
  const { theme, setTheme } = useTheme(); // Hook điều khiển theme
  const [mounted, setMounted] = useState(false);

  // Tránh lỗi mismatch giao diện khi render phía server
  useEffect(() => setMounted(true), []);

  return (
    <div className="flex min-h-screen bg-slate-50 dark:bg-slate-950 antialiased transition-colors duration-300">
      {/* SIDEBAR */}
      <aside className="w-72 bg-white dark:bg-slate-900 border-r border-slate-200 dark:border-slate-800 flex flex-col p-6 fixed h-full z-40">
        <div className="flex items-center gap-3 mb-10 px-2">
          <div className="w-10 h-10 bg-blue-600 rounded-xl flex items-center justify-center text-white font-bold shadow-lg shadow-blue-200">SD</div>
          <span className="text-xl font-extrabold text-slate-800 dark:text-white tracking-tight italic">Safe Drive</span>
        </div>

        <nav className="flex-1 space-y-1 overflow-y-auto">
          {MENU_ITEMS.map((item) => {
            const isActive = location.pathname === item.path;
            return (
              <Link key={item.path} to={item.path} className={`flex items-center gap-3 px-4 py-3 rounded-xl font-bold text-[13px] transition-all ${isActive ? "bg-blue-50 dark:bg-blue-900/20 text-blue-600 shadow-sm" : "text-slate-500 hover:bg-slate-50 dark:hover:bg-slate-800 hover:text-slate-900 dark:hover:text-white"}`}>
                <item.icon size={18} strokeWidth={isActive ? 2.5 : 2} />
                {item.label}
              </Link>
            );
          })}
        </nav>

        <div className="mt-auto p-4 bg-slate-50 dark:bg-slate-800/50 rounded-2xl border border-slate-100 dark:border-slate-700">
          <p className="text-[11px] font-extrabold text-slate-900 dark:text-white uppercase tracking-wider">Safe Drive System</p>
          <p className="text-[10px] text-slate-400 mt-0.5 font-medium">Version: 1.0.0.11</p>
        </div>
      </aside>

      {/* RIGHT SIDE */}
      <main className="flex-1 ml-72 flex flex-col">
        {/* TOPBAR */}
        <header className="h-20 bg-white/80 dark:bg-slate-900/80 backdrop-blur-md border-b border-slate-200 dark:border-slate-800 flex items-center justify-between px-8 sticky top-0 z-50">
          <div className="relative w-80 group">
            <Icons.Search className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 group-focus-within:text-blue-600 transition-colors" size={18} />
            <input className="w-full bg-slate-50 dark:bg-slate-800 border-none rounded-xl h-10 pl-10 text-sm focus:ring-2 focus:ring-blue-100 outline-none transition-all dark:text-white" placeholder="Quick search..." />
          </div>

          <div className="flex items-center gap-5">
            <div className="flex items-center gap-4 text-slate-400 border-r pr-5 border-slate-200 dark:border-slate-800">
               <span className="text-sm font-bold text-slate-700 dark:text-slate-300 mr-2">Theme</span>
               
               {/* NÚT GẠT THEME ĐÃ FIX */}
               <button 
                onClick={() => setTheme(theme === "dark" ? "light" : "dark")}
                className="w-10 h-5 bg-slate-200 dark:bg-slate-700 rounded-full relative transition-all"
               >
                  <div className={`absolute top-1 w-3 h-3 rounded-full transition-all ${theme === 'dark' ? 'right-1 bg-blue-500' : 'left-1 bg-white'}`}></div>
               </button>

               <Icons.Mail size={20} className="hover:text-blue-600 cursor-pointer transition-colors" />
               <div className="relative">
                  <Icons.Bell size={20} className="hover:text-blue-600 cursor-pointer transition-colors" />
                  <span className="absolute -top-1 -right-1 w-2 h-2 bg-red-500 rounded-full border-2 border-white dark:border-slate-900"></span>
               </div>
            </div>

            <DropdownMenu>
              <DropdownMenuTrigger className="outline-none focus:outline-none border-none">
                <div className="flex items-center gap-3 hover:bg-slate-50 dark:hover:bg-slate-800 p-1.5 rounded-2xl transition-all cursor-pointer group">
                  <div className="w-10 h-10 bg-slate-100 dark:bg-slate-800 rounded-full border-2 border-white dark:border-slate-700 shadow-sm overflow-hidden flex items-center justify-center">
                    <Icons.UserCircle className="text-slate-400 w-full h-full font-thin" strokeWidth={1} />
                  </div>
                  <div className="text-left">
                    <p className="text-sm font-bold text-slate-900 dark:text-white leading-none">Admin</p>
                  </div>
                  <Icons.ChevronDown size={16} className="text-slate-400 group-data-[state=open]:rotate-180 transition-transform duration-200" />
                </div>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end" className="w-56 mt-2 rounded-2xl shadow-2xl border-slate-100 dark:border-slate-800 p-2 z-[9999] bg-white dark:bg-slate-900">
                <DropdownMenuItem className="flex items-center gap-3 p-3 rounded-xl cursor-pointer hover:bg-slate-50 dark:hover:bg-slate-800">
                  <Icons.UserCircle size={18} className="text-slate-500" />
                  <span className="font-bold text-slate-700 dark:text-slate-200 text-sm">Tài khoản của tôi</span>
                </DropdownMenuItem>
                <div className="h-px bg-slate-100 dark:bg-slate-800 my-1 mx-2" />
                <DropdownMenuItem className="flex items-center gap-3 p-3 rounded-xl cursor-pointer hover:bg-red-50 dark:hover:bg-red-900/10 text-red-500">
                  <Icons.LogOut size={18} />
                  <span className="font-bold text-sm">Đăng xuất</span>
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          </div>
        </header>

        <div className="p-8">
          {children}
        </div>
      </main>
    </div>
  );
}