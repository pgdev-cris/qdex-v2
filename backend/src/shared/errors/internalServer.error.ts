import { HttpError } from './http.error';
import { HTTP_STATUS } from '../constants';

export class InternalServerError extends HttpError {
    constructor(message: string) {
        super(message, HTTP_STATUS.INTERNAL_SERVER_ERROR);
        this.name = 'InternalServerError';
    }
}
