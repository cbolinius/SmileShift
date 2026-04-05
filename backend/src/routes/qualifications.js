const express = require('express');
const { PrismaClient } = require('@prisma/client');
const authenticate = require('../middleware/auth');
const multer = require('multer');
const path = require('path');
const fs = require('fs');
const prisma = new PrismaClient();
const router = express.Router();

const MAX_FILE_SIZE = 10_000_000; // 10MB
const uploadPdf = multer({
    storage: multer.memoryStorage(),
    limits: { fileSize: MAX_FILE_SIZE },
    fileFilter: (req, file, cb) => {
        if (file.mimetype === 'application/pdf') return cb(null, true);
        return cb(new Error('INVALID_FILE_TYPE'));
    }
});

// GET /qualifications - qualifications needing admin attention
router.get('/', authenticate, async (req, res) => {

    // Only administrators can access this endpoint
    const user = req.user;
    if (!user) {
        return res.status(401).json({ message: "Not authorized" });
    }
    if (user.role !== 'administrator') {
        return res.status(403).json({ message: "Admin access required" });
    }

    // Pagination and filtering
    const { keyword, page = 1, limit = 10 } = req.query;
    const take = parseInt(limit, 10);
    const skip = (parseInt(page, 10) - 1) * take;

    try {
        // First get all qualifications that need attention
        const allQualifications = await prisma.qualification.findMany({
            where: { status: { in: ['submitted', 'revised'] } },
            include: {
                user: {
                    include: {
                        account: { select: { email: true } }
                    }
                },
                positionType: true
            },
            orderBy: { id: 'asc' }
        });

        // Filter by keyword if provided
        let filtered = allQualifications;
        if (keyword && keyword.trim() !== '') {

            const kw = keyword.trim().toLowerCase();

            filtered = allQualifications.filter(q => {
                const fullName = `${q.user.firstName} ${q.user.lastName}`.toLowerCase();
                const email = q.user.account.email.toLowerCase();
                const phone = (q.user.phoneNumber || '').toLowerCase();

                return fullName.includes(kw) ||
                       q.user.firstName.toLowerCase().includes(kw) ||
                       q.user.lastName.toLowerCase().includes(kw) ||
                       phone.includes(kw) ||
                       email.includes(kw);
            });
        }

        const count = filtered.length;

        const results = filtered.slice(skip, skip + take).map(q => ({
            id: q.id,
            status: q.status,
            user: {
                id: q.user.id,
                first_name: q.user.firstName,
                last_name: q.user.lastName
            },
            position_type: {
                id: q.positionType.id,
                name: q.positionType.name
            },
            updatedAt: q.updatedAt
        }));

        res.json({ count, results });
    } catch (err) {
        console.error(err);
        res.status(500).json({ message: "Server error" });
    }
});

// POST /qualifications - create a new qualification (regular users only)
router.post('/', authenticate, async (req, res) => {
    // Only regular users can create qualifications
    const user = req.user;
    if (!user) {
        return res.status(401).json({ message: "Not authorized" });
    }
    if (user.role !== 'regular') {
        return res.status(403).json({ message: "Regular user access required" });
    }

    // Validate input
    const { position_type_id, note } = req.body;
    const positionTypeId = parseInt(position_type_id, 10);

    if (!position_type_id || Number.isNaN(positionTypeId)) {
        return res.status(400).json({ message: "position_type_id is required" });
    }
    if (note !== undefined && typeof note !== 'string') {
        return res.status(400).json({ message: "note must be a string" });
    }

    try {
        // Verify regular user exists
        const regularUser = await prisma.regularUser.findUnique({
            where: { accountId: user.id }
        });

        if (!regularUser) {
            return res.status(403).json({ message: "Regular user not found" });
        }

        // Verify position type exists and is not hidden
        const positionType = await prisma.positionType.findUnique({
            where: { id: positionTypeId }
        });
        if (!positionType || positionType.hidden) {
            return res.status(404).json({ message: "Position type not found" });
        }

        // Check if qualification already exists for this user and position type
        const existing = await prisma.qualification.findUnique({
            where: {
                userId_positionTypeId: {
                    userId: regularUser.id,
                    positionTypeId
                }
            }
        });

        if (existing) {
            return res.status(409).json({ message: "Qualification already exists" });
        }

        // Create qualification with status 'created'
        const created = await prisma.qualification.create({
            data: {
                userId: regularUser.id,
                positionTypeId,
                status: 'created',
                note: note ?? ''
            },
            include: {
                user: { select: { id: true, firstName: true, lastName: true } },
                positionType: { select: { id: true, name: true } }
            }
        });

        // Return created qualification
        res.status(201).json({
            id: created.id,
            status: created.status,
            note: created.note ?? '',
            document: created.document ?? null,
            user: {
                id: created.user.id,
                first_name: created.user.firstName,
                last_name: created.user.lastName
            },
            position_type: {
                id: created.positionType.id,
                name: created.positionType.name
            },
            updatedAt: created.updatedAt
        });
    } catch (err) {
        console.error(err);
        res.status(500).json({ message: "Server error" });
    }
});

// GET /qualifications/:qualificationId - retrieve a single qualification
router.get('/:qualificationId', authenticate, async (req, res) => {
    //authenticate user
    const user = req.user;
    if (!user) {
        return res.status(401).json({ message: "Not authorized" });
    }
    // Validate qualification ID
    const id = parseInt(req.params.qualificationId, 10);
    if (Number.isNaN(id)) {
        return res.status(400).json({ message: "Invalid qualification id" });
    }

    try {
        // Get qualification with related user and position type info
        const qualification = await prisma.qualification.findUnique({
            where: { id },
            include: {
                positionType: { select: { id: true, name: true, description: true } },
                user: {
                    include: {
                        account: { select: { email: true, role: true, activated: true, suspended: true, createdAt: true } }
                    }
                }
            }
        });

        if (!qualification) {
            return res.status(404).json({ message: "Not found" });
        }
        // Regular users can only view their own qualifications
        if (user.role === 'regular') {
            const regularUser = await prisma.regularUser.findUnique({
                where: { accountId: user.id }
            });
            if (!regularUser || regularUser.id !== qualification.userId) {
                return res.status(404).json({ message: "Not found" });
            }
        }
        if (user.role === 'business') {
            // Only approved qualifications and only if the user expressed interest
            // in one of this business's active jobs with matching position type.
            if (qualification.status !== 'approved') {
                return res.status(403).json({ message: "Forbidden" });
            }

            const business = await prisma.business.findUnique({
                where: { accountId: user.id }
            });
            if (!business) {
                return res.status(403).json({ message: "Forbidden" });
            }
            // Check if there is an interest by this user in an active job of this business with matching position type
            const hasRelevantInterest = await prisma.interest.findFirst({
                where: {
                    userId: qualification.userId,
                    candidateInterested: true,
                    job: {
                        businessId: business.id,
                        status: { in: ['open'] },
                        positionTypeId: qualification.positionTypeId
                    }
                }
            });

            if (!hasRelevantInterest) {
                return res.status(403).json({ message: "Forbidden" });
            }
        }
        // Format response based on user role
        const base = {
            id: qualification.id,
            document: qualification.document,
            note: qualification.note ?? '',
            position_type: {
                id: qualification.positionType.id,
                name: qualification.positionType.name,
                description: qualification.positionType.description
            },
            updatedAt: qualification.updatedAt,
            user: {
                id: qualification.user.accountId,
                first_name: qualification.user.firstName,
                last_name: qualification.user.lastName,
                role: qualification.user.account.role,
                avatar: qualification.user.avatar,
                resume: qualification.user.resume,
                biography: qualification.user.biography
            }
        };
        // Administrators can see all user info, regular users can see limited info about themselves, business users can see limited info about others
        if (user.role !== 'business') {
            base.user.email = qualification.user.account.email;
            base.user.phone_number = qualification.user.phoneNumber;
            base.user.postal_address = qualification.user.postalAddress;
            base.user.birthday = qualification.user.birthday;
            base.user.activated = qualification.user.account.activated;
            base.user.suspended = qualification.user.account.suspended;
            base.user.createdAt = qualification.user.account.createdAt;
            base.status = qualification.status;
        }

        res.json(base);
    } catch (err) {
        console.error(err);
        res.status(500).json({ message: "Server error" });
    }
});

// PATCH /qualifications/:qualificationId - update a qualification (admin or regular)
router.patch('/:qualificationId', authenticate, async (req, res) => {
    // Only administrators and regular users can update qualifications
    const user = req.user;
    if (!user) {
        return res.status(401).json({ message: "Not authorized" });
    }
    if (user.role !== 'administrator' && user.role !== 'regular') {
        return res.status(403).json({ message: "Forbidden" });
    }
    // Validate qualification ID
    const id = parseInt(req.params.qualificationId, 10);
    if (Number.isNaN(id)) {
        return res.status(400).json({ message: "Invalid qualification id" });
    }
    // Validate input
    const { status, note } = req.body;
    if (status !== undefined && typeof status !== 'string') {
        return res.status(400).json({ message: "status must be a string" });
    }
    if (note !== undefined && typeof note !== 'string') {
        return res.status(400).json({ message: "note must be a string" });
    }

    try {
        // Get qualification with related user and position type info
        const qualification = await prisma.qualification.findUnique({
            where: { id },
            include: {
                user: { select: { id: true, firstName: true, lastName: true, accountId: true } },
                positionType: { select: { id: true, name: true } }
            }
        });

        if (!qualification) {
            return res.status(404).json({ message: "Not found" });
        }

        // Regular users can only update their own qualification
        if (user.role === 'regular') {
            const regularUser = await prisma.regularUser.findUnique({
                where: { accountId: user.id }
            });
            if (!regularUser) {
                    return res.status(403).json({ message: "Forbidden" });
                }
            if (regularUser.id !== qualification.userId) {
                return res.status(403).json({ message: "Forbidden" });
            }
        }

        // Check status transitions
        if (status !== undefined) {
            const current = qualification.status;
            if (user.role === 'administrator') {
                const ok =
                    (current === 'submitted' || current === 'revised') &&
                    (status === 'approved' || status === 'rejected');
                if (!ok) {
                    return res.status(403).json({ message: "Forbidden" });
                }
            } else if (user.role === 'regular') {
                const ok =
                    (current === 'created' && status === 'submitted') ||
                    ((current === 'approved' || current === 'rejected') && status === 'revised');
                if (!ok) {
                    return res.status(403).json({ message: "Forbidden" });
                }
            }
        }

        // Perform update
        const updated = await prisma.qualification.update({
            where: { id },
            data: {
                status: status !== undefined ? status : qualification.status,
                note: note !== undefined ? note : qualification.note
            },
            include: {
                user: { select: { id: true, firstName: true, lastName: true } },
                positionType: { select: { id: true, name: true } }
            }
        });

        res.json({
            id: updated.id,
            status: updated.status,
            document: updated.document ?? null,
            note: updated.note ?? '',
            user: {
                id: updated.user.id,
                first_name: updated.user.firstName,
                last_name: updated.user.lastName
            },
            position_type: {
                id: updated.positionType.id,
                name: updated.positionType.name
            },
            updatedAt: updated.updatedAt
        });
    } catch (err) {
        console.error(err);
        res.status(500).json({ message: "Server error" });
    }
});

// PUT /qualifications/:qualificationId/document - upload a qualification document (regular only)
router.put('/:qualificationId/document', authenticate, (req, res) => {
    // Only regular users can upload qualification documents
    const user = req.user;
    if (!user) {
        return res.status(401).json({ message: "Not authorized" });
    }
    if (user.role !== 'regular') {
        return res.status(403).json({ message: "Forbidden" });
    }

    // Validate qualification ID
    const id = parseInt(req.params.qualificationId, 10);
    if (Number.isNaN(id)) {
        return res.status(400).json({ message: "Invalid qualification id" });
    }

    uploadPdf.single('file')(req, res, async (err) => {
        if (err) {
            return res.status(400).json({ message: "Invalid file" });
        }
        if (!req.file) {
            return res.status(400).json({ message: "File is required" });
        }

        try {
            // Ensure this qualification belongs to the authenticated user
            const regularUser = await prisma.regularUser.findUnique({
                where: { accountId: user.id }
            });
            if (!regularUser) {
                return res.status(403).json({ message: "Forbidden" });
            }

            const qualification = await prisma.qualification.findUnique({
                where: { id }
            });
            if (!qualification) {
                return res.status(404).json({ message: "Not found" });
            }
            if (qualification.userId !== regularUser.id) {
                return res.status(403).json({ message: "Forbidden" });
            }

            // Save file to /uploads/users/<userId>/position_type/<positionTypeId>/document.pdf
            const dir = path.join(
                __dirname,
                '..',
                '..',
                'uploads',
                'users',
                String(qualification.userId),
                'position_type',
                String(qualification.positionTypeId)
            );
            fs.mkdirSync(dir, { recursive: true });

            const filePath = path.join(dir, 'document.pdf');
            fs.writeFileSync(filePath, req.file.buffer);

            const publicPath = `/uploads/users/${qualification.userId}/position_type/${qualification.positionTypeId}/document.pdf`;

            await prisma.qualification.update({
                where: { id },
                data: { document: publicPath }
            });

            res.json({ document: publicPath });
        } catch (e) {
            console.error(e);
            res.status(500).json({ message: "Server error" });
        }
    });
});

// Catches for unsupported methods
router.all('/', (req, res) => {
    res.set('Allow', 'GET, POST');
    res.status(405).json({ message: "Method not allowed" });
});

router.all('/:qualificationId', (req, res) => {
    res.set('Allow', 'GET, PATCH');
    res.status(405).json({ message: "Method not allowed" });
});

router.all('/:qualificationId/document', (req, res) => {
    res.set('Allow', 'PUT');
    res.status(405).json({ message: "Method not allowed" });
});

// 404 catch-all for undefined paths
router.all('*', (_req, res) => {
  res.status(404).json({ error: 'Not found' });
});

module.exports = router;
