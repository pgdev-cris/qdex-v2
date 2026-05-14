import express from 'express';
import cors from 'cors';
import dotenv from 'dotenv';
import authRoutes from './modules/auth/auth.route';
import usersRoutes from './modules/users/users.route';
import menuRoutes from './modules/menu/menu.routes';
import remittanceRoutes from './modules/remittance/remittance.routes';
import suppliersRoutes from './modules/suppliers/suppliers.route';
import eventsRoutes from './modules/events/events.route';
import reportsRoutes from './modules/reports/reports.route';
import salesRoutes from './modules/sales/sales.route';
import monitoringRoutes from './modules/monitoring/monitoring.routes';
import dashboardRoutes from './modules/dashboard/dashboard.routes';
import tenderTypesRoutes from './modules/tender-types/tender-types.routes';
import { notFoundHandler, errorHandler } from './shared/middlewares';
import { API_PREFIX } from './shared/constants';

dotenv.config();

const app = express();
const PORT = Number(process.env.PORT) || 3000;

const allowedOrigins = process.env.CORS_ORIGIN
    ? process.env.CORS_ORIGIN.split(',').map(o => o.trim())
    : [];

app.use(cors({
    origin: (origin, callback) => {
        if (!origin || allowedOrigins.includes(origin)) {
            callback(null, true);
        } else {
            callback(new Error(`CORS: origin '${origin}' not allowed`));
        }
    },
    credentials: true,
}));
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

/**
 * Routes
 */
app.use(`${API_PREFIX}/auth`, authRoutes);
app.use(`${API_PREFIX}/users`, usersRoutes);
app.use(`${API_PREFIX}/menu`, menuRoutes);
app.use(`${API_PREFIX}/remittance`, remittanceRoutes);
app.use(`${API_PREFIX}/suppliers`, suppliersRoutes);
app.use(`${API_PREFIX}/events`, eventsRoutes);
app.use(`${API_PREFIX}/reports`, reportsRoutes);
app.use(`${API_PREFIX}/sales`, salesRoutes);
app.use(`${API_PREFIX}/monitoring`, monitoringRoutes);
app.use(`${API_PREFIX}/dashboard`, dashboardRoutes);
app.use(`${API_PREFIX}/tender-types`, tenderTypesRoutes);

/**
 * Error Handling
 */
app.use(notFoundHandler);
app.use(errorHandler);

const server = app.listen(PORT, '0.0.0.0', () => {
    console.log(`Server running on port ${PORT}`);
});

const shutdown = () => {
    console.log('[Shutdown] Draining in-flight requests...');
    server.close(() => {
        console.log('[Shutdown] All requests finished. Exiting.');
        process.exit(0);
    });

    // Force exit if requests don't drain in time
    setTimeout(() => {
        console.error('[Shutdown] Force exit after timeout.');
        process.exit(1);
    }, 12_000);
};

// PM2 graceful shutdown — works on Windows (no SIGTERM needed)
process.on('message', (msg) => {
    if (msg === 'shutdown') shutdown();
});

// Fallback for non-PM2 environments (Linux/Mac dev)
process.on('SIGTERM', shutdown);
process.on('SIGINT', shutdown);
