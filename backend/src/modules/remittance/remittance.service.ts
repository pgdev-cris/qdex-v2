import PoolManager from '../../shared/db/pool.manager';
import supplierProvider from '../../shared/providers/supplier.provider';
import eventProvider from '../../shared/providers/event.provider';
import userRepository from '../../shared/repository/user.repository';
import SeriesRepository from '../../shared/repository/series.repository';
import { generateRefCode } from '../../shared/utils/refcode.util';
import remittanceRepository from './remittance.repository';
import { validateLines } from './remittance.helper';
import { BadRequestError, ConflictError, NotFoundError } from '../../shared/errors';
import {
    TRANSACTION_TYPE,
    TRANSACTION_STATUS,
    TENDER_TYPE,
    OVERRIDE_ACTION,
} from '../../shared/constants';
import { PartialRemitPayload, FullRemitPayload, RemitResult, VoidPayload } from './remittance.type';

const posBaseUrl = process.env.SALES_API_URL ?? 'http://192.168.110.90:4003/qdex';

interface PosRemittancePayload {
    receipt_no: string;
    supplier_code: number;
    total_amount: number;
    remitted_by: string;
    verified_by: string;
    remittance_type: 'partial' | 'full';
}

/**
 * Notifies the POS sales service that a remittance has been voided.
 * Must be called inside a DB transaction — any failure here will roll back the transaction.
 * Skipped when POS_MOCK=true.
 */
const notifyPosVoid = async (receiptNo: string): Promise<void> => {
    if (process.env.POS_MOCK === 'true') {
        console.log('[POS] POS_MOCK=true — skipping void notification for receipt:', receiptNo);
        return;
    }

    console.log('[POS] Sending void notification to POS:', { receipt_no: receiptNo });

    let response: Response;
    try {
        response = await fetch(`${posBaseUrl}/void/${encodeURIComponent(receiptNo)}`, {
            method: 'PATCH',
            headers: { 'Content-Type': 'application/json' },
            signal: AbortSignal.timeout(10_000),
        });

        console.log('[POS] Void notification response — status:', response.status, response.statusText);
    } catch (err: unknown) {
        const message = err instanceof Error ? err.message : 'Could not reach the sales service.';
        console.error('[POS] Void notification error:', message);
        throw new Error(`[POS] ${message}`);
    }

    if (!response.ok) {
        const errorBody = await response.json().catch(() => ({ message: response.statusText }));
        console.error('[POS] Void notification failed:', errorBody);
        throw new Error(
            `[POS] Void notification failed: ${errorBody?.message ?? response.statusText}`,
        );
    }

    console.log('[POS] Void notification sent successfully for receipt:', receiptNo);
};

/**
 * Notifies the POS sales service of the completed remittance.
 * Must be called inside a DB transaction — any failure here will roll back the transaction.
 * Skipped when POS_MOCK=true.
 */
const notifyPosRemittance = async (data: PosRemittancePayload): Promise<void> => {
    if (process.env.POS_MOCK === 'true') {
        console.log('[POS] POS_MOCK=true — skipping remittance notification:', data);
        return;
    }

    console.log('[POS] Sending remittance notification to POS:', data);

    let response: Response;
    try {
        response = await fetch(`${posBaseUrl}/remittance`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(data),
            signal: AbortSignal.timeout(10_000),
        });

        console.log('[POS] Remittance notification response — status:', response.status, response.statusText);
    } catch (err: unknown) {
        const message = err instanceof Error ? err.message : 'Could not reach the sales service.';
        console.error('[POS] Remittance notification error:', message);
        throw new Error(`[POS] ${message}`);
    }

    if (!response.ok) {
        const errorBody = await response.json().catch(() => ({ message: response.statusText }));
        console.error('[POS] Remittance notification failed:', errorBody);
        throw new Error(
            `[POS] Remittance notification failed: ${errorBody?.message ?? response.statusText}`,
        );
    }

    console.log('[POS] Remittance notification sent successfully:', { receipt_no: data.receipt_no, type: data.remittance_type });
};

const partialRemit = async (payload: PartialRemitPayload, userId: number): Promise<RemitResult> => {
    console.log('[Remittance] partialRemit called — supplier_code:', payload.supplier_code, '| userId:', userId, '| lines:', payload.lines);

    const supplierCode = Number(payload.supplier_code);
    const supplier = await supplierProvider.validateSupplier(supplierCode);

    validateLines(payload.lines);

    const user = await userRepository.getUserById(userId);
    if (!user) throw new NotFoundError('Verified user not found.');

    const event = await eventProvider.getCurrentEvent();

    // Series code is scoped per event
    const seriesCode = `TRX-${event.id}`;

    const totalAmount = payload.lines.reduce((sum, l) => sum + Number(l.amount), 0);
    const now = new Date();
    const referenceCode = generateRefCode();

    // Persist — series increment and inserts share one transaction
    //   Keeping everything in one transaction ensures the series number is
    //   rolled back alongside the inserts if anything fails, preventing gaps.
    let receiptNo!: string;

    await PoolManager.transaction(async (conn) => {
        // Increment series inside the transaction so it rolls back on failure
        const seriesRow = await SeriesRepository.incrementWithConnection(seriesCode, conn);
        if (!seriesRow) {
            throw new BadRequestError(
                `Series "${seriesCode}" not configured. Make sure the event has a counter.`,
            );
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
            has_prev_sales: payload.has_prev_sales ? 1 : 0,
        });

        const details = payload.lines.map((l) => ({
            transaction_id: transactionId,
            tender_type: TENDER_TYPE[l.method.toUpperCase()],
            amount: Number(l.amount),
            transaction_count: 1,
            is_prev_sales: l.is_prev_sales ? 1 : 0 as 0 | 1,
        }));

        await remittanceRepository.createTransactionDetails(conn, details);

        if (payload.override) {
            await remittanceRepository.createOverrideLog(conn, {
                transaction_id: transactionId,
                action_id: OVERRIDE_ACTION.REMITTANCE,
                requester_user_id: userId,
                approver_user_id: payload.override.approver_user_id,
                remarks: payload.override.remarks,
            });
        }

        // Notify POS — failure here rolls back the entire transaction
        console.log('[Remittance] Partial — notifying POS for receipt:', receiptNo, '| total_amount:', totalAmount);
        await notifyPosRemittance({
            receipt_no: receiptNo,
            supplier_code: supplierCode,
            total_amount: totalAmount,
            remitted_by: payload.remitter_name.trim(),
            verified_by: `${user.last_name}, ${user.first_name}`,
            remittance_type: 'partial',
        });
    });

    console.log('[Remittance] partialRemit completed — receipt_no:', receiptNo, '| reference_code:', referenceCode);

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
    console.log('[Remittance] fullRemit called — supplier_code:', payload.supplier_code, '| userId:', userId, '| lines:', payload.lines);

    const supplierCode = Number(payload.supplier_code);
    const supplier = await supplierProvider.validateSupplier(supplierCode);

    validateLines(payload.lines);

    const user = await userRepository.getUserById(userId);
    if (!user) throw new NotFoundError('Verified user not found.');

    const event = await eventProvider.getCurrentEvent();

    // Enforce one full remittance per supplier per day
    const existingFull = await remittanceRepository.getFullRemittanceToday(supplier.code, event.id);
    if (existingFull) {
        throw new ConflictError(
            `Vendor already fully remitted today. Reference No.: ${existingFull.reference_code} (${existingFull.receipt_no})`,
        );
    }

    // Series code is scoped per event
    const seriesCode = `TRX-${event.id}`;

    const totalAmount = payload.lines.reduce((sum, l) => sum + Number(l.amount), 0);
    const now = new Date();
    const referenceCode = generateRefCode();

    let receiptNo!: string;

    await PoolManager.transaction(async (conn) => {
        const seriesRow = await SeriesRepository.incrementWithConnection(seriesCode, conn);
        if (!seriesRow) {
            throw new BadRequestError(
                `Series "${seriesCode}" not configured. Make sure the event has a counter.`,
            );
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
            has_prev_sales: payload.has_prev_sales ? 1 : 0,
        });

        const details = payload.lines.map((l) => ({
            transaction_id: transactionId,
            tender_type: TENDER_TYPE[l.method.toUpperCase()],
            amount: Number(l.amount),
            transaction_count: 1,
            is_prev_sales: l.is_prev_sales ? 1 : 0 as 0 | 1,
        }));

        await remittanceRepository.createTransactionDetails(conn, details);

        if (payload.override) {
            await remittanceRepository.createOverrideLog(conn, {
                transaction_id: transactionId,
                action_id: OVERRIDE_ACTION.REMITTANCE,
                requester_user_id: userId,
                approver_user_id: payload.override.approver_user_id,
                remarks: payload.override.remarks,
            });
        }

        // Notify POS — failure here rolls back the entire transaction
        console.log('[Remittance] Full — notifying POS for receipt:', receiptNo, '| total_amount:', totalAmount);
        await notifyPosRemittance({
            receipt_no: receiptNo,
            supplier_code: supplierCode,
            total_amount: totalAmount,
            remitted_by: payload.remitter_name.trim(),
            verified_by: `${user.last_name}, ${user.first_name}`,
            remittance_type: 'full',
        });
    });

    console.log('[Remittance] fullRemit completed — receipt_no:', receiptNo, '| reference_code:', referenceCode);

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

const getPartialSummary = async (supplierCodeStr: string) => {
    const supplierCode = Number(supplierCodeStr);
    const supplier = await supplierProvider.validateSupplier(supplierCode);
    const event = await eventProvider.getCurrentEvent();
    const summary = await remittanceRepository.getPartialCashSummary(supplier.id, event.id);
    return {
        supplier_code: supplierCodeStr,
        total_cash: Number(summary.total_cash),
        count: Number(summary.count),
        transactions: summary.transactions.map((t) => ({
            receipt_no: t.receipt_no,
            reference_code: t.reference_code,
            cash_amount: Number(t.cash_amount),
            transacted_at: t.transacted_at,
        })),
        totals_by_method: summary.totals_by_method,
        transactions_by_method: summary.transactions_by_method,
    };
};

const voidRemittance = async (id: number, payload: VoidPayload, userId: number) => {
    console.log('[Remittance] voidRemittance called — transaction id:', id, '| userId:', userId);

    const transaction = await remittanceRepository.getTransactionById(id);
    if (!transaction) throw new NotFoundError('Transaction not found.');

    if (transaction.status === TRANSACTION_STATUS.VOIDED) {
        throw new ConflictError('Transaction is already voided.');
    }

    console.log('[Remittance] Voiding transaction — receipt_no:', transaction.receipt_no, '| current status:', transaction.status);

    await PoolManager.transaction(async (conn) => {
        await remittanceRepository.updateTransactionStatus(conn, id, TRANSACTION_STATUS.VOIDED);

        await remittanceRepository.createOverrideLog(conn, {
            transaction_id: id,
            action_id: OVERRIDE_ACTION.VOID,
            requester_user_id: userId,
            approver_user_id: payload.override.approver_user_id,
            remarks: payload.override.remarks,
        });

        // Notify POS — failure here rolls back the entire transaction
        console.log('[Remittance] Void — notifying POS for receipt:', transaction.receipt_no);
        await notifyPosVoid(transaction.receipt_no);
    });

    console.log('[Remittance] voidRemittance completed — transaction id:', id, '| receipt_no:', transaction.receipt_no);
};

export default { partialRemit, fullRemit, getPartialSummary, voidRemittance };
