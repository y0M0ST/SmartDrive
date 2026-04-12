import api from "./api";

export type VietnamProvinceDto = {
  code: string;
  name: string;
  lat: number;
  lng: number;
};

export const provinceApi = {
  list: (search?: string) =>
    api.get<{ data?: VietnamProvinceDto[]; status?: string; message?: string }>("/provinces", {
      params: search?.trim() ? { search: search.trim() } : undefined,
    }),
};
