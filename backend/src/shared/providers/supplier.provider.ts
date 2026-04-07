import supplierRepository from '../../modules/suppliers/suppliers.repository';
import { SUPPLIER_STATUS } from '../constants';
import { ConflictError, NotFoundError } from '../errors';

const validateSupplier = async (supplierCode: number) => {
    const supplier = await supplierRepository.getSupplierByCode(supplierCode);

    if (!supplier) {
        throw new NotFoundError(
            'Supplier not found or invalid code. Please check the supplier code and try again.',
        );
    }

    if (supplier.status !== SUPPLIER_STATUS.ACTIVE) {
        throw new ConflictError('Supplier is not active.');
    }

    return supplier;
};

export default { validateSupplier };
