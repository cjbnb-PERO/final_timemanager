import 'dotenv/config';
import express from 'express';
import path from 'path';
import { fileURLToPath } from 'url';
// 获取当前文件的目录路径
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
// API Routes
import projectsRouter from './routes/projects.js';
import tasksRouter from './routes/tasks.js';
import timeEntriesRouter from './routes/timeEntries.js';
import insightsRouter from './routes/insights.js';
// Configuration
import { SERVER_CONFIG } from './config/constants.js';
// Middleware
import { errorHandler } from './middleware/errorHandler.js';
const app = express();
// 配置 CORS
app.use((req, res, next) => {
    res.setHeader('Access-Control-Allow-Origin', '*');
    res.setHeader('Access-Control-Allow-Methods', 'GET, POST, PUT, DELETE, OPTIONS');
    res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization');
    if (req.method === 'OPTIONS') {
        return res.status(204).end();
    }
    next();
});
/**
 * Static Files
 */
const REACT_BUILD_FOLDER = path.join(__dirname, '..', 'frontend', 'dist');
app.use(express.static(REACT_BUILD_FOLDER, {
    setHeaders: (res, path) => {
        // Disable caching for CSS and JS files to ensure changes are reflected immediately
        if (path.endsWith('.css') || path.endsWith('.js')) {
            res.setHeader('Cache-Control', 'no-cache, no-store, must-revalidate');
            res.setHeader('Pragma', 'no-cache');
            res.setHeader('Expires', '0');
        }
    },
}));
app.use('/assets', express.static(path.join(REACT_BUILD_FOLDER, 'assets'), {
    setHeaders: (res, path) => {
        // Disable caching for CSS and JS files in assets folder
        if (path.endsWith('.css') || path.endsWith('.js')) {
            res.setHeader('Cache-Control', 'no-cache, no-store, must-revalidate');
            res.setHeader('Pragma', 'no-cache');
            res.setHeader('Expires', '0');
        }
    },
}));
app.use(express.json());
app.use(express.urlencoded({ extended: true }));
/**
 * API Routes
 */
app.use('/api/projects', projectsRouter);
app.use('/api/tasks', tasksRouter);
app.use('/api/time-entries', timeEntriesRouter);
app.use('/api/insights', insightsRouter);
/**
 * Install Stripe Routes here
 */
/**
 * SPA Fallback Route
 * Handles client-side routing for React Router
 * Must be registered after all API routes
 */
app.get('*', (_req, res) => {
    res.sendFile(path.join(REACT_BUILD_FOLDER, 'index.html'));
});
/**
 * Error Handler
 * Must be the last middleware
 */
app.use(errorHandler);
/**
 * Start Server
 */
app.listen(SERVER_CONFIG.PORT, () => {
    console.log(`Server ready on port ${SERVER_CONFIG.PORT}`);
});
export default app;
