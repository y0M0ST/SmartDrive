import jwt from 'jsonwebtoken';
import { IsNull, MoreThan } from 'typeorm';
import type { Server, Socket } from 'socket.io';
import { AppDataSource } from '../config/data-source';
import { UserSession } from '../entities/user-session.entity';
import type { JwtPayload } from '../utils/jwtHelper';

/** Đồng bộ với yêu cầu US_09: mỗi nhà xe một phòng. */
export const buildAgencyRoomId = (agencyId: string): string => `agency_room:${agencyId}`;

const LOG_PREFIX = '[Socket.io]';

function extractBearerToken(socket: Socket): string | null {
    const auth = socket.handshake.auth as Record<string, unknown> | undefined;
    if (auth && typeof auth.token === 'string' && auth.token.trim()) {
        return auth.token.trim();
    }
    if (auth && typeof auth.accessToken === 'string' && auth.accessToken.trim()) {
        return auth.accessToken.trim();
    }
    const raw = socket.handshake.headers.authorization;
    const header = Array.isArray(raw) ? raw[0] : raw;
    if (typeof header === 'string' && header.toLowerCase().startsWith('bearer ')) {
        return header.slice(7).trim();
    }
    const q = socket.handshake.query.token;
    if (typeof q === 'string' && q.trim()) {
        return q.trim();
    }
    if (Array.isArray(q) && typeof q[0] === 'string' && q[0].trim()) {
        return q[0].trim();
    }
    return null;
}

/**
 * US_09 — Xác thực giống REST: JWT hợp lệ + session còn hiệu lực + bắt buộc có agency_id.
 */
async function authenticateSocket(socket: Socket): Promise<JwtPayload> {
    const JWT_SECRET = process.env.JWT_SECRET;
    if (!JWT_SECRET || JWT_SECRET.trim() === '') {
        throw new Error('Server chua cau hinh JWT_SECRET.');
    }

    const token = extractBearerToken(socket);
    if (!token) {
        throw new Error('Thieu token. Gui qua handshake.auth.token hoac Authorization: Bearer.');
    }

    let decoded: JwtPayload;
    try {
        decoded = jwt.verify(token, JWT_SECRET) as JwtPayload;
    } catch {
        throw new Error('Token khong hop le hoac da het han.');
    }

    const sessionId = decoded.sid;
    if (!sessionId) {
        throw new Error('Token khong chua session (sid).');
    }

    if (!decoded.agency_id || String(decoded.agency_id).trim() === '') {
        throw new Error('Tai khoan khong co agency_id — tu choi ket noi socket (US_09).');
    }

    if (!AppDataSource.isInitialized) {
        throw new Error('Database chua san sang.');
    }

    const sessionRepo = AppDataSource.getRepository(UserSession);
    const activeSession = await sessionRepo.findOne({
        where: {
            id: sessionId,
            user_id: decoded.id,
            revoked_at: IsNull(),
            expires_at: MoreThan(new Date()),
        },
    });

    if (!activeSession) {
        throw new Error('Phien dang nhap da het han hoac da dang xuat.');
    }

    return decoded;
}

/**
 * Đăng ký middleware + connection: join `agency_room:{agency_id}`.
 */
export const registerAgencySocketIo = (io: Server): void => {
    io.use(async (socket, next) => {
        try {
            const decoded = await authenticateSocket(socket);
            socket.data.userId = decoded.id;
            socket.data.agencyId = decoded.agency_id as string;
            socket.data.role = decoded.role;
            next();
        } catch (err) {
            const msg = err instanceof Error ? err.message : 'Xac thuc that bai.';
            console.warn(`${LOG_PREFIX} Tu choi ket noi socket [${socket.id}]: ${msg}`);
            next(new Error(msg));
        }
    });

    io.on('connection', (socket) => {
        const agencyId = socket.data.agencyId;
        const room = buildAgencyRoomId(agencyId);
        void socket.join(room);
        console.log(
            `${LOG_PREFIX} Socket [${socket.id}] joined room ${room} (user_id=${socket.data.userId}, role=${socket.data.role})`,
        );

        socket.on('disconnect', (reason) => {
            console.log(`${LOG_PREFIX} Socket [${socket.id}] disconnect (${reason})`);
        });
    });

    console.log(`${LOG_PREFIX} Da dang ky xac thuc JWT + room theo agency (US_09).`);
};
