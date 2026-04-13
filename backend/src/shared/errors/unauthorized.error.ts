import { HttpError } from './http.error';
import { HTTP_STATUS } from '../constants';

export class UnauthorizedError extends HttpError {
    constructor(message: string) {
        super(message, HTTP_STATUS.UNAUTHORIZED);
        this.name = 'UnauthorizedError';
    }
}
