import jwt, { SignOptions } from 'jsonwebtoken';

const JWT_SECRET = process.env.JWT_SECRET ?? 'secret';
const JWT_EXPIRES_IN = (process.env.JWT_EXPIRES_IN ?? '8h') as SignOptions['expiresIn'];

export const signToken = (payload: object): string => {
    return jwt.sign(payload, JWT_SECRET, { expiresIn: JWT_EXPIRES_IN });
};

export const verifyToken = (token: string) => {
    return jwt.verify(token, JWT_SECRET);
};
