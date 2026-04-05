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
const imageUpload = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: 10_000_000 },
  fileFilter: (_req, file, cb) => {
    if (file.mimetype === 'image/png' || file.mimetype === 'image/jpeg') return cb(null, true);
    cb(new Error('INVALID_FILE_TYPE'));
  },
});

const pdfUpload = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: 10_000_000 },
  fileFilter: (_req, file, cb) => {
    if (file.mimetype === 'application/pdf') return cb(null, true);
    cb(new Error('INVALID_FILE_TYPE'));
  },
});

// helpers
const PROJECT_ROOT = path.join(__dirname, '..', '..');

function isActive(user, now) {
  if (!user.lastActiveAt) return false;
  return (now - new Date(user.lastActiveAt).getTime()) <= systemConfig.availability_timeout * 1000;
}

function computeAvailable(account, regularUser, now) {
  if (!regularUser.available) return false;
  return isActive(regularUser, now);
}

function formatUser(account, regularUser) {
  return {
    id: account.id,
    first_name: regularUser.firstName,
    last_name: regularUser.lastName,
    email: account.email,
    activated: account.activated,
    suspended: account.suspended,
    role: account.role,
    phone_number: regularUser.phoneNumber ?? '',
    postal_address: regularUser.postalAddress ?? '',
  };
}

// POST /users - create new regular user
router.post('/', async (req, res) => {
  const now = Date.now();
  const {
    first_name, last_name, email, password,
    phone_number = '', postal_address = '',
    birthday = '1970-01-01',
  } = req.body;

  if (!first_name || typeof first_name !== 'string') {
    return res.status(400).json({ error: 'first_name is required' });
  }
  if (!last_name || typeof last_name !== 'string') {
    return res.status(400).json({ error: 'last_name is required' });
  }
  if (!email) return res.status(400).json({ error: 'email is required' });
  if (!isValidEmail(email)) return res.status(400).json({ error: 'Invalid email format' });
  if (!password) return res.status(400).json({ error: 'password is required' });
  if (!isValidPassword(password)) {
    return res.status(400).json({ error: 'Password must be 8-20 chars with uppercase, lowercase, number, and special character' });
  }
  if (req.body.birthday !== undefined && !/^\d{4}-\d{2}-\d{2}$/.test(req.body.birthday)) {
    return res.status(400).json({ error: 'birthday must be in YYYY-MM-DD format' });
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
        role: 'regular',
        activated: false,
        suspended: false,
        resetToken,
        expiresAt,
        regularUser: {
          create: {
            firstName: first_name,
            lastName: last_name,
            phoneNumber: phone_number,
            postalAddress: postal_address,
            birthday,
          },
        },
      },
      include: { regularUser: true },
    });

    return res.status(201).json({
      id: account.id,
      first_name: account.regularUser.firstName,
      last_name: account.regularUser.lastName,
      email: account.email,
      activated: account.activated,
      role: account.role,
      phone_number: account.regularUser.phoneNumber ?? '',
      postal_address: account.regularUser.postalAddress ?? '',
      birthday: account.regularUser.birthday,
      createdAt: account.createdAt,
      resetToken: account.resetToken,
      expiresAt: account.expiresAt,
    });
  } catch (err) {
    console.error(err);
    return res.status(500).json({ error: 'Server error' });
  }
});

// GET /users - retrieve list of regular users (admin only)
router.get('/', authenticate, async (req, res) => {
  if (!req.user) return res.status(401).json({ error: 'Unauthorized' });
  if (req.user.role !== 'administrator') return res.status(403).json({ error: 'Admin access required' });
  const { keyword, activated, suspended, page = 1, limit = 10 } = req.query;
  const take = Math.max(1, parseInt(limit, 10) || 10);
  const skip = (Math.max(1, parseInt(page, 10) || 1) - 1) * take;
  const accountWhere = { role: 'regular' };
  if (activated !== undefined) accountWhere.activated = activated === 'true';
  if (suspended !== undefined) accountWhere.suspended = suspended === 'true';
  const userWhere = {};
  if (keyword) {
    const kw = keyword.trim();
    userWhere.OR = [
      { firstName: { contains: kw } },
      { lastName: { contains: kw } },
      { phoneNumber: { contains: kw } },
      { postalAddress: { contains: kw } },
      { account: { email: { contains: kw } } },
    ];
  }

  try {
    const where = {
      account: accountWhere,
      ...userWhere,
    };
    let finalWhere;
    if (keyword) {
      finalWhere = {
        AND: [
          { account: accountWhere },
          {
            OR: [
              { firstName: { contains: keyword.trim() } },
              { lastName: { contains: keyword.trim() } },
              { phoneNumber: { contains: keyword.trim() } },
              { postalAddress: { contains: keyword.trim() } },
              { account: { email: { contains: keyword.trim() } } },
            ],
          },
        ],
      };
    } else {
      finalWhere = { account: accountWhere };
    }

    const [count, users] = await Promise.all([
      prisma.regularUser.count({ where: finalWhere }),
      prisma.regularUser.findMany({
        where: finalWhere,
        skip,
        take,
        include: { account: true },
        orderBy: { id: 'asc' },
      }),
    ]);

    const results = users.map(u => formatUser(u.account, u));
    return res.json({ count, results });
  } catch (err) {
    console.error(err);
    return res.status(500).json({ error: 'Server error' });
  }
});

// PATCH /users/me - update fields on regular user's account profile
router.patch('/me', authenticate, async (req, res) => {
  if (!req.user) return res.status(401).json({ error: 'Unauthorized' });
  if (req.user.role !== 'regular') return res.status(403).json({ error: 'Regular user access required' });
  const allowed = ['first_name', 'last_name', 'phone_number', 'postal_address', 'birthday', 'avatar', 'biography'];
  const incoming = req.body;
  const extra = Object.keys(incoming).filter(k => !allowed.includes(k));
  if (extra.length > 0) {
    return res.status(400).json({ error: `Unexpected fields: ${extra.join(', ')}` });
  }
  const updateData = {};
  if (incoming.first_name !== undefined) updateData.firstName = incoming.first_name;
  if (incoming.last_name !== undefined) updateData.lastName = incoming.last_name;
  if (incoming.phone_number !== undefined) updateData.phoneNumber = incoming.phone_number;
  if (incoming.postal_address !== undefined) updateData.postalAddress = incoming.postal_address;
  if (incoming.birthday !== undefined) updateData.birthday = incoming.birthday;
  if (incoming.avatar !== undefined) updateData.avatar = incoming.avatar; // null clears it
  if (incoming.biography !== undefined) updateData.biography = incoming.biography;

  if (Object.keys(updateData).length === 0) {
    return res.status(400).json({ error: 'No valid fields to update' });
  }

  try {
    await prisma.regularUser.update({
      where: { accountId: req.user.id },
      data: updateData,
    });
    const response = {};
    response.id = req.user.id;
    if (incoming.first_name !== undefined) response.first_name = incoming.first_name;
    if (incoming.last_name !== undefined) response.last_name = incoming.last_name;
    if (incoming.phone_number !== undefined) response.phone_number = incoming.phone_number;
    if (incoming.postal_address !== undefined) response.postal_address = incoming.postal_address;
    if (incoming.birthday !== undefined) response.birthday = incoming.birthday;
    if (incoming.avatar !== undefined) response.avatar = incoming.avatar;
    if (incoming.biography !== undefined) response.biography = incoming.biography;

    return res.json(response);
  } catch (err) {
    console.error(err);
    return res.status(500).json({ error: 'Server error' });
  }
});

// GET /users/me - retrieve authenticated user's account profile
router.get('/me', authenticate, async (req, res) => {
  if (!req.user) return res.status(401).json({ error: 'Unauthorized' });
  if (req.user.role !== 'regular') return res.status(403).json({ error: 'Regular user access required' });
  const now = Date.now();
  try {
    const regularUser = await prisma.regularUser.findUnique({
      where: { accountId: req.user.id },
    });
    if (!regularUser) return res.status(404).json({ error: 'User not found' });
    const available = computeAvailable(req.user, regularUser, now);

    return res.json({
      id: req.user.id,
      first_name: regularUser.firstName,
      last_name: regularUser.lastName,
      email: req.user.email,
      activated: req.user.activated,
      suspended: req.user.suspended,
      available,
      role: req.user.role,
      phone_number: regularUser.phoneNumber ?? '',
      postal_address: regularUser.postalAddress ?? '',
      birthday: regularUser.birthday,
      createdAt: req.user.createdAt,
      avatar: regularUser.avatar ?? null,
      resume: regularUser.resume ?? null,
      biography: regularUser.biography ?? null,
    });
  } catch (err) {
    console.error(err);
    return res.status(500).json({ error: 'Server error' });
  }
});

// PATCH /users/me/available - change availability status of current user
router.patch('/me/available', authenticate, async (req, res) => {
  if (!req.user) return res.status(401).json({ error: 'Unauthorized' });
  if (req.user.role !== 'regular') return res.status(403).json({ error: 'Regular user access required' });

  const { available } = req.body;
  if (typeof available !== 'boolean') {
    return res.status(400).json({ error: 'available must be a boolean' });
  }

  try {
    if (available === true) {
      if (req.user.suspended) {
        return res.status(400).json({ error: 'Cannot set availability: account is suspended' });
      }
      const regularUser = await prisma.regularUser.findUnique({
        where: { accountId: req.user.id },
        include: {
          qualifications: { where: { status: 'approved' } },
        },
      });
      if (!regularUser || regularUser.qualifications.length === 0) {
        return res.status(400).json({ error: 'Cannot set availability: no approved qualifications' });
      }
    }

    const now = new Date();
    const updateData = { available };
    if (available === true) updateData.lastActiveAt = now;

    await prisma.regularUser.update({
      where: { accountId: req.user.id },
      data: updateData,
    });

    return res.json({ available });
  } catch (err) {
    console.error(err);
    return res.status(500).json({ error: 'Server error' });
  }
});

// PUT /users/me/avatar - upload avatar image
router.put('/me/avatar', authenticate, (req, res) => {
  if (!req.user) return res.status(401).json({ error: 'Unauthorized' });
  if (req.user.role !== 'regular') return res.status(403).json({ error: 'Regular user access required' });
  imageUpload.single('file')(req, res, async (err) => {
    if (err) return res.status(400).json({ error: 'Invalid file: must be image/png or image/jpeg, max 10MB' });
    if (!req.file) return res.status(400).json({ error: 'file is required' });
    try {
      const ext = req.file.mimetype === 'image/png' ? 'png' : 'jpg';
      const dir = path.join(PROJECT_ROOT, 'uploads', 'users', String(req.user.id));
      fs.mkdirSync(dir, { recursive: true });
      const filePath = path.join(dir, `avatar.${ext}`);
      fs.writeFileSync(filePath, req.file.buffer);
      const publicPath = `/uploads/users/${req.user.id}/avatar.${ext}`;
      await prisma.regularUser.update({
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

// PUT /users/me/resume - upload resume
router.put('/me/resume', authenticate, (req, res) => {
  if (!req.user) return res.status(401).json({ error: 'Unauthorized' });
  if (req.user.role !== 'regular') return res.status(403).json({ error: 'Regular user access required' });

  pdfUpload.single('file')(req, res, async (err) => {
    if (err) return res.status(400).json({ error: 'Invalid file: must be application/pdf, max 10MB' });
    if (!req.file) return res.status(400).json({ error: 'file is required' });

    try {
      const dir = path.join(PROJECT_ROOT, 'uploads', 'users', String(req.user.id));
      fs.mkdirSync(dir, { recursive: true });
      const filePath = path.join(dir, 'resume.pdf');
      fs.writeFileSync(filePath, req.file.buffer);
      const publicPath = `/uploads/users/${req.user.id}/resume.pdf`;
      await prisma.regularUser.update({
        where: { accountId: req.user.id },
        data: { resume: publicPath },
      });
      return res.json({ resume: publicPath });
    } catch (e) {
      console.error(e);
      return res.status(500).json({ error: 'Server error' });
    }
  });
});

// PATCH /users/:userId/suspended - set suspended status of a regular user (admin only)
router.patch('/:userId/suspended', authenticate, async (req, res) => {
  if (!req.user) return res.status(401).json({ error: 'Unauthorized' });
  if (req.user.role !== 'administrator') return res.status(403).json({ error: 'Admin access required' });
  const { suspended } = req.body;
  if (typeof suspended !== 'boolean') {
    return res.status(400).json({ error: 'suspended must be a boolean' });
  }
  const userId = parseInt(req.params.userId, 10);
  if (isNaN(userId)) return res.status(404).json({ error: 'User not found' });
  try {
    const account = await prisma.account.findUnique({ where: { id: userId } });
    if (!account || account.role !== 'regular') {
      return res.status(404).json({ error: 'User not found' });
    }
    const updated = await prisma.account.update({
      where: { id: userId },
      data: { suspended },
      include: { regularUser: true },
    });
    return res.json({
      id: updated.id,
      first_name: updated.regularUser.firstName,
      last_name: updated.regularUser.lastName,
      email: updated.email,
      activated: updated.activated,
      suspended: updated.suspended,
      role: updated.role,
      phone_number: updated.regularUser.phoneNumber ?? '',
      postal_address: updated.regularUser.postalAddress ?? '',
    });
  } catch (err) {
    console.error(err);
    return res.status(500).json({ error: 'Server error' });
  }
});

// GET /users/me/invitations (Regular only) - retrieve list of job invitations for current regular user
//                                            (i.e. job postings where a business invited the user to express interest)
router.get('/me/invitations', authenticate, async (req, res) => {
    if (!req.user) return res.status(401).json({ error: 'Unauthorized' });
    if (req.user.role !== 'regular') return res.status(403).json({ error: 'Regular user access required' });

    const page = Math.max(1, parseInt(req.query.page) || 1);
    const limit = Math.max(1, parseInt(req.query.limit) || 10);
    const skip = (page - 1) * limit;

    try {
        const where = {
            userId: req.user.regularUser?.id,
            candidateInterested: null,
            businessInterested: true,
            job: { status: 'open' }
        }; // business expressed interest but user hasn't yet accepted (and job still open)

        const [count, interests] = await Promise.all([
            prisma.interest.count({ where }),
            prisma.interest.findMany({
                where,
                skip,
                take: limit,
                include: {
                    job: {
                        include: {
                            positionType: true,
                            business: true
                        }
                    }
                },
                orderBy: { createdAt: 'desc' }
            })
        ]);

        const results = interests.map(i => ({
            id: i.job.id,
            status: i.job.status,
            position_type: {
                id: i.job.positionType.id,
                name: i.job.positionType.name
            },
            business: {
                id: i.job.business.accountId,
                business_name: i.job.business.businessName
            },
            salary_min: i.job.salaryMin,
            salary_max: i.job.salaryMax,
            start_time: i.job.startTime,
            end_time: i.job.endTime,
            updatedAt: i.job.updatedAt
        }));

        return res.json({ count, results });
    } catch (err) {
        console.error(err);
        return res.status(500).json({ error: 'Server error' });
    }
});

// GET /users/me/interests (Regular only) - retrieve list of job postings current regular user interested in
router.get('/me/interests', authenticate, async (req, res) => {
    if (!req.user) return res.status(401).json({ error: 'Unauthorized' });
    if (req.user.role !== 'regular') return res.status(403).json({ error: 'Regular user access required' });

    const regularUser = await prisma.regularUser.findUnique({
        where: { accountId: req.user.id }
    });

    if (!regularUser) {
        return res.status(404).json({ error: 'Regular user not found' });
    }

    const page = Math.max(1, parseInt(req.query.page) || 1);
    const limit = Math.max(1, parseInt(req.query.limit) || 10);
    const skip = (page - 1) * limit;

    try {
        const where = {
            userId: regularUser.id,
            candidateInterested: true,
            job: { status: 'open' }
        }; // interests where the user has expressed interest (and job still open)

        const [count, interests] = await Promise.all([
            prisma.interest.count({ where }),
            prisma.interest.findMany({
                where,
                skip,
                take: limit,
                include: {
                    job: {
                        include: {
                            positionType: true,
                            business: true
                        }
                    }
                },
                orderBy: { createdAt: 'desc' }
            })
        ]);

        const results = interests.map(i => ({
            interest_id: i.id,
            mutual: i.businessInterested === true, // true if business also interested
            job: {
                id: i.job.id,
                status: i.job.status,
                position_type: {
                    id: i.job.positionType.id,
                    name: i.job.positionType.name
                },
                business: {
                    id: i.job.business.id,
                    business_name: i.job.business.businessName
                },
                salary_min: i.job.salaryMin,
                salary_max: i.job.salaryMax,
                start_time: i.job.startTime,
                end_time: i.job.endTime,
                updatedAt: i.job.updatedAt
            }
        }));

        return res.json({ count, results });
    } catch (err) {
        console.error(err);
        return res.status(500).json({ error: 'Server error' });
    }
});

// GET /users/me/qualifications - list current regular user's own qualifications
router.get('/me/qualifications', authenticate, async (req, res) => {
    if (!req.user) return res.status(401).json({ error: 'Unauthorized' });
    if (req.user.role !== 'regular') return res.status(403).json({ error: 'Regular user access required' });

    const page = Math.max(1, parseInt(req.query.page) || 1);
    const limit = Math.max(1, parseInt(req.query.limit) || 10);
    const skip = (page - 1) * limit;

    try {
        const regularUser = await prisma.regularUser.findUnique({
            where: { accountId: req.user.id }
        });
        if (!regularUser) return res.status(404).json({ error: 'User not found' });

        const where = { userId: regularUser.id };
        if (req.query.status) where.status = req.query.status;

        const [count, qualifications] = await Promise.all([
            prisma.qualification.count({ where }),
            prisma.qualification.findMany({
                where,
                skip,
                take: limit,
                include: {
                    positionType: { select: { id: true, name: true } }
                },
                orderBy: { updatedAt: 'desc' }
            })
        ]);

        const results = qualifications.map(q => ({
            id: q.id,
            status: q.status,
            note: q.note ?? '',
            document: q.document ?? null,
            position_type: {
                id: q.positionType.id,
                name: q.positionType.name
            },
            updatedAt: q.updatedAt
        }));

        return res.json({ count, results });
    } catch (err) {
        console.error(err);
        return res.status(500).json({ error: 'Server error' });
    }
});

// GET /users/me/jobs - list jobs where the current user is the worker (work history)
router.get('/me/jobs', authenticate, async (req, res) => {
    if (!req.user) return res.status(401).json({ error: 'Unauthorized' });
    if (req.user.role !== 'regular') return res.status(403).json({ error: 'Regular user access required' });

    const page = Math.max(1, parseInt(req.query.page) || 1);
    const limit = Math.max(1, parseInt(req.query.limit) || 10);
    const skip = (page - 1) * limit;

    try {
        const regularUser = await prisma.regularUser.findUnique({
            where: { accountId: req.user.id }
        });
        if (!regularUser) return res.status(404).json({ error: 'User not found' });

        const where = { workerId: regularUser.id };
        if (req.query.status) {
            where.status = req.query.status;
        } else {
            where.status = { in: ['filled', 'completed', 'canceled'] };
        }

        const [count, jobs] = await Promise.all([
            prisma.job.count({ where }),
            prisma.job.findMany({
                where,
                skip,
                take: limit,
                include: {
                    positionType: { select: { id: true, name: true } },
                    business: { select: { accountId: true, businessName: true } }
                },
                orderBy: { startTime: 'desc' }
            })
        ]);

        const results = jobs.map(j => ({
            id: j.id,
            status: j.status,
            position_type: { id: j.positionType.id, name: j.positionType.name },
            business: { id: j.business.accountId, business_name: j.business.businessName },
            salary_min: j.salaryMin,
            salary_max: j.salaryMax,
            start_time: j.startTime,
            end_time: j.endTime,
            updatedAt: j.updatedAt
        }));

        return res.json({ count, results });
    } catch (err) {
        console.error(err);
        return res.status(500).json({ error: 'Server error' });
    }
});

// Catches for unsupported methods
router.all('/', (req, res) => {
    res.set('Allow', 'POST, GET');
    res.status(405).json({ message: 'Method not allowed' });
});

router.all('/me', (req, res) => {
    res.set('Allow', 'GET, PATCH');
    res.status(405).json({ message: 'Method not allowed' });
});

router.all('/me/avatar', (req, res) => {
    res.set('Allow', 'PUT');
    res.status(405).json({ message: 'Method not allowed' });
});

router.all('/me/resume', (req, res) => {
    res.set('Allow', 'PUT');
    res.status(405).json({ message: 'Method not allowed' });
});

router.all('/me/available', (req, res) => {
    res.set('Allow', 'PATCH');
    res.status(405).json({ message: 'Method not allowed' });
});

router.all('/:userId/suspended', (req, res) => {
    res.set('Allow', 'PATCH');
    res.status(405).json({ message: 'Method not allowed' });
});

router.all('/me/invitations', (req, res) => {
    res.set('Allow', 'GET');
    res.status(405).json({ message: 'Method not allowed' });
});

router.all('/me/interests', (req, res) => {
    res.set('Allow', 'GET');
    res.status(405).json({ message: 'Method not allowed' });
});

// 404 catch-all for undefined paths
router.all('*', (_req, res) => {
  res.status(404).json({ error: 'Not found' });
});

module.exports = router;
