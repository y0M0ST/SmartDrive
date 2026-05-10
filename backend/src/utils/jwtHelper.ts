import jwt from 'jsonwebtoken';

const JWT_SECRET = process.env.JWT_SECRET as string;
const JWT_REFRESH_SECRET = process.env.JWT_REFRESH_SECRET as string;
const ACCESS_TOKEN_EXPIRES_IN = ((process.env.JWT_ACCESS_EXPIRES_IN || '7d').trim() as jwt.SignOptions['expiresIn']);
const REFRESH_TOKEN_EXPIRES_IN = ((process.env.JWT_REFRESH_EXPIRES_IN || '7d').trim() as jwt.SignOptions['expiresIn']);

export type JwtPayload = {
    id: string;
    agency_id: string | null;
    role: string;
    sid: string;
};

export const generateTokens = (payload: JwtPayload) => {
    const accessToken = jwt.sign(payload, JWT_SECRET, {
        // jsonwebtoken nhận chuỗi như "7d" ổn định hơn so với number "7"
        expiresIn: ACCESS_TOKEN_EXPIRES_IN,
    });
    const refreshToken = jwt.sign(payload, JWT_REFRESH_SECRET, {
        expiresIn: REFRESH_TOKEN_EXPIRES_IN,
    });

    return { accessToken, refreshToken };
};