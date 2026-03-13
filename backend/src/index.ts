import express from 'express';
import cors from 'cors';
import dotenv from 'dotenv';
import authRoutes from './modules/auth/auth.routes';
import { notFoundHandler, errorHandler } from './shared/middlewares';
import {API_PREFIX} from "./shared/constants";

dotenv.config();

const app = express();
const PORT = process.env.PORT || 3000;

app.use(cors());
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

/**
 * Routes Section
 */
app.use(`${API_PREFIX}/auth`, authRoutes);

/**
 * Error Handling
 */
app.use(notFoundHandler);
app.use(errorHandler);

app.listen(PORT, () => {
    console.log(`Server running on port ${PORT}`);
});