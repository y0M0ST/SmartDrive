/**
 * Origin CORS dùng chung cho Express REST và Socket.io (Vercel + local).
 * `FRONTEND_URL` — danh sách phân tách bằng dấu phẩy, VD:
 * https://smartdrive.vercel.app,http://localhost:5173
 */
export const parseCorsOrigins = (): string[] => {
    const raw = process.env.FRONTEND_URL?.trim();
    if (!raw) return [];
    return raw
        .split(',')
        .map((s) => s.trim().replace(/\/$/, ''))
        .filter(Boolean);
};

export const buildCorsOptions = (origins: string[]) => ({
    origin: origins.length > 0 ? origins : true,
    credentials: true,
    methods: ['GET', 'HEAD', 'PUT', 'PATCH', 'POST', 'DELETE', 'OPTIONS'] as string[],
    allowedHeaders: ['Content-Type', 'Authorization'],
});

export const buildSocketIoCorsOptions = (origins: string[]) => ({
    origin: origins.length > 0 ? origins : true,
    credentials: true,
    methods: ['GET', 'POST'] as string[],
});
