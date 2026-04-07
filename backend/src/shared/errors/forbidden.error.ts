import { HttpError } from './http.error';
import { HTTP_STATUS } from '../constants';

export class ForbiddenError extends HttpError {
    constructor(message: string) {
        super(message, HTTP_STATUS.FORBIDDEN);
        this.name = 'ForbiddenError';
    }
}
