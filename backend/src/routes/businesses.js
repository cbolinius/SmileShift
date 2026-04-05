'use strict';

const express = require('express');
const bcrypt = require('bcrypt');
const multer = require('multer');
const path = require('path');
const fs = require('fs');
const { v4: uuidv4 } = require('uuid');
const { PrismaClient } = require('@prisma/client');
const authenticate = require('../middleware/auth');
const systemConfig = require('../config/system');
const { isValidPassword, isValidEmail } = require('./auth');
const prisma = new PrismaClient();
const router = express.Router();

const PROJECT_ROOT = path.join(__dirname, '..', '..');

const imageUpload = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: 10_000_000 },
  fileFilter: (_req, file, cb) => {
    if (file.mimetype === 'image/png' || file.mimetype === 'image/jpeg') return cb(null, true);
    cb(new Error('INVALID_FILE_TYPE'));
  },
});

function formatJob(job) {
    return {
        id: job.id,
        status: job.status,
        position_type: {
            id: job.positionType.id,
            name: job.positionType.name
        },
        business: {
            id: job.business.accountId,
            business_name: job.business.businessName
        },
        worker: job.worker ? {
            id: job.worker.accountId,
            first_name: job.worker.firstName,
            last_name: job.worker.lastName
        } : null,
        note: job.note ?? null,
        salary_min: job.salaryMin,
        salary_max: job.salaryMax,
        start_time: job.startTime,
        end_time: job.endTime,
        updatedAt: job.updatedAt
    };
}

// POST /businesses
router.post('/', async (req, res) => {
  const now = Date.now();
  const {
    business_name, owner_name, email, password,
    phone_number, postal_address, location,
  } = req.body;
  if (!business_name || typeof business_name !== 'string') {
    return res.status(400).json({ error: 'business_name is required' });
  }
  if (!owner_name || typeof owner_name !== 'string') {
    return res.status(400).json({ error: 'owner_name is required' });
  }
  if (!email) return res.status(400).json({ error: 'email is required' });
  if (!isValidEmail(email)) return res.status(400).json({ error: 'Invalid email format' });
  if (!password) return res.status(400).json({ error: 'password is required' });
  if (!isValidPassword(password)) {
    return res.status(400).json({ error: 'Password must be 8-20 chars with uppercase, lowercase, number, and special character' });
  }
  if (!phone_number || typeof phone_number !== 'string') {
    return res.status(400).json({ error: 'phone_number is required' });
  }
  if (!postal_address || typeof postal_address !== 'string') {
    return res.status(400).json({ error: 'postal_address is required' });
  }
  if (
    !location ||
    typeof location !== 'object' ||
    typeof location.lon !== 'number' ||
    typeof location.lat !== 'number'
  ) {
    return res.status(400).json({ error: 'location must be an object with lon and lat numbers' });
  }
  if (location.lon < -180 || location.lon > 180 || location.lat < -90 || location.lat > 90) {
    return res.status(400).json({ error: 'location lon must be -180 to 180 and lat must be -90 to 90' });
  }
  try {
    const existing = await prisma.account.findUnique({ where: { email } });
    if (existing) return res.status(409).json({ error: 'An account with this email already exists' });
    const hashedPassword = await bcrypt.hash(password, 10);
    const resetToken = uuidv4();
    const expiresAt = new Date(now + 7 * 24 * 60 * 60 * 1000);
    const account = await prisma.account.create({
      data: {
        email,
        password: hashedPassword,
        role: 'business',
        activated: false,
        suspended: false,
        resetToken,
        expiresAt,
        business: {
          create: {
            businessName: business_name,
            ownerName: owner_name,
            phoneNumber: phone_number,
            postalAddress: postal_address,
            lon: location.lon,
            lat: location.lat,
            verified: false,
          },
        },
      },
      include: { business: true },
    });

    return res.status(201).json({
      id: account.id,
      business_name: account.business.businessName,
      owner_name: account.business.ownerName,
      email: account.email,
      activated: account.activated,
      verified: account.business.verified,
      role: account.role,
      phone_number: account.business.phoneNumber,
      postal_address: account.business.postalAddress,
      location: { lon: account.business.lon, lat: account.business.lat },
      createdAt: account.createdAt,
      resetToken: account.resetToken,
      expiresAt: account.expiresAt,
    });
  } catch (err) {
    console.error(err);
    return res.status(500).json({ error: 'Server error' });
  }
});

// GET /businesses
router.get('/', authenticate, async (req, res) => {
  const {
    keyword, activated, verified, sort, order = 'asc',
    page = 1, limit = 10,
  } = req.query;
  const isAdmin = req.user?.role === 'administrator';
  const adminOnlyUsed =
    activated !== undefined ||
    verified !== undefined ||
    sort === 'owner_name';
  if (!isAdmin && adminOnlyUsed) {
    return res.status(400).json({ error: 'These filters are only available to administrators' });
  }
  const take = Math.max(1, parseInt(limit, 10) || 10);
  const skip = (Math.max(1, parseInt(page, 10) || 1) - 1) * take;
  const allowedSorts = isAdmin ? ['business_name', 'email', 'owner_name'] : ['business_name', 'email'];
  if (sort && !allowedSorts.includes(sort)) {
    return res.status(400).json({ error: `Invalid sort field. Options: ${allowedSorts.join(', ')}` });
  }
  if (!['asc', 'desc'].includes(order)) {
    return res.status(400).json({ error: 'order must be asc or desc' });
  }

  try {
    let finalWhere;
    if (keyword) {
      const kw = keyword.trim();
      const searchFields = [
        { businessName: { contains: kw } },
        { phoneNumber: { contains: kw } },
        { postalAddress: { contains: kw } },
        { account: { email: { contains: kw } } },
      ];
      if (isAdmin) searchFields.push({ ownerName: { contains: kw } });
      const accountFilter = { role: 'business' };
      if (isAdmin && activated !== undefined) accountFilter.activated = activated === 'true';
      const bizFilter = {};
      if (isAdmin && verified !== undefined) bizFilter.verified = verified === 'true';
      finalWhere = {
        AND: [
          { account: accountFilter },
          ...Object.keys(bizFilter).map(k => ({ [k]: bizFilter[k] })),
          { OR: searchFields },
        ],
      };
    } else {
      const accountFilter = { role: 'business' };
      if (isAdmin && activated !== undefined) accountFilter.activated = activated === 'true';
      finalWhere = { account: accountFilter };
      if (isAdmin && verified !== undefined) finalWhere.verified = verified === 'true';
    }
    let orderBy = undefined;
    if (sort === 'business_name') orderBy = { businessName: order };
    else if (sort === 'email') orderBy = { account: { email: order } };
    else if (sort === 'owner_name' && isAdmin) orderBy = { ownerName: order };
    const [count, businesses] = await Promise.all([
      prisma.business.count({ where: finalWhere }),
      prisma.business.findMany({
        where: finalWhere,
        skip,
        take,
        orderBy,
        include: { account: true },
      }),
    ]);
    const results = businesses.map(b => {
      const obj = {
        id: b.account.id,
        business_name: b.businessName,
        email: b.account.email,
        role: b.account.role,
        phone_number: b.phoneNumber,
        postal_address: b.postalAddress,
      };
      if (isAdmin) {
        obj.owner_name = b.ownerName;
        obj.verified = b.verified;
        obj.activated = b.account.activated;
      }
      return obj;
    });
    return res.json({ count, results });
  } catch (err) {
    console.error(err);
    return res.status(500).json({ error: 'Server error' });
  }
});

// GET /businesses/me
router.get('/me', authenticate, async (req, res) => {
  if (!req.user) return res.status(401).json({ error: 'Unauthorized' });
  if (req.user.role !== 'business') return res.status(403).json({ error: 'Business access required' });
  try {
    const business = await prisma.business.findUnique({
      where: { accountId: req.user.id },
    });
    if (!business) return res.status(404).json({ error: 'Business not found' });
    return res.json({
      id: req.user.id,
      business_name: business.businessName,
      owner_name: business.ownerName,
      email: req.user.email,
      role: req.user.role,
      phone_number: business.phoneNumber,
      postal_address: business.postalAddress,
      location: { lon: business.lon, lat: business.lat },
      avatar: business.avatar ?? null,
      biography: business.biography ?? null,
      activated: req.user.activated,
      verified: business.verified,
      createdAt: req.user.createdAt,
    });
  } catch (err) {
    console.error(err);
    return res.status(500).json({ error: 'Server error' });
  }
});

// PATCH /businesses/me
router.patch('/me', authenticate, async (req, res) => {
  if (!req.user) return res.status(401).json({ error: 'Unauthorized' });
  if (req.user.role !== 'business') return res.status(403).json({ error: 'Business access required' });
  const allowed = ['business_name', 'owner_name', 'phone_number', 'postal_address', 'location', 'avatar', 'biography'];
  const incoming = req.body;
  const extra = Object.keys(incoming).filter(k => !allowed.includes(k));
  if (extra.length > 0) {
    return res.status(400).json({ error: `Unexpected fields: ${extra.join(', ')}` });
  }
  if (
    incoming.location !== undefined &&
    (typeof incoming.location !== 'object' ||
      typeof incoming.location.lon !== 'number' ||
      typeof incoming.location.lat !== 'number')
  ) {
    return res.status(400).json({ error: 'location must have lon and lat as numbers' });
  }
  const updateData = {};
  if (incoming.business_name !== undefined) updateData.businessName = incoming.business_name;
  if (incoming.owner_name !== undefined) updateData.ownerName = incoming.owner_name;
  if (incoming.phone_number !== undefined) updateData.phoneNumber = incoming.phone_number;
  if (incoming.postal_address !== undefined) updateData.postalAddress = incoming.postal_address;
  if (incoming.location !== undefined) {
    updateData.lon = incoming.location.lon;
    updateData.lat = incoming.location.lat;
  }
  if (incoming.avatar !== undefined) updateData.avatar = incoming.avatar;
  if (incoming.biography !== undefined) updateData.biography = incoming.biography;
  if (Object.keys(updateData).length === 0) {
    return res.status(400).json({ error: 'No valid fields to update' });
  }
  try {
    await prisma.business.update({
      where: { accountId: req.user.id },
      data: updateData,
    });
    const response = {};
    response.id = req.user.id;
    if (incoming.business_name !== undefined) response.business_name = incoming.business_name;
    if (incoming.owner_name !== undefined) response.owner_name = incoming.owner_name;
    if (incoming.phone_number !== undefined) response.phone_number = incoming.phone_number;
    if (incoming.postal_address !== undefined) response.postal_address = incoming.postal_address;
    if (incoming.location !== undefined) response.location = incoming.location;
    if (incoming.avatar !== undefined) response.avatar = incoming.avatar;
    if (incoming.biography !== undefined) response.biography = incoming.biography;
    return res.json(response);
  } catch (err) {
    console.error(err);
    return res.status(500).json({ error: 'Server error' });
  }
});

// PUT /businesses/me/avatar
router.put('/me/avatar', authenticate, (req, res) => {
  if (!req.user) return res.status(401).json({ error: 'Unauthorized' });
  if (req.user.role !== 'business') return res.status(403).json({ error: 'Business access required' });
  imageUpload.single('file')(req, res, async (err) => {
    if (err) return res.status(400).json({ error: 'Invalid file: must be image/png or image/jpeg, max 10MB' });
    if (!req.file) return res.status(400).json({ error: 'file is required' });
    try {
      const ext = req.file.mimetype === 'image/png' ? 'png' : 'jpg';
      const dir = path.join(PROJECT_ROOT, 'uploads', 'businesses', String(req.user.id));
      fs.mkdirSync(dir, { recursive: true });
      const filePath = path.join(dir, `avatar.${ext}`);
      fs.writeFileSync(filePath, req.file.buffer);
      const publicPath = `/uploads/businesses/${req.user.id}/avatar.${ext}`;
      await prisma.business.update({
        where: { accountId: req.user.id },
        data: { avatar: publicPath },
      });
      return res.json({ avatar: publicPath });
    } catch (e) {
      console.error(e);
      return res.status(500).json({ error: 'Server error' });
    }
  });
});

// POST /businesses/me/jobs
router.post('/me/jobs', authenticate, async (req, res) => {
  if (!req.user) return res.status(401).json({ error: 'Unauthorized' });
  if (req.user.role !== 'business') return res.status(403).json({ error: 'Business access required' });

  const { position_type_id, salary_min, salary_max, start_time, end_time, note } = req.body;
  if ([position_type_id, salary_min, salary_max, start_time, end_time].some(v => v === undefined)) {
    return res.status(400).json({ error: 'Missing required field' });
  }
  if (typeof salary_min !== 'number' || typeof salary_max !== 'number' || salary_min < 0 || salary_max < salary_min) {
    return res.status(400).json({ error: 'Invalid salary range' });
  }
  const start = new Date(start_time);
  const end = new Date(end_time);
  if (isNaN(start) || isNaN(end) || end <= start) {
    return res.status(400).json({ error: 'Invalid start or end time' });
  }
  const now = new Date();
  if (start <= now || end <= now) {
    return res.status(400).json({ error: 'Start/end time must be in the future' });
  }
  const maxStartMs = systemConfig.job_start_window * 60 * 60 * 1000;
  if (start - now > maxStartMs) {
    return res.status(400).json({ error: 'Start time too far in future' });
  }
  const negotiationMs = systemConfig.negotiation_window * 1000;
  if (start - now < negotiationMs) {
    return res.status(400).json({ error: 'Not enough time for negotiation before start' });
  }
  try {
    const business = await prisma.business.findUnique({ where: { accountId: req.user.id } });
    if (!business) return res.status(404).json({ error: 'Business not found' });
    if (!business.verified) return res.status(403).json({ error: 'Business not verified' });
    const positionType = await prisma.positionType.findUnique({ where: { id: position_type_id } });
    if (!positionType || positionType.hidden) {
      return res.status(400).json({ error: 'Invalid position type' });
    }
    const job = await prisma.job.create({
      data: {
        businessId: business.id,
        positionTypeId: position_type_id,
        salaryMin: salary_min,
        salaryMax: salary_max,
        startTime: start,
        endTime: end,
        note,
        status: 'open'
      },
      include: { positionType: true, business: true, worker: true }
    });
    return res.status(201).json(formatJob(job));
  } catch (err) {
    console.error(err);
    return res.status(500).json({ error: 'Server error' });
  }
});

// GET /businesses/me/jobs
router.get('/me/jobs', authenticate, async (req, res) => {
  if (!req.user) return res.status(401).json({ error: 'Unauthorized' });
  if (req.user.role !== 'business') return res.status(403).json({ error: 'Business access required' });

  const page = Math.max(1, parseInt(req.query.page) || 1);
  const limit = Math.max(1, parseInt(req.query.limit) || 10);
  const skip = (page - 1) * limit;

  try {
    const business = await prisma.business.findUnique({ where: { accountId: req.user.id } });
    if (!business) return res.status(404).json({ error: 'Business not found' });

    const filters = { businessId: business.id };
    if (req.query.position_type_id) filters.positionTypeId = parseInt(req.query.position_type_id);
    if (req.query.salary_min) filters.salaryMin = { gte: parseFloat(req.query.salary_min) };
    if (req.query.salary_max) filters.salaryMax = { gt: parseFloat(req.query.salary_max) };
    if (req.query.start_time) filters.startTime = { gte: new Date(req.query.start_time) };
    if (req.query.end_time) filters.endTime = { lte: new Date(req.query.end_time) };

    let status = req.query.status;
    if (status === undefined) {
        status = ['open', 'filled'];
    } else if (!Array.isArray(status)) {
        status = [status];
    }
    if (Array.isArray(status)) status = status.flatMap(s => String(s).split(','));
    else status = String(status).split(',');
    status = status.map(s => s.trim()).filter(Boolean);
    filters.status = { in: status };

    const [count, jobs] = await Promise.all([
      prisma.job.count({ where: filters }),
      prisma.job.findMany({
        where: filters,
        include: { positionType: true, business: true, worker: true },
        skip,
        take: limit,
        orderBy: { updatedAt: 'desc' }
      })
    ]);
    return res.json({ count, results: jobs.map(formatJob) });
  } catch (err) {
    console.error(err);
    return res.status(500).json({ error: 'Server error' });
  }
});

// PATCH /businesses/me/jobs/:jobId
router.patch('/me/jobs/:jobId', authenticate, async (req, res) => {
  if (!req.user) return res.status(401).json({ error: 'Unauthorized' });
  if (req.user.role !== 'business') return res.status(403).json({ error: 'Business access required' });

  const jobId = parseInt(req.params.jobId, 10);
  if (isNaN(jobId)) return res.status(404).json({ error: 'Invalid jobId' });

  try {
    const business = await prisma.business.findUnique({ where: { accountId: req.user.id } });
    if (!business) return res.status(404).json({ error: 'Business not found' });

    const job = await prisma.job.findUnique({ where: { id: jobId } });
    if (!job || job.businessId !== business.id) return res.status(404).json({ error: 'Job not found' });
    const now = new Date();
    const data = {};

    if (req.body.salary_min !== undefined) {
      if (typeof req.body.salary_min !== 'number' || req.body.salary_min < 0) {
        return res.status(400).json({ error: 'Invalid salary_min' });
      }
      data.salaryMin = req.body.salary_min;
    }
    if (req.body.salary_max !== undefined) {
      if (typeof req.body.salary_max !== 'number') {
        return res.status(400).json({ error: 'Invalid salary_max' });
      }
      if (req.body.salary_max < (data.salaryMin ?? job.salaryMin)) {
        return res.status(400).json({ error: 'salary_max must >= salary_min' });
      }
      data.salaryMax = req.body.salary_max;
    }
    if (req.body.start_time !== undefined) {
      const start = new Date(req.body.start_time);
      if (isNaN(start) || start <= now) return res.status(400).json({ error: 'Invalid start_time' });
      data.startTime = start;
    }
    if (req.body.end_time !== undefined) {
      const end = new Date(req.body.end_time);
      const start = data.startTime ?? job.startTime;
      if (isNaN(end) || end <= start || end <= now) return res.status(400).json({ error: 'Invalid end_time' });
      data.endTime = end;
    }
    if (req.body.note !== undefined) {
      if (typeof req.body.note !== 'string') return res.status(400).json({ error: 'Invalid note' });
      data.note = req.body.note;
    }

    const nextStart = data.startTime ?? job.startTime;
    if (nextStart - now > systemConfig.job_start_window * 60 * 60 * 1000) {
      return res.status(400).json({ error: 'Start time too far in future' });
    }
    if (nextStart - now < systemConfig.negotiation_window * 1000) {
      return res.status(400).json({ error: 'Not enough time for negotiation before start' });
    }

    if (job.status !== 'open' || now >= job.startTime) return res.status(409).json({ error: 'Cannot edit job' });

    const updated = await prisma.job.update({
      where: { id: jobId },
      data,
      include: { positionType: true, business: true, worker: true }
    });

    const response = { id: updated.id, updatedAt: updated.updatedAt };
    if (req.body.salary_min !== undefined) response.salary_min = updated.salaryMin;
    if (req.body.salary_max !== undefined) response.salary_max = updated.salaryMax;
    if (req.body.start_time !== undefined) response.start_time = updated.startTime;
    if (req.body.end_time !== undefined) response.end_time = updated.endTime;
    if (req.body.note !== undefined) response.note = updated.note;

    return res.json(response);
  } catch (err) {
    console.error(err);
    return res.status(500).json({ error: 'Server error' });
  }
});

// DELETE /businesses/me/jobs/:jobId
router.delete('/me/jobs/:jobId', authenticate, async (req, res) => {
  if (!req.user) return res.status(401).json({ error: 'Unauthorized' });
  if (req.user.role !== 'business') return res.status(403).json({ error: 'Business access required' });

  const jobId = parseInt(req.params.jobId, 10);
  if (isNaN(jobId)) return res.status(404).json({ error: 'Invalid jobId' });

  try {
    const business = await prisma.business.findUnique({ where: { accountId: req.user.id } });
    if (!business) return res.status(404).json({ error: 'Business not found' });

    const job = await prisma.job.findUnique({ where: { id: jobId } });
    if (!job || job.businessId !== business.id) return res.status(404).json({ error: 'Job not found' });
    if (!['open', 'expired'].includes(job.status)) return res.status(409).json({ error: 'Cannot delete job' });

    const activeNegotiation = await prisma.negotiation.findFirst({
      where: { jobId, status: 'active' }
    });
    if (activeNegotiation) return res.status(409).json({ error: 'Cannot delete job with active negotiation' });

    await prisma.$transaction([
      prisma.negotiation.deleteMany({ where: { jobId } }),
      prisma.interest.deleteMany({ where: { jobId } }),
      prisma.job.delete({ where: { id: jobId } })
    ]);
    return res.status(204).send();
  } catch (err) {
    console.error(err);
    return res.status(500).json({ error: 'Server error' });
  }
});

// PATCH /businesses/:businessId/verified
router.patch('/:businessId/verified', authenticate, async (req, res) => {
  if (!req.user) return res.status(401).json({ error: 'Unauthorized' });
  if (req.user.role !== 'administrator') return res.status(403).json({ error: 'Admin access required' });
  const { verified } = req.body;
  if (typeof verified !== 'boolean') {
    return res.status(400).json({ error: 'verified must be a boolean' });
  }
  const businessId = parseInt(req.params.businessId, 10);
  if (isNaN(businessId)) return res.status(404).json({ error: 'Business not found' });
  try {
    const account = await prisma.account.findUnique({ where: { id: businessId } });
    if (!account || account.role !== 'business') {
      return res.status(404).json({ error: 'Business not found' });
    }
    const updated = await prisma.business.update({
      where: { accountId: businessId },
      data: { verified },
      include: { account: true },
    });
    return res.json({
      id: updated.account.id,
      business_name: updated.businessName,
      owner_name: updated.ownerName,
      email: updated.account.email,
      activated: updated.account.activated,
      verified: updated.verified,
      role: updated.account.role,
      phone_number: updated.phoneNumber,
      postal_address: updated.postalAddress,
    });
  } catch (err) {
    console.error(err);
    return res.status(500).json({ error: 'Server error' });
  }
});

// GET /businesses/:businessId
router.get('/:businessId', authenticate, async (req, res) => {
  const businessId = parseInt(req.params.businessId, 10);
  if (isNaN(businessId)) return res.status(404).json({ error: 'Business not found' });
  const isAdmin = req.user?.role === 'administrator';
  try {
    const account = await prisma.account.findUnique({ where: { id: businessId } });
    if (!account || account.role !== 'business') {
      return res.status(404).json({ error: 'Business not found' });
    }
    const business = await prisma.business.findUnique({
      where: { accountId: businessId },
    });
    if (!business) return res.status(404).json({ error: 'Business not found' });
    const obj = {
      id: account.id,
      business_name: business.businessName,
      owner_name: business.ownerName,
      email: account.email,
      role: account.role,
      phone_number: business.phoneNumber,
      postal_address: business.postalAddress,
      location: { lon: business.lon, lat: business.lat },
      avatar: business.avatar ?? null,
      biography: business.biography ?? null,
    };
    if (isAdmin) {
      obj.activated = account.activated;
      obj.verified = business.verified;
      obj.createdAt = account.createdAt;
    }
    return res.json(obj);
  } catch (err) {
    console.error(err);
    return res.status(500).json({ error: 'Server error' });
  }
});

// Catches for unsupported methods
router.all('/', (req, res) => {
  res.set('Allow', 'GET, POST').status(405).json({ error: 'Method not allowed' });
});

router.all('/me', (req, res) => {
  res.set('Allow', 'GET, PATCH').status(405).json({ error: 'Method not allowed' });
});

router.all('/me/avatar', (req, res) => {
  res.set('Allow', 'PUT').status(405).json({ error: 'Method not allowed' });
});

router.all('/me/jobs', (req, res) => {
  res.set('Allow', 'GET, POST').status(405).json({ error: 'Method not allowed' });
});

router.all('/me/jobs/:jobId', (req, res) => {
  res.set('Allow', 'PATCH, DELETE').status(405).json({ error: 'Method not allowed' });
});

router.all('/:businessId/verified', (req, res) => {
  res.set('Allow', 'PATCH').status(405).json({ error: 'Method not allowed' });
});

router.all('/:businessId', (req, res) => {
  res.set('Allow', 'GET').status(405).json({ error: 'Method not allowed' });
});

// 404 catch-all for undefined paths
router.all('*', (_req, res) => {
  res.status(404).json({ error: 'Not found' });
});

module.exports = router;
