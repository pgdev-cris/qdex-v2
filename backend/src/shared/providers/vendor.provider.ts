import vendorRepository from '../repository/vendor.repository';
import { VENDOR_STATUS } from '../constants';
import { ConflictError, NotFoundError } from '../errors';

const validateVendor = async (vendorCode: number) => {
    const vendor = await vendorRepository.getVendorByCode(vendorCode);

    if (!vendor) {
        throw new NotFoundError(
            'Vendor not found or invalid code. Please check the vendor code and try again.',
        );
    }

    if (vendor.status !== VENDOR_STATUS.ACTIVE) {
        throw new ConflictError('Vendor is not active.');
    }

    return vendor;
};

export default { validateVendor };
