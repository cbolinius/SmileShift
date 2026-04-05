const express = require('express');
const { PrismaClient } = require('@prisma/client');
const authenticate = require('../middleware/auth');

const prisma = new PrismaClient();
const router = express.Router();

// GET /position-types
router.get('/', async (req, res) => {
    let user = null;
    const authHeader = req.headers['authorization'];
    if (authHeader) {
        try {
            const jwt = require('jsonwebtoken');
            const token = authHeader.split(' ')[1];
            const decoded = jwt.verify(token, process.env.JWT_SECRET);
            user = await prisma.account.findUnique({ where: { id: decoded.userId } });
        } catch (_) {}
    }

    const {
        keyword,
        name = 'asc',
        hidden,
        num_qualified = 'asc',
        page = 1,
        limit = 10,
    } = req.query;

    const isAdmin = user?.role === 'administrator';
    if (!user && (hidden !== undefined || num_qualified !== undefined)) {
        return res.status(401).json({ error: 'Not authorized' });
    }


    const pageNum = parseInt(page, 10);
    const limitNum = parseInt(limit, 10);
    const skip = (pageNum - 1) * limitNum;
    const take = limitNum;

    try {
        const filters = {};
        if (!isAdmin) {
            filters.hidden = false;
        } else if (hidden !== undefined) {
            filters.hidden = hidden === true || hidden === 'true';
        }
        if (keyword) {
            filters.OR = [
                { name: { contains: keyword } },
                { description: { contains: keyword } }
            ];
        }

        const types = await prisma.positionType.findMany({
            where: filters,
            include: { _count: { select: { qualifications: true } } }
        });

        const results = types.map(t => {
            const base = { id: t.id, name: t.name, description: t.description };
            if (isAdmin) {
                base.hidden = t.hidden;
                base.num_qualified = t._count.qualifications;
            }
            return base;
        });

        if (isAdmin) {
            results.sort((a, b) => {
                const cmp = a.num_qualified - b.num_qualified;
                if (cmp !== 0) {
                    return num_qualified === 'asc' ? cmp : -cmp;
                }
                return name === 'asc'
                    ? a.name.localeCompare(b.name)
                    : b.name.localeCompare(a.name);
            });
        } else {
            results.sort((a, b) =>
                name === 'asc'
                    ? a.name.localeCompare(b.name)
                    : b.name.localeCompare(a.name)
            );
        }

        const paginated = results.slice(skip, skip + take);

        res.json({
            count: results.length,
            results: paginated
        });
    } catch (err) {
        console.error(err);
        res.status(500).json({ error: 'Server error' });
    }
});

// POST /position-types
router.post('/', authenticate, async (req, res) => {
    const user = req.user;
    if (!user) return res.status(401).json({ error: 'Not authorized' });
    if (user.role !== 'administrator') return res.status(403).json({ error: 'Forbidden' });

    const { name, description, hidden = true } = req.body;
    if (!name) return res.status(400).json({ error: 'name is required' });
    if (!description) return res.status(400).json({ error: 'description is required' });

    try {
        const newType = await prisma.positionType.create({
            data: { name, description, hidden },
        });
        res.status(201).json({
            id: newType.id,
            name: newType.name,
            description: newType.description,
            hidden: newType.hidden,
            num_qualified: 0,
        });
    } catch (err) {
        console.error(err);
        res.status(500).json({ error: 'Server error' });
    }
});

// 405 for /position-types root
router.all('/', (req, res) => res.status(405).json({ error: 'Method not allowed' }));

// PATCH /position-types/:positionTypeId
router.patch('/:positionTypeId', authenticate, async (req, res) => {
    const user = req.user;
    if (!user) return res.status(401).json({ error: 'Not authorized' });
    if (user.role !== 'administrator') return res.status(403).json({ error: 'Forbidden' });

    const { positionTypeId } = req.params;
    const { name, description, hidden } = req.body;
    try {
        const existing = await prisma.positionType.findUnique({ where: { id: parseInt(positionTypeId, 10) } });
        if (!existing) return res.status(404).json({ error: 'Position type not found' });

        const updated = await prisma.positionType.update({
            where: { id: parseInt(positionTypeId, 10) },
            data: { name, description, hidden },
            select: { id: true, name: true, description: true, hidden: true }
        });
        const response = { id: updated.id };
        if (name !== undefined) response.name = updated.name;
        if (description !== undefined) response.description = updated.description;
        if (hidden !== undefined) response.hidden = updated.hidden;
        res.json(response);
    } catch (err) {
        console.error(err);
        res.status(500).json({ error: 'Server error' });
    }
});

// DELETE /position-types/:positionTypeId
router.delete('/:positionTypeId', authenticate, async (req, res) => {
    const user = req.user;
    if (!user) return res.status(401).json({ error: 'Not authorized' });
    if (user.role !== 'administrator') return res.status(403).json({ error: 'Forbidden' });

    const { positionTypeId } = req.params;
    try {
        const type = await prisma.positionType.findUnique({
            where: { id: parseInt(positionTypeId, 10) },
            include: { _count: { select: { qualifications: true } } }
        });
        if (!type) return res.status(404).json({ error: 'Position type not found' });
        if (type._count.qualifications > 0) {
            return res.status(409).json({ error: 'Cannot delete: position has qualified users' });
        }
        await prisma.positionType.delete({ where: { id: parseInt(positionTypeId, 10) } });
        res.status(204).send();
    } catch (err) {
        console.error(err);
        res.status(500).json({ error: 'Server error' });
    }
});

// 405 for /:positionTypeId
router.all('/:positionTypeId', (req, res) => res.status(405).json({ error: 'Method not allowed' }));

module.exports = router;
