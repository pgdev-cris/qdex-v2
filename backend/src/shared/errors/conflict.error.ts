import { HttpError } from './http.error';
import { HTTP_STATUS } from '../constants';

export class ConflictError extends HttpError {
    constructor(message: string) {
        super(message, HTTP_STATUS.CONFLICT);
        this.name = 'ConflictError';
    }
}
