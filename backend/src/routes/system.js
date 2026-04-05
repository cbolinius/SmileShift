'use strict';

const express = require('express');
const authenticate = require('../middleware/auth');
const systemConfig = require('../config/system');
const router = express.Router();
function requireAdmin(req, res) {
  if (!req.user) { res.status(401).json({ error: 'Unauthorized' }); return false; }
  if (req.user.role !== 'administrator') { res.status(403).json({ error: 'Admin access required' }); return false; }
  return true;
}
router.get('/', authenticate, (req, res) => {
  if (!requireAdmin(req, res)) return;
  res.json(systemConfig);
});

router.patch('/reset-cooldown', authenticate, (req, res) => {
  if (!requireAdmin(req, res)) return;
  const { reset_cooldown } = req.body;
  if (reset_cooldown === undefined || typeof reset_cooldown !== 'number') {
    return res.status(400).json({ error: 'reset_cooldown must be a number' });
  }
  if (reset_cooldown < 0) {
    return res.status(400).json({ error: 'reset_cooldown must be >= 0' });
  }
  systemConfig.reset_cooldown = reset_cooldown;
  return res.json({ reset_cooldown: systemConfig.reset_cooldown });
});

router.patch('/negotiation-window', authenticate, (req, res) => {
  if (!requireAdmin(req, res)) return;
  const { negotiation_window } = req.body;
  if (negotiation_window === undefined || typeof negotiation_window !== 'number') {
    return res.status(400).json({ error: 'negotiation_window must be a number' });
  }
  if (negotiation_window <= 0) {
    return res.status(400).json({ error: 'negotiation_window must be > 0' });
  }
  systemConfig.negotiation_window = negotiation_window;
  return res.json({ negotiation_window: systemConfig.negotiation_window });
});

router.patch('/job-start-window', authenticate, (req, res) => {
  if (!requireAdmin(req, res)) return;
  const { job_start_window } = req.body;
  if (job_start_window === undefined || typeof job_start_window !== 'number') {
    return res.status(400).json({ error: 'job_start_window must be a number' });
  }
  if (job_start_window <= 0) {
    return res.status(400).json({ error: 'job_start_window must be > 0' });
  }
  systemConfig.job_start_window = job_start_window;
  return res.json({ job_start_window: systemConfig.job_start_window });
});

router.patch('/availability-timeout', authenticate, (req, res) => {
  if (!requireAdmin(req, res)) return;
  const { availability_timeout } = req.body;
  if (availability_timeout === undefined || typeof availability_timeout !== 'number') {
    return res.status(400).json({ error: 'availability_timeout must be a number' });
  }
  if (availability_timeout <= 0) {
    return res.status(400).json({ error: 'availability_timeout must be > 0' });
  }
  systemConfig.availability_timeout = availability_timeout;
  return res.json({ availability_timeout: systemConfig.availability_timeout });
});

// Catches for unsupported methods
router.all('/reset-cooldown', (req, res) => {
  res.set('Allow', 'PATCH').status(405).json({ error: 'Method not allowed' });
});

router.all('/negotiation-window', (req, res) => {
  res.set('Allow', 'PATCH').status(405).json({ error: 'Method not allowed' });
});

router.all('/job-start-window', (req, res) => {
  res.set('Allow', 'PATCH').status(405).json({ error: 'Method not allowed' });
});

router.all('/availability-timeout', (req, res) => {
  res.set('Allow', 'PATCH').status(405).json({ error: 'Method not allowed' });
});

// 404 catch-all for undefined paths
router.all('*', (_req, res) => {
  res.status(404).json({ error: 'Not found' });
});

module.exports = router;
