import { HttpError } from './http.error';
import { HTTP_STATUS } from '../constants';

export class NotFoundError extends HttpError {
    constructor(message: string) {
        super(message, HTTP_STATUS.NOT_FOUND);
        this.name = 'NotFoundError';
    }
}
