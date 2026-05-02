import { Server, Socket } from 'socket.io';

let io: Server;

export const initSocketService = (socketServer: Server): void => {
    io = socketServer;

    io.on('connection', (socket: Socket) => {
        // Room per-trip: admin xem bản đồ GPS của chuyến cụ thể
        socket.on('join_trip', (tripId: string) => {
            if (typeof tripId === 'string' && tripId.trim()) {
                socket.join(`trip:${tripId}`);
            }
        });

        socket.on('leave_trip', (tripId: string) => {
            if (typeof tripId === 'string') {
                socket.leave(`trip:${tripId}`);
            }
        });

        // Room per-agency: AGENCY_ADMIN / DISPATCHER nhận cảnh báo vi phạm AI real-time (US_10)
        socket.on('join_agency', (agencyId: string) => {
            if (typeof agencyId === 'string' && agencyId.trim()) {
                socket.join(`agency:${agencyId}`);
            }
        });

        socket.on('leave_agency', (agencyId: string) => {
            if (typeof agencyId === 'string') {
                socket.leave(`agency:${agencyId}`);
            }
        });
    });
};

export const getIo = (): Server => {
    if (!io) throw new Error('Socket.io chưa được khởi tạo');
    return io;
};

export interface GpsUpdatePayload {
    tripId: string;
    latitude: number;
    longitude: number;
    speed: number;
    heading: number | null;
    recorded_at: string;
}

/** Phát tọa độ GPS mới tới tất cả admin đang xem chuyến này. */
export const emitGpsUpdate = (payload: GpsUpdatePayload): void => {
    getIo().to(`trip:${payload.tripId}`).emit('gps_update', payload);
};

/** Phát thay đổi trạng thái chuyến (IN_PROGRESS, COMPLETED, …). */
export const emitTripStatusChanged = (tripId: string, status: string): void => {
    getIo().to(`trip:${tripId}`).emit('trip_status_changed', { tripId, status });
};

export interface AiViolationAlertPayload {
    violationId: string;
    tripId: string;
    tripCode: string | null;
    driverId: string;
    driverName: string | null;
    vehicleId: string;
    licensePlate: string | null;
    type: string;
    imageUrl: string;
    latitude: number | null;
    longitude: number | null;
    occurredAt: string;
}

/**
 * US_10 — Phát cảnh báo vi phạm AI tới tất cả AGENCY_ADMIN / DISPATCHER
 * đang join room `agency:{agencyId}`.
 */
export const emitAiViolationAlert = (agencyId: string, payload: AiViolationAlertPayload): void => {
    getIo().to(`agency:${agencyId}`).emit('ai_violation_alert', payload);
};
