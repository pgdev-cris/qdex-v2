import { HttpError } from './http.error';
import { HTTP_STATUS } from '../constants';

export class BadRequestError extends HttpError {
    constructor(message: string) {
        super(message, HTTP_STATUS.BAD_REQUEST);
        this.name = 'BadRequestError';
    }
}
