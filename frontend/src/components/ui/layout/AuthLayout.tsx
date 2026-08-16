import { type ReactNode } from "react";

interface AuthLayoutProps {
  children: ReactNode;
  title: string;
}

export default function AuthLayout({ children, title }: AuthLayoutProps) {
  const backgroundImageUrl =
    "https://wallpapercave.com/wp/wp7636776.jpg";

  return (
    <div
      className="relative flex min-h-screen items-center justify-center p-4"
      style={{
        backgroundImage: `url(${backgroundImageUrl})`,
        backgroundSize: "cover",
        backgroundPosition: "center",
        backgroundRepeat: "no-repeat",
      }}
    >
      {/* Lớp phủ đen làm tối nền đi một chút, giúp form nổi bần bật */}
      <div className="absolute inset-0 bg-black/50" />

      {/* Khung Kính bên ngoài: Đã giảm độ sáng nền và tăng độ mờ */}
      <div className="relative z-10 w-full max-w-md overflow-hidden rounded-2xl border border-white/20 bg-white/10 p-8 shadow-[0_8px_32px_0_rgba(0,0,0,0.37)] backdrop-blur-lg">
        
        {/* Tiêu đề & Subtitle */}
        <div className="mb-6 text-center">
          <h1 className="mb-2 text-3xl font-extrabold text-white drop-shadow-md tracking-tight">
            {title}
          </h1>
          <p className="text-white/80 font-medium">
            SmartDrive - Hệ thống quản lý thông minh
          </p>
        </div>

        {/* ĐÃ XÓA bg-white/90 VÀ p-5 Ở ĐÂY!
          Giờ đây, content (form của LoginPage) sẽ hòa quyện trực tiếp vào khung kính.
        */}
        <div className="w-full text-slate-900">
          {children}
        </div>
        
      </div>
    </div>
  );
}