import { BadRequestError } from '../../shared/errors';
import { TENDER_TYPE } from '../../shared/constants';
import { RemitLine } from './remittance.type';

export const validateLines = (lines: RemitLine[] | undefined) => {
    if (!lines || lines.length === 0) {
        throw new BadRequestError('At least one payment line is required.');
    }

    const unknownMethod = lines.find((l) => TENDER_TYPE[l.method.toUpperCase()] === undefined);
    if (unknownMethod) {
        throw new BadRequestError(`Unknown payment method: "${unknownMethod.method}".`);
    }
};
