import { type ReactNode } from "react";
// Bạn nhớ tải ảnh minh họa về và bỏ vào src/assets/login-illustration.png nhé
import loginImg from "@/assets/login-illustration.png"; 

interface AuthLayoutProps {
  children: ReactNode;
  title: string;
}

export default function AuthLayout({ children, title }: AuthLayoutProps) {
  return (
    <div className="flex min-h-screen items-center justify-center bg-gray-100 p-4">
      <div className="flex w-full max-w-5xl overflow-hidden rounded-2xl bg-white shadow-xl">
        {/* Bên trái: Form */}
        <div className="w-full p-12 md:w-1/2 flex flex-col justify-center">
          <h1 className="mb-2 text-3xl font-bold text-gray-900">{title}</h1>
          <p className="mb-8 text-gray-600">SmartDrive - Hệ thống quản lý thông minh </p>
          {children}
        </div>
        
        {/* Bên phải: Ảnh minh họa (Chỉ hiện trên màn hình lớn) */}
        <div className="hidden w-1/2 bg-gray-50 md:block p-12 flex items-center justify-center">
          <img 
            src={loginImg} 
            alt="SmartDrive Illustration" 
            className="w-full h-full object-cover rounded-2xl"
          />
        </div>
      </div>
    </div>
  );
}