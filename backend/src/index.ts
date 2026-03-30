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
import { notFoundHandler, errorHandler } from './shared/middlewares';
import { API_PREFIX } from './shared/constants';

dotenv.config();

const app = express();
const PORT = process.env.PORT || 3000;

app.use(cors());
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

/**
 * Error Handling
 */
app.use(notFoundHandler);
app.use(errorHandler);

app.listen(PORT, () => {
    console.log(`Server running on port ${PORT}`);
});
