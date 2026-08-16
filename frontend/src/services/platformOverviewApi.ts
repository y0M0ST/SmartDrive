import api from "./api";

export type ViolationAgencyRow = {
  agency_id: string;
  agency_code: string;
  agency_name: string;
  violation_count: number;
  level: "cao" | "trung bình" | "thấp";
};

export type AccessChartPoint = {
  bucket_iso: string;
  label: string;
  count: number;
};

export type SuperPlatformOverview = {
  active_agencies: number;
  active_sessions: number;
  socket_connections: number;
  system_ram_percent: number;
  node_heap_percent: number;
  node_cpu_process_percent: number;
  access_chart: AccessChartPoint[];
  violations_by_agency: ViolationAgencyRow[];
};

type Envelope<T> = {
  status?: string;
  message?: string;
  data?: T;
};

export const platformOverviewApi = {
  getOverview: async (): Promise<SuperPlatformOverview> => {
    const res = await api.get<Envelope<SuperPlatformOverview>>("/platform/overview");
    const data = res.data?.data;
    if (!data) {
      throw new Error(res.data?.message || "Không lấy được dữ liệu tổng quan.");
    }
    return data;
  },
};
