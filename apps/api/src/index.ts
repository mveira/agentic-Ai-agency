import { Hono } from 'hono';
import { cors } from 'hono/cors';
import { logger } from 'hono/logger';
import { taskRouter } from './routes/task.js';
import { spendRouter } from './routes/spend.js';
import { projectConfigRouter } from './routes/project-config.js';
import { buildRouter } from './routes/build.js';
import { portalRouter, clarificationRouter, requirementsRouter, reviewsRouter } from './routes/portal.js';
import { requirementsV2Router } from './routes/requirements-v2.js';
import { proposalRouter, publicProposalRouter } from './routes/proposals.js';
import { internalPMRouter } from './routes/internal-pm.js';

const app = new Hono();

// Middleware
app.use('*', logger());
app.use('*', cors());

// Health check
app.get('/health', (c) => {
  return c.json({
    status: 'ok',
    timestamp: new Date().toISOString(),
    version: '0.1.0',
  });
});

// Routes
app.route('/api/run-task', taskRouter);
app.route('/api/projects', spendRouter);
app.route('/api/projects', projectConfigRouter);
app.route('/api/projects', buildRouter);
app.route('/api/projects', portalRouter);
app.route('/api/clarification', clarificationRouter);
app.route('/api/requirements', requirementsRouter);
app.route('/api/reviews', reviewsRouter);
app.route('/api/projects', requirementsV2Router);
app.route('/api/projects', proposalRouter);
app.route('/api/p', publicProposalRouter);
app.route('/api/internal/projects', internalPMRouter);

// 404 handler
app.notFound((c) => {
  return c.json(
    {
      error: 'Not Found',
      path: c.req.path,
    },
    404
  );
});

// Error handler
app.onError((err, c) => {
  console.error('Unhandled error:', err);
  return c.json(
    {
      error: 'Internal Server Error',
      message: err.message,
    },
    500
  );
});

// Start server
const port = parseInt(process.env.API_PORT || '3001', 10);

console.log(`Starting API server on port ${port}...`);

export default {
  port,
  fetch: app.fetch,
};

// For local development with Node.js
if (process.env.NODE_ENV !== 'production') {
  const { serve } = await import('@hono/node-server');
  serve({
    fetch: app.fetch,
    port,
  });
  console.log(`API server running at http://localhost:${port}`);
}
