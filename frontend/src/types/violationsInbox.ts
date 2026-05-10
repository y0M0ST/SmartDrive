export type ViolationUnreadItem = {
  id: string;
  trip_id: string;
  type: string;
  occurred_at: string;
  image_url: string;
  latitude: number | null;
  longitude: number | null;
  trip_code: string | null;
  driver_name?: string | null;
  license_plate?: string | null;
};

export type ViolationsUnreadPayload = {
  unread_count: number;
  items: ViolationUnreadItem[];
};

/** Khớp `AiViolationSocketPayload` backend (`socket-hub.ts`). */
export type AiViolationAlertPayload = {
  violation_id: string;
  trip_id: string;
  trip_code: string | null;
  violation_type: string;
  license_plate: string;
  driver_name: string;
  occurred_at: string;
  image_url: string;
  latitude: number | null;
  longitude: number | null;
};
