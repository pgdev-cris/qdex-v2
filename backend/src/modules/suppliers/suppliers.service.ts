import repository from './suppliers.repository';
import {
    CreateSupplierRequest,
    UpdateSupplierRequest,
    UpdateSupplierStatus,
} from './suppliers.schema';

const getSuppliers = async () => {
    return await repository.getSuppliers();
};

const getSupplierById = async (id: number) => {
    return await repository.getSupplierById(id);
};

const createSupplier = async (data: CreateSupplierRequest) => {
    // Check for duplicate code
    const existing = await repository.getSupplierByCode(data.supplier_code);
    if (existing) {
        throw new Error(`Supplier code "${data.supplier_code}" is already in use.`);
    }
    return await repository.createSupplier(data);
};

const updateSupplier = async (id: number, data: UpdateSupplierRequest) => {
    const exists = await repository.getSupplierById(id);
    if (!exists) return null;

    // Check code uniqueness if being changed
    if (data.supplier_code && data.supplier_code !== exists.supplier_code) {
        const duplicate = await repository.getSupplierByCode(data.supplier_code);
        if (duplicate) {
            throw new Error(`Supplier code "${data.supplier_code}" is already in use.`);
        }
    }

    await repository.updateSupplier(id, data);
    return await repository.getSupplierById(id);
};

const setSupplierStatus = async (id: number, payload: UpdateSupplierStatus) => {
    const exists = await repository.getSupplierById(id);
    if (!exists) return null;
    await repository.setSupplierStatus(id, payload.status);
    return { id, status: payload.status };
};

export default {
    getSuppliers,
    getSupplierById,
    createSupplier,
    updateSupplier,
    setSupplierStatus,
};
