import { useState } from "react";

export function useToast() {
  const [toasts, setToasts] = useState<any[]>([]);

  const toast = ({ title, description, variant }: any) => {
    console.log(`Toast: ${title} - ${description} (${variant})`);
    // Tạm thời mình dùng alert để test giao diện trước khi cài Toast xịn
    alert(`${title}: ${description}`);
  };

  return { toast, toasts };
}