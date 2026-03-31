import PoolManager from '../../shared/db/pool.manager';
import supplierProvider from '../../shared/providers/supplier.provider';
import eventProvider from '../../shared/providers/event.provider';
import SeriesRepository from '../../shared/repository/series.repository';
import { generateRefCode } from '../../shared/utils/refcode.util';
import remittanceRepository from './remittance.repository';
import { validateLines } from './remittance.helper';
import { BadRequestError } from '../../shared/errors';
import { TRANSACTION_TYPE, TRANSACTION_STATUS, TENDER_TYPE } from '../../shared/constants';
import { PartialRemitPayload, FullRemitPayload, RemitResult } from './remittance.type';

// Series code to use to get the next series number.
const SERIES_RECEIPT = 'TRX';

const partialRemit = async (payload: PartialRemitPayload, userId: number): Promise<RemitResult> => {
    const supplierCode = Number(payload.supplier_code);
    const supplier = await supplierProvider.validateSupplier(supplierCode);

    validateLines(payload.lines);

    const event = await eventProvider.getCurrentEvent();

    const totalAmount = payload.lines.reduce((sum, l) => sum + Number(l.amount), 0);
    const now = new Date();
    const referenceCode = generateRefCode();

    // Persist — series increment and inserts share one transaction
    //   Keeping everything in one transaction ensures the series number is
    //   rolled back alongside the inserts if anything fails, preventing gaps.
    let receiptNo!: string;

    await PoolManager.transaction(async (conn) => {
        // Increment series inside the transaction so it rolls back on failure
        const seriesRow = await SeriesRepository.incrementWithConnection(SERIES_RECEIPT, conn);
        if (!seriesRow) {
            throw new BadRequestError(`Series "${SERIES_RECEIPT}" not configured.`);
        }

        // Format for display/receipt only — store the raw int in the DB
        const paddedSeq = String(seriesRow.last_sequence).padStart(seriesRow.pad_length, '0');
        receiptNo = seriesRow.prefix ? `${seriesRow.prefix}${paddedSeq}` : paddedSeq;

        const transactionId = await remittanceRepository.createTransaction(conn, {
            event_id: event.id,
            supplier_id: supplier.id,
            transaction_no: seriesRow.last_sequence, // raw int, no prefix/padding
            transacted_at: now,
            total_amount: totalAmount,
            reference_code: referenceCode,
            remitted_by: payload.remitter_name.trim(),
            verified_by: userId,
            verified_at: now,
            status: TRANSACTION_STATUS.VERIFIED,
            type: TRANSACTION_TYPE.PARTIAL,
        });

        const details = payload.lines.map((l) => ({
            transaction_id: transactionId,
            tender_type: TENDER_TYPE[l.method.toUpperCase()],
            amount: Number(l.amount),
            transaction_count: 1,
        }));

        await remittanceRepository.createTransactionDetails(conn, details);
    });

    return {
        receipt_no: receiptNo,
        reference_code: referenceCode,
        supplier_code: payload.supplier_code,
        supplier_name: supplier.name,
        remitter_name: payload.remitter_name.trim(),
        remit_type: 'partial',
        lines: payload.lines,
        remitted_at: now.toISOString(),
    };
};

const fullRemit = async (payload: FullRemitPayload, userId: number): Promise<RemitResult> => {
    const supplierCode = Number(payload.supplier_code);
    const supplier = await supplierProvider.validateSupplier(supplierCode);

    validateLines(payload.lines);

    const event = await eventProvider.getCurrentEvent();

    const totalAmount = payload.lines.reduce((sum, l) => sum + Number(l.amount), 0);
    const now = new Date();
    const referenceCode = generateRefCode();

    let receiptNo!: string;

    await PoolManager.transaction(async (conn) => {
        const seriesRow = await SeriesRepository.incrementWithConnection(SERIES_RECEIPT, conn);
        if (!seriesRow) {
            throw new BadRequestError(`Series "${SERIES_RECEIPT}" not configured.`);
        }

        const paddedSeq = String(seriesRow.last_sequence).padStart(seriesRow.pad_length, '0');
        receiptNo = seriesRow.prefix ? `${seriesRow.prefix}${paddedSeq}` : paddedSeq;

        const transactionId = await remittanceRepository.createTransaction(conn, {
            event_id: event.id,
            supplier_id: supplier.id,
            transaction_no: seriesRow.last_sequence,
            transacted_at: now,
            total_amount: totalAmount,
            reference_code: referenceCode,
            remitted_by: payload.remitter_name.trim(),
            verified_by: userId,
            verified_at: now,
            status: TRANSACTION_STATUS.VERIFIED,
            type: TRANSACTION_TYPE.FULL,
        });

        const details = payload.lines.map((l) => ({
            transaction_id: transactionId,
            tender_type: TENDER_TYPE[l.method.toUpperCase()],
            amount: Number(l.amount),
            transaction_count: 1,
        }));

        await remittanceRepository.createTransactionDetails(conn, details);
    });

    return {
        receipt_no: receiptNo,
        reference_code: referenceCode,
        supplier_code: payload.supplier_code,
        supplier_name: supplier.name,
        remitter_name: payload.remitter_name.trim(),
        remit_type: 'full',
        lines: payload.lines,
        remitted_at: now.toISOString(),
    };
};

export default { partialRemit, fullRemit };
