/** @type {import('tailwindcss').Config} */
module.exports = {
  darkMode: ["class"], // <--- PHẢI CÓ DÒNG NÀY
  content: [
    './pages/**/*.{ts,tsx}',
    './components/**/*.{ts,tsx}',
    './app/**/*.{ts,tsx}',
    './src/**/*.{ts,tsx}',
  ],
  // ... các phần khác giữ nguyên
}