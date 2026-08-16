import type { Server } from 'socket.io';
import { buildAgencyRoomId } from './agency-socket';

let io: Server | undefined;

export const setSocketIo = (server: Server): void => {
    io = server;
};

export const getSocketIo = (): Server | undefined => io;

export type TripGpsSocketPayload = {
    trip_id: string;
    agency_id: string;
    latitude: number;
    longitude: number;
    speed: number;
    heading: number | null;
    recorded_at: string;
};

/** US_10 — payload chuông cảnh báo realtime (đủ để FE hiển thị card). */
export type AiViolationSocketPayload = {
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

const logRoomEmit = (event: string, room: string): void => {
    if (!io) return;
    const size = io.sockets.adapter.rooms.get(room)?.size ?? 0;
    if (size === 0) {
        console.warn(
            `[Socket.io] emit ${event} -> ${room} nhung khong co client nao trong phong (admin chua ket noi socket hoac sai instance Render).`,
        );
    } else {
        console.log(`[Socket.io] emit ${event} -> ${room} (${size} client(s))`);
    }
};

/**
 * US_09 — Chỉ phòng `agency_room:{agency_id}` nhận cập nhật (không broadcast toàn cục).
 */
export const emitTripGpsUpdateToAgencyRoom = (
    agencyId: string,
    payload: TripGpsSocketPayload,
): void => {
    if (!agencyId || !io) {
        return;
    }
    const room = buildAgencyRoomId(agencyId);
    try {
        io.to(room).emit('trip_gps_update', payload);
        logRoomEmit('trip_gps_update', room);
    } catch (err) {
        console.warn('[Socket.io] emit trip_gps_update that bai:', err);
    }
};

/**
 * US_10 — Cảnh báo vi phạm AI theo phòng nhà xe (cùng cơ chế US_09).
 */
export const emitAiViolationAlertToAgencyRoom = (
    agencyId: string,
    payload: AiViolationSocketPayload,
): void => {
    if (!agencyId || !io) {
        if (!io) {
            console.warn('[Socket.io] emit ai_violation_alert bo qua: Socket.io chua khoi tao.');
        }
        return;
    }
    const room = buildAgencyRoomId(agencyId);
    try {
        io.to(room).emit('ai_violation_alert', payload);
        logRoomEmit('ai_violation_alert', room);
    } catch (err) {
        console.warn('[Socket.io] emit ai_violation_alert that bai:', err);
    }
};
