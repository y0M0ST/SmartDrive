import jwt from 'jsonwebtoken';

const JWT_SECRET = process.env.JWT_SECRET as string;
const JWT_REFRESH_SECRET = process.env.JWT_REFRESH_SECRET as string;

export type JwtPayload = {
    id: string;
    agency_id: string | null;
    role: string;
    sid: string;
};

export const generateTokens = (payload: JwtPayload) => {
    const accessToken = jwt.sign(payload, JWT_SECRET, { expiresIn: '15m' }); // Access token sống ngắn (15 phút)
    const refreshToken = jwt.sign(payload, JWT_REFRESH_SECRET, { expiresIn: '7d' }); // Refresh token sống dai (7 ngày)

    return { accessToken, refreshToken };
};