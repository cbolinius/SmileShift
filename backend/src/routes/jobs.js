const express = require('express');
const { PrismaClient } = require('@prisma/client');
const authenticate = require('../middleware/auth');

const prisma = new PrismaClient();
const router = express.Router();

// Haversine distance in km
function haversine(lat1, lon1, lat2, lon2) {
    const R = 6371.2; // earth's radius in km

    // convert degrees to radians
    const dLat = ((lat2 - lat1) * Math.PI) / 180;
    const dLon = ((lon2 - lon1) * Math.PI) / 180;
    const rlat1 = (lat1 * Math.PI) / 180;
    const rlat2 = (lat2 * Math.PI) / 180;

    const a = Math.sin(dLat / 2) ** 2 + Math.cos(rlat1) * Math.cos(rlat2) * Math.sin(dLon / 2) ** 2;
    return R * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
}


// GET /jobs - list open jobs (regular only)
router.get('/', authenticate, async (req, res) => {

    // Only regular users can view jobs
    const user = req.user;
    if (!user) return res.status(401).json({ message: "Not authorized" });
    if (user.role !== 'regular') return res.status(403).json({ message: "Regular user access required" });
    // Query params
    const {
        lat, lon, position_type_id, business_id,
        sort = 'start_time',
        order = 'asc',
        page = 1,
        limit = 10
    } = req.query;
    // Validate sort and order
    if ((sort === 'distance' || sort === 'eta') && (lat === undefined || lon === undefined)) {
        return res.status(400).json({ message: "lat and lon are required for distance/eta sorting" });
    }

    // Pagination calculations
    const take = parseInt(limit, 10);
    const skip = (parseInt(page, 10) - 1) * take;

    const where = { status: 'open' };

    // Optional filters
    if (position_type_id !== undefined) {
        const pt = parseInt(position_type_id, 10);
        if (Number.isNaN(pt)) return res.status(400).json({ message: "position_type_id must be a number" });
        where.positionTypeId = pt;
    }
    if (business_id !== undefined) {
        const b = parseInt(business_id, 10);
        if (Number.isNaN(b)) return res.status(400).json({ message: "business_id must be a number" });
        where.business = { is: { accountId: b } };
    }

    try {
        // Fetch jobs with related position type and business info
        const jobs = await prisma.job.findMany({
            where,
            include: {
                positionType: { select: { id: true, name: true } },
                business: { select: { accountId: true, businessName: true, lat: true, lon: true } }
            }
        });
        // Map to response format and calculate distance/eta if needed
        let results = jobs.map(j => {
            const base = {
                id: j.id, status: j.status,
                position_type: { id: j.positionType.id, name: j.positionType.name },
                business: { id: j.business.accountId, business_name: j.business.businessName },
                salary_min: j.salaryMin,
                salary_max: j.salaryMax,
                start_time: j.startTime,
                end_time: j.endTime,
                updatedAt: j.updatedAt
            };

            if (lat !== undefined && lon !== undefined) {
                const latNum = parseFloat(lat);
                const lonNum = parseFloat(lon);
                const distance = haversine(latNum, lonNum, j.business.lat, j.business.lon);
                const eta = (distance / 30) * 60; // minutes at 30 km/hr
                base.distance = parseFloat(distance.toFixed(2));
                base.eta = Math.round(eta);
            }

            return base;
        });

        // Sorting
        results.sort((a, b) => {
            const dir = order === 'desc' ? -1 : 1;
            if (sort === 'salary_min') return dir * (a.salary_min - b.salary_min);
            if (sort === 'salary_max') return dir * (a.salary_max - b.salary_max);
            if (sort === 'updatedAt') return dir * (new Date(a.updatedAt) - new Date(b.updatedAt));
            if (sort === 'start_time') return dir * (new Date(a.start_time) - new Date(b.start_time));
            if (sort === 'distance') return dir * ((a.distance ?? 0) - (b.distance ?? 0));
            if (sort === 'eta') return dir * ((a.eta ?? 0) - (b.eta ?? 0));
            return 0;
        });

        const count = results.length;
        results = results.slice(skip, skip + take);

        res.json({ count, results });
    } catch (err) {
        console.error(err);
        res.status(500).json({ message: "Server error" });
    }
});

// GET /jobs/:jobId - job details (regular or business)
router.get('/:jobId(\\d+)', authenticate, async (req, res) => {

    // Regular users can view if they are qualified and job is open, or if they are the worker and job is not open
    // Business users can view if they own the job
    const user = req.user;
    if (!user) return res.status(401).json({ message: "Not authorized" });
    if (user.role !== 'regular' && user.role !== 'business') return res.status(403).json({ message: "Forbidden" });

    // Validate jobId
    const id = parseInt(req.params.jobId, 10);
    if (Number.isNaN(id)) return res.status(400).json({ message: "Invalid job id" });

    // lat/lon only allowed for regular users
    const { lat, lon } = req.query;
    if (user.role === 'business' && (lat !== undefined || lon !== undefined)) {
        return res.status(400).json({ message: "Business cannot use lat/lon" });
    }
    if ((lat !== undefined && lon === undefined) || (lon !== undefined && lat === undefined)) {
        return res.status(400).json({ message: "Both lat and lon must be provided together" });
    }

    try {
        // Fetch job with related position type, business, and worker info
        const job = await prisma.job.findUnique({
            where: { id },
            include: {
                positionType: { select: { id: true, name: true } },
                business: { select: { accountId: true, businessName: true, lat: true, lon: true } },
                worker: { select: { accountId: true, firstName: true, lastName: true } }
            }
        });

        if (!job) {
            return res.status(404).json({ message: "Not found" });
        }

        if (user.role === 'business') {
            const business = await prisma.business.findUnique({ where: { accountId: user.id } });
            // If business not found or doesn't own the job, return 404 to avoid info leak
            if (!business || job.businessId !== business.id) return res.status(404).json({ message: "Not found" });
        }

        // Regular user access checks
        if (user.role === 'regular') {
            const regularUser = await prisma.regularUser.findUnique({ where: { accountId: user.id } });
            if (!regularUser) return res.status(403).json({ message: "Forbidden" });

            if (job.status === 'open') {
                const qualification = await prisma.qualification.findFirst({
                    where: {
                        userId: regularUser.id,
                        positionTypeId: job.positionTypeId,
                        status: 'approved'
                    }
                });
                if (!qualification) return res.status(403).json({ message: "Forbidden" });
            } else {
                // If job is not open, only the assigned worker can view it, and status must be filled/canceled/completed
                const allowed = ['filled', 'canceled', 'completed'];
                if (!(allowed.includes(job.status) && job.workerId === regularUser.id)) {
                    return res.status(404).json({ message: "Not found" });
                }
            }
        }

        // Map to response format and calculate distance/eta if needed
        const response = {
            id: job.id,
            status: job.status,
            position_type: { id: job.positionType.id, name: job.positionType.name },
            business: { id: job.business.accountId, business_name: job.business.businessName },
            worker: job.worker
                ? { id: job.worker.accountId, first_name: job.worker.firstName, last_name: job.worker.lastName }
                : null,
            note: job.note ?? null,
            salary_min: job.salaryMin,
            salary_max: job.salaryMax,
            start_time: job.startTime,
            end_time: job.endTime,
            updatedAt: job.updatedAt
        };

        // Calculate distance and ETA if lat/lon provided (regular users only)
        if (user.role === 'regular' && lat !== undefined && lon !== undefined) {
            const latNum = parseFloat(lat);
            const lonNum = parseFloat(lon);
            if (Number.isNaN(latNum) || Number.isNaN(lonNum)) {
                return res.status(400).json({ message: "Invalid lat/lon" });
            }
            const distance = haversine(latNum, lonNum, job.business.lat, job.business.lon);
            const eta = (distance / 30) * 60; // minutes at 30 km/hr
            response.distance = parseFloat(distance.toFixed(2));
            response.eta = Math.round(eta);
        }
        res.json(response);
    } catch (err) {
        console.error(err);
        res.status(500).json({ message: "Server error" });
    }
});

// PATCH /jobs/:jobId/no-show - mark no-show (business only)
router.patch('/:jobId(\\d+)/no-show', authenticate, async (req, res) => {

    // Only business users can mark no-show
    const user = req.user;
    if (!user) return res.status(401).json({ message: "Not authorized" });
    if (user.role !== 'business') return res.status(403).json({ message: "Forbidden" });

    // Validate jobId
    const id = parseInt(req.params.jobId, 10);
    if (Number.isNaN(id)) return res.status(400).json({ message: "Invalid job id" });

    try {
        // Verify business owns the job
        const business = await prisma.business.findUnique({ where: { accountId: user.id } });
        if (!business) return res.status(403).json({ message: "Forbidden" });

        const job = await prisma.job.findUnique({
            where: { id },
            include: { business: { select: { accountId: true } } }
        });

        if (!job) return res.status(404).json({ message: "Not found" });
        if (job.businessId !== business.id) return res.status(403).json({ message: "Forbidden" });

        const now = new Date();
        if (job.status !== 'filled' || now < job.startTime || now >= job.endTime) {
            return res.status(409).json({ message: "Conflict" });
        }

        const updatedJob = await prisma.job.update({
            where: { id },
            data: { status: 'canceled' }
        });

        // If worker was assigned, suspend their account
        if (job.workerId) {
            const worker = await prisma.regularUser.findUnique({
                where: { id: job.workerId },
                include: { account: true }
            });

            if (worker && worker.account) {
                await prisma.account.update({
                    where: { id: worker.account.id },
                    data: { suspended: true }
                });
            }
        }

        // Return updated job info
        res.json({
            id: updatedJob.id,
            status: updatedJob.status,
            updatedAt: updatedJob.updatedAt
        });
    } catch (err) {
        console.error('No-show error:', err);
        console.error('Job ID:', id);
        res.status(500).json({ message: "Server error" });
    }
});

// PATCH /jobs/:jobId/interested - express or withdraw interest (regular only)
router.patch('/:jobId(\\d+)/interested', authenticate, async (req, res) => {

    // Only regular users can express interest
    const user = req.user;
    if (!user) return res.status(401).json({ message: "Not authorized" });
    if (user.role !== 'regular') return res.status(403).json({ message: "Forbidden" });

    const id = parseInt(req.params.jobId, 10);
    if (Number.isNaN(id)) return res.status(400).json({ message: "Invalid job id" });

    const { interested } = req.body;
    if (typeof interested !== 'boolean') {
        return res.status(400).json({ message: "interested must be boolean" });
    }

    try {
        const regularUser = await prisma.regularUser.findUnique({ where: { accountId: user.id } });

        if (!regularUser) return res.status(403).json({ message: "Forbidden" });

        const job = await prisma.job.findUnique({
            where: { id },
            include: { business: { select: { accountId: true } } }
        });

        if (!job) return res.status(404).json({ message: "Not found" });

        const nowInterested = new Date();
        if (job.status !== 'open' || nowInterested >= job.startTime) return res.status(409).json({ message: "Job is no longer open" });

        // Check if already in a negotiation for this job
        const existingNegotiation = await prisma.negotiation.findFirst({
            where: {
                jobId: id,
                userId: regularUser.id,
                status: 'active'
            }
        });

        if (existingNegotiation) {
            return res.status(409).json({ message: "Already in negotiation for this job" });
        }

        // Must be qualified for this job
        const qualification = await prisma.qualification.findFirst({
            where: {
                userId: regularUser.id,
                positionTypeId: job.positionTypeId,
                status: 'approved'
            }
        });

        if (!qualification) return res.status(403).json({ message: "Forbidden" });

        const existing = await prisma.interest.findUnique({
            where: { jobId_userId: { jobId: id, userId: regularUser.id } }
        });

        if (!interested && (!existing || existing.candidateInterested !== true)) {
            return res.status(400).json({ message: "Nothing to withdraw" });
        }

        const updated = await prisma.interest.upsert({
            where: { jobId_userId: { jobId: id, userId: regularUser.id } },
            update: { candidateInterested: interested ? true : null },
            create: {
                jobId: id,
                userId: regularUser.id,
                candidateInterested: true,
                businessInterested: null
            }
        });

        // Expressing interest resets availability timer
        if (interested) {
            await prisma.regularUser.update({
                where: { id: regularUser.id },
                data: {
                    available: true,
                    lastActiveAt: new Date()
                }
            });
        }

        res.json({
            id: updated.id,
            job_id: updated.jobId,
            candidate: {
                id: regularUser.accountId,
                interested: updated.candidateInterested
            },
            business: {
                id: job.business.accountId,
                interested: updated.businessInterested
            }
        });
    } catch (err) {
        console.error(err);
        res.status(500).json({ message: "Server error" });
    }
});

// GET /jobs/:jobId/candidates - list discoverable users (business only)
router.get('/:jobId(\\d+)/candidates', authenticate, async (req, res) => {

    // Only business users can view candidates
    const user = req.user;
    if (!user) return res.status(401).json({ message: "Not authorized" });
    if (user.role !== 'business') return res.status(403).json({ message: "Forbidden" });

    const id = parseInt(req.params.jobId, 10);
    if (Number.isNaN(id)) return res.status(400).json({ message: "Invalid job id" });

    const { page = 1, limit = 10 } = req.query;
    const take = parseInt(limit, 10);
    const skip = (parseInt(page, 10) - 1) * take;

    const INACTIVITY_MS = 5 * 60 * 1000;
    const now = new Date();

    try {
        const business = await prisma.business.findUnique({ where: { accountId: user.id } });
        if (!business) return res.status(403).json({ message: "Forbidden" });

        const job = await prisma.job.findUnique({ where: { id } });
        if (!job || job.businessId !== business.id) return res.status(404).json({ message: "Not found" });

        const users = await prisma.regularUser.findMany({
            where: {
                available: true,
                account: { activated: true, suspended: false },
                qualifications: {
                    some: { positionTypeId: job.positionTypeId, status: 'approved' }
                }
            },
            include: {
                account: { select: { activated: true, suspended: true } },
                qualifications: {
                    where: { positionTypeId: job.positionTypeId, status: 'approved' },
                    select: { id: true }
                },
                jobs: {
                    where: { status: 'filled' },
                    select: { startTime: true, endTime: true }
                },
                interests: {
                    where: { jobId: job.id },
                    select: { businessInterested: true }
                }
            }
        });

        // Filter by inactivity + time conflicts
        const filtered = users.filter(u => {
            if (!u.lastActiveAt) return false;
            if (now - u.lastActiveAt > INACTIVITY_MS) return false;

            const conflict = u.jobs.some(j =>
                job.startTime < j.endTime && job.endTime > j.startTime
            );
            return !conflict;
        });

        const results = filtered.map(u => ({
            id: u.accountId,
            first_name: u.firstName,
            last_name: u.lastName,
            invited: u.interests.length > 0 && u.interests[0].businessInterested === true
        }));

        const count = results.length;
        const paginated = results.slice(skip, skip + take);

        res.json({ count, results: paginated });
    } catch (err) {
        console.error(err);
        res.status(500).json({ message: "Server error" });
    }
});

// GET /jobs/:jobId/candidates/:userId - candidate details (business only)
router.get('/:jobId(\\d+)/candidates/:userId(\\d+)', authenticate, async (req, res) => {

    const user = req.user;
    if (!user) return res.status(401).json({ message: "Not authorized" });
    if (user.role !== 'business') return res.status(403).json({ message: "Forbidden" });

    const jobId = parseInt(req.params.jobId, 10);
    const userId = parseInt(req.params.userId, 10);
    if (Number.isNaN(jobId) || Number.isNaN(userId)) {
        return res.status(400).json({ message: "Invalid id" });
    }

    const INACTIVITY_MS = 5 * 60 * 1000;
    const now = new Date();

    try {
        const business = await prisma.business.findUnique({ where: { accountId: user.id } });
        if (!business) return res.status(403).json({ message: "Forbidden" });

        const job = await prisma.job.findUnique({
            where: { id: jobId },
            include: { positionType: { select: { id: true, name: true, description: true } } }
        });
        if (!job || job.businessId !== business.id) return res.status(404).json({ message: "Not found" });

        const candidate = await prisma.regularUser.findUnique({
            where: { accountId: userId },
            include: {
                account: { select: { email: true, activated: true, suspended: true } },
                qualifications: {
                    where: { positionTypeId: job.positionTypeId, status: 'approved' },
                    select: { id: true, positionTypeId: true, document: true, note: true, updatedAt: true }
                },
                jobs: { where: { status: 'filled' }, select: { startTime: true, endTime: true } }
            }
        });
        if (!candidate) return res.status(404).json({ message: "Not found" });

        const qual = candidate.qualifications[0];
        const conflict = candidate.jobs.some(j =>
            job.startTime < j.endTime && job.endTime > j.startTime
        );

        const isFilledWorker = job.workerId === candidate.id && now < job.endTime;

        const response = {
            user: {
                id: candidate.accountId,
                first_name: candidate.firstName,
                last_name: candidate.lastName,
                avatar: candidate.avatar,
                resume: candidate.resume,
                biography: candidate.biography,
                qualification: qual
                    ? {
                        id: qual.id,
                        position_type_id: qual.positionTypeId,
                        document: qual.document,
                        note: qual.note ?? '',
                        updatedAt: qual.updatedAt
                    }
                    : null
            },
            job: {
                id: job.id,
                status: job.status,
                position_type: {
                    id: job.positionType.id,
                    name: job.positionType.name,
                    description: job.positionType.description
                },
                start_time: job.startTime,
                end_time: job.endTime
            }
        };

        // Only show contact info if candidate filled this job
        if (isFilledWorker) {
            response.user.email = candidate.account.email;
            response.user.phone_number = candidate.phoneNumber;
        }

        res.json(response);
    } catch (err) {
        console.error(err);
        res.status(500).json({ message: "Server error" });
    }
});

// PATCH /jobs/:jobId/candidates/:userId/interested - invite or withdraw (business only)
router.patch('/:jobId(\\d+)/candidates/:userId(\\d+)/interested', authenticate, async (req, res) => {
    const user = req.user;
    if (!user) return res.status(401).json({ message: "Not authorized" });
    if (user.role !== 'business') return res.status(403).json({ message: "Forbidden" });

    const jobId = parseInt(req.params.jobId, 10);
    const userId = parseInt(req.params.userId, 10);
    if (Number.isNaN(jobId) || Number.isNaN(userId)) {
        return res.status(400).json({ message: "Invalid id" });
    }

    const { interested } = req.body;
    if (typeof interested !== 'boolean') {
        return res.status(400).json({ message: "interested must be boolean" });
    }

    const INACTIVITY_MS = 5 * 60 * 1000;
    const now = new Date();

    try {
        const business = await prisma.business.findUnique({ where: { accountId: user.id } });

        if (!business) return res.status(403).json({ message: "Forbidden" });

        const job = await prisma.job.findUnique({ where: { id: jobId } });

        if (!job || job.businessId !== business.id) return res.status(404).json({ message: "Not found" });
        if (job.status !== 'open') return res.status(409).json({ message: "Conflict" });

        const candidate = await prisma.regularUser.findUnique({
            where: { accountId: userId },
            include: {
                account: { select: { activated: true, suspended: true } },
                qualifications: {
                    where: { positionTypeId: job.positionTypeId, status: 'approved' },
                    select: { id: true }
                },
                jobs: { where: { status: 'filled' }, select: { startTime: true, endTime: true } }
            }
        });
        if (!candidate) return res.status(404).json({ message: "Not found" });

        const conflict = candidate.jobs.some(j => {
            const hasConflict = job.startTime < j.endTime && job.endTime > j.startTime;
            return hasConflict;
        });

        let discoverable =
            candidate.account.activated &&
            !candidate.account.suspended &&
            candidate.qualifications.length > 0;

        // Only apply strict checks in production
        if (process.env.NODE_ENV === 'production') {
            discoverable = discoverable &&
                candidate.available &&
                candidate.lastActiveAt &&
                (now - candidate.lastActiveAt) <= INACTIVITY_MS &&
                !conflict;
        }

        if (!discoverable) {
            return res.status(403).json({ message: "Forbidden" });
        }

        const existing = await prisma.interest.findUnique({
            where: { jobId_userId: { jobId, userId: candidate.id } }
        });

        if (!interested && (!existing || existing.businessInterested !== true)) {
            return res.status(400).json({ message: "Nothing to withdraw" });
        }

        const updated = await prisma.interest.upsert({
            where: { jobId_userId: { jobId, userId: candidate.id } },
            update: { businessInterested: interested },
            create: {
                jobId,
                userId: candidate.id,
                candidateInterested: null,
                businessInterested: true
            }
        });

        res.json({
            id: updated.id,
            job_id: updated.jobId,
            candidate: { id: candidate.accountId, interested: updated.candidateInterested },
            business: { id: business.accountId, interested: updated.businessInterested }
        });
    } catch (err) {
        console.error(err);
        res.status(500).json({ message: "Server error" });
    }
});

// GET /jobs/:jobId/interests - list interested users (business only)
router.get('/:jobId(\\d+)/interests', authenticate, async (req, res) => {

    const user = req.user;
    if (!user) return res.status(401).json({ message: "Not authorized" });
    if (user.role !== 'business') return res.status(403).json({ message: "Forbidden" });

    const jobId = parseInt(req.params.jobId, 10);
    if (Number.isNaN(jobId)) return res.status(400).json({ message: "Invalid job id" });

    const { page = 1, limit = 10 } = req.query;
    const take = parseInt(limit, 10);
    const skip = (parseInt(page, 10) - 1) * take;

    try {
        const business = await prisma.business.findUnique({ where: { accountId: user.id } });
        if (!business) return res.status(403).json({ message: "Forbidden" });

        const job = await prisma.job.findUnique({ where: { id: jobId } });
        if (!job || job.businessId !== business.id) return res.status(404).json({ message: "Not found" });

        const interests = await prisma.interest.findMany({
            where: {
                jobId,
                candidateInterested: true
            },
            include: {
                user: { select: { accountId: true, firstName: true, lastName: true } }
            }
        });

        const results = interests.map(i => ({
            interest_id: i.id,
            mutual: i.candidateInterested === true && i.businessInterested === true,
            user: {
                id: i.user.accountId,
                first_name: i.user.firstName,
                last_name: i.user.lastName
            }
        }));

        const count = results.length;
        const paginated = results.slice(skip, skip + take);

        res.json({ count, results: paginated });
    } catch (err) {
        console.error(err);
        res.status(500).json({ message: "Server error" });
    }
});

// Catches for unsupported methods
router.all('/', (req, res) => {
    res.set('Allow', 'GET');
    res.status(405).json({ message: "Method Not Allowed" });
});

router.all('/:jobId(\\d+)', (req, res) => {
    res.set('Allow', 'GET');
    res.status(405).json({ message: "Method Not Allowed" });
});

router.all('/:jobId(\\d+)/no-show', (req, res) => {
    res.set('Allow', 'PATCH');
    res.status(405).json({ message: "Method Not Allowed" });
});

router.all('/:jobId(\\d+)/interested', (req, res) => {
    res.set('Allow', 'PATCH');
    res.status(405).json({ message: "Method Not Allowed" });
});

router.all('/:jobId(\\d+)/candidates', (req, res) => {
    res.set('Allow', 'GET');
    res.status(405).json({ message: "Method Not Allowed" });
});

router.all('/:jobId(\\d+)/candidates/:userId(\\d+)', (req, res) => {
    res.set('Allow', 'GET');
    res.status(405).json({ message: "Method Not Allowed" });
});

router.all('/:jobId(\\d+)/candidates/:userId(\\d+)/interested', (req, res) => {
    res.set('Allow', 'PATCH');
    res.status(405).json({ message: "Method Not Allowed" });
});

router.all('/:jobId(\\d+)/interests', (req, res) => {
    res.set('Allow', 'GET');
    res.status(405).json({ message: "Method Not Allowed" });
});

// 404 catch-all for undefined paths
router.all('*', (_req, res) => {
  res.status(404).json({ error: 'Not found' });
});

module.exports = router;
