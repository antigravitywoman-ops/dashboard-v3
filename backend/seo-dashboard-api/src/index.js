require('dotenv').config();
const express = require('express');
const cors = require('cors');
const helmet = require('helmet');
const morgan = require('morgan');

const authMiddleware = require('./middleware/auth');
const companiesRouter = require('./routes/companies');
const tasksRouter = require('./routes/tasks');
const filesRouter = require('./routes/files');
const reportsRouter = require('./routes/reports');
const envRouter = require('./routes/env');
const stateRouter = require('./routes/state');
const contentRouter = require('./routes/content');
const technicalRouter = require('./routes/technical');
const plansRouter = require('./routes/plans');
const reviewsRouter = require('./routes/reviews');
const aboutRouter = require('./routes/about');
const chatRouter = require('./routes/chat');
const authRouter = require('./routes/auth');
const usersRouter = require('./routes/users');

const app = express();
const PORT = process.env.PORT || 3456;

// Middleware
app.use(helmet());
app.use(cors());
app.use(morgan('combined'));
app.use(express.json());

// Health check (no auth)
app.get('/health', (req, res) => {
  res.json({ status: 'ok', timestamp: new Date().toISOString() });
});

// Routes - Auth (no auth middleware needed - handles its own auth)
app.use('/api/auth', authRouter);

// Routes - API (requires auth middleware)
app.use('/api', authMiddleware);

// Routes - Users
app.use('/api/users', usersRouter);

// Routes - Companies and data (uses auth middleware from above)
app.use('/api/companies', companiesRouter);
app.use('/api/companies', tasksRouter);
app.use('/api/companies', filesRouter);
app.use('/api/companies', reportsRouter);
app.use('/api/companies', envRouter);
app.use('/api/companies', contentRouter);
app.use('/api/companies', technicalRouter);
app.use('/api/companies', plansRouter);
app.use('/api/companies', reviewsRouter);
app.use('/api/companies', aboutRouter);
app.use('/api/state', stateRouter);
app.use('/api/chat', chatRouter);

// Error handler
app.use((err, req, res, next) => {
  console.error('Error:', err.message);
  res.status(err.status || 500).json({
    error: err.message || 'Internal server error',
    ...(process.env.NODE_ENV === 'development' && { stack: err.stack })
  });
});

app.listen(PORT, '0.0.0.0', () => {
  console.log(`SEO Dashboard API running on port ${PORT}`);
});

module.exports = app;
