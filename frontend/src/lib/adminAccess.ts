const ADMIN_DASHBOARD_ROLES = new Set(["SUPER_ADMIN", "AGENCY_ADMIN"]);

export function canAccessAdminDashboard(role: string | undefined | null): boolean {
  return !!role && ADMIN_DASHBOARD_ROLES.has(role);
}

export function isSuperAdmin(role: string | undefined | null): boolean {
  return role === "SUPER_ADMIN";
}

export function isAgencyAdmin(role: string | undefined | null): boolean {
  return role === "AGENCY_ADMIN";
}

/** Sau đăng nhập Web Admin: SA → trung tâm điều hành; Agency Admin → dashboard nhà xe. */
export function getAdminHomePath(role: string | undefined | null): string {
  if (isSuperAdmin(role)) return "/admin/super/overview";
  if (isAgencyAdmin(role)) return "/admin/dashboard";
  return "/admin/dashboard";
}

export function readStoredUserRole(): string | undefined {
  try {
    return (JSON.parse(localStorage.getItem("user_info") || "{}") as { role?: string }).role;
  } catch {
    return undefined;
  }
}

export function readStoredUserFullName(): string | undefined {
  try {
    return (JSON.parse(localStorage.getItem("user_info") || "{}") as { full_name?: string })
      .full_name;
  } catch {
    return undefined;
  }
}
