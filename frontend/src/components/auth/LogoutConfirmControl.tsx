import { useState } from "react";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { DropdownMenuItem } from "@/components/ui/dropdown-menu";
import { performLogout } from "@/lib/performLogout";
import { cn } from "@/lib/utils";

type Props = {
  variant: "dropdown-item" | "sidebar-button";
  className?: string;
  children: React.ReactNode;
};

/**
 * US_02 — pop-up xác nhận đăng xuất, sau đó revoke phiên + xóa token client.
 */
export function LogoutConfirmControl({ variant, className, children }: Props) {
  const [open, setOpen] = useState(false);

  if (variant === "dropdown-item") {
    return (
      <>
        <DropdownMenuItem
          onSelect={(e) => {
            e.preventDefault();
            setOpen(true);
          }}
          className={cn(
            "flex cursor-pointer items-center gap-3 rounded-xl p-3 text-red-600 outline-none hover:bg-red-50 focus:bg-red-50 dark:text-red-400 dark:hover:bg-red-950/40 dark:focus:bg-red-950/40",
            className,
          )}
        >
          {children}
        </DropdownMenuItem>
        <AlertDialog open={open} onOpenChange={setOpen}>
          <AlertDialogContent>
            <AlertDialogHeader>
              <AlertDialogTitle>Đăng xuất</AlertDialogTitle>
              <AlertDialogDescription>Bạn có chắc chắn muốn đăng xuất không?</AlertDialogDescription>
            </AlertDialogHeader>
            <AlertDialogFooter>
              <AlertDialogCancel>Hủy</AlertDialogCancel>
              <AlertDialogAction
                className="bg-red-600 text-white hover:bg-red-700"
                onClick={() => {
                  setOpen(false);
                  void performLogout({ manual: true });
                }}
              >
                Đăng xuất
              </AlertDialogAction>
            </AlertDialogFooter>
          </AlertDialogContent>
        </AlertDialog>
      </>
    );
  }

  return (
    <>
      <button
        type="button"
        className={cn(
          "mt-3 flex w-full items-center justify-center gap-2 rounded-xl border border-border bg-background py-2 text-xs font-bold text-foreground transition hover:bg-muted",
          className,
        )}
        onClick={() => setOpen(true)}
      >
        {children}
      </button>
      <AlertDialog open={open} onOpenChange={setOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Đăng xuất</AlertDialogTitle>
            <AlertDialogDescription>Bạn có chắc chắn muốn đăng xuất không?</AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Hủy</AlertDialogCancel>
            <AlertDialogAction
              className="bg-red-600 text-white hover:bg-red-700"
              onClick={() => {
                setOpen(false);
                void performLogout({ manual: true });
              }}
            >
              Đăng xuất
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
}
