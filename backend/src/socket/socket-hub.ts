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
    } catch (err) {
        console.warn('[Socket.io] emit trip_gps_update that bai:', err);
    }
};
