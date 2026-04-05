'use strict';

require('dotenv').config();

const express = require('express');
const cors = require('cors');
const path = require('path');
const authRoutes          = require('./routes/auth');
const userRoutes          = require('./routes/users');
const businessRoutes      = require('./routes/businesses');
const qualificationRoutes = require('./routes/qualifications');
const positionTypesRoutes = require('./routes/positionTypes');
const jobRoutes           = require('./routes/jobs');
const negotiationRoutes   = require('./routes/negotiations');
const systemRoutes        = require('./routes/system');
const meRoutes            = require('./routes/me');
const authenticate        = require('./middleware/auth');

function create_app() {
    const app = express();

    // CORS config
    app.use(cors({
        origin: 'http://localhost:5173',
        methods: ['GET', 'POST', 'PUT', 'PATCH', 'DELETE'],
        allowedHeaders: ['Content-Type', 'Authorization'],
        credentials: true
    }));

    app.use(express.json());
    app.use('/uploads', express.static(path.join(__dirname, '..', 'uploads')));

    // Routes
    app.use('/auth',           authRoutes);
    app.use('/users',          userRoutes);
    app.use('/businesses',     businessRoutes);
    app.use('/qualifications', qualificationRoutes);
    app.use('/position-types', positionTypesRoutes);
    app.use('/jobs',           jobRoutes);
    app.use('/negotiations',   negotiationRoutes);
    app.use('/system',         systemRoutes);
    app.use('/me',             meRoutes);

    // Test
    app.get('/', (req, res) => res.send('Server is running'));

    // 404 handler
    app.use((req, res) => {
        res.status(404).json({ error: 'Not found' });
    });

    return app;
}

module.exports = { create_app };