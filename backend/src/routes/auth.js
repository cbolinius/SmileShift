const express = require('express');
const jwt = require('jsonwebtoken');
const { PrismaClient } = require('@prisma/client');
const bcrypt = require('bcrypt');

const prisma = new PrismaClient();
const router = express.Router();

const JWT_SECRET = process.env.JWT_SECRET;
if (!JWT_SECRET) throw new Error("JWT_SECRET environment variable is not set");

router.post('/tokens', async (req, res) => {
    const { email, password } = req.body;
    if (!email || !password) {
        return res.status(400).json({ message: "Email and password required" });
    }
    try {
        const user = await prisma.account.findFirst({ where: { email } });
        if (!user) return res.status(401).json({ message: "Invalid credentials" });
        const isMatch = await bcrypt.compare(password, user.password);
        if (!isMatch) return res.status(401).json({ message: "Invalid credentials" });
        if (!user.activated) return res.status(403).json({ message: "Account not activated" });
        const expiresIn = '1h';
        const token = jwt.sign({ userId: user.id, role: user.role }, JWT_SECRET, { expiresIn });
        const expiresAt = new Date(Date.now() + 60 * 60 * 1000);
        res.json({ token, expiresAt });
    } catch (err) {
        console.error(err);
        res.status(500).json({ message: "Server error" });
    }
});

const { v4: uuidv4 } = require('uuid');
const systemConfig = require('../config/system');
const resetRateLimiter = new Map();

function getClientIp(req) {
    return req.headers['x-forwarded-for']?.split(',')[0].trim() || req.socket?.remoteAddress || 'unknown';
}

function isValidPassword(pwd) {
    if (typeof pwd !== 'string') return false;
    if (pwd.length < 8 || pwd.length > 20) return false;
    if (!/[A-Z]/.test(pwd)) return false;
    if (!/[a-z]/.test(pwd)) return false;
    if (!/[0-9]/.test(pwd)) return false;
    if (!/[^A-Za-z0-9]/.test(pwd)) return false;
    return true;
}

function isValidEmail(email) {
    return typeof email === 'string' && /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email);
}

router.post('/resets', async (req, res) => {
    const ip = getClientIp(req);
    const now = Date.now();
    const cooldownMs = systemConfig.reset_cooldown * 1000;
    const lastRequest = resetRateLimiter.get(ip);
    if (lastRequest !== undefined && now - lastRequest < cooldownMs) {
        return res.status(429).json({ error: 'Too many requests. Please wait before trying again.' });
    }
    const { email } = req.body;
    if (!email || typeof email !== 'string') {
        return res.status(400).json({ error: 'email is required' });
    }
    try {
        const account = await prisma.account.findUnique({ where: { email } });
        resetRateLimiter.set(ip, now);
        if (!account) {
            return res.status(202).json({
                expiresAt: new Date(now + 7 * 24 * 60 * 60 * 1000),
                resetToken: uuidv4(),
            });
        }
        const resetToken = uuidv4();
        const expiresAt = new Date(now + 7 * 24 * 60 * 60 * 1000);
        await prisma.account.update({ where: { id: account.id }, data: { resetToken, expiresAt } });
        return res.status(202).json({ expiresAt, resetToken });
    } catch (err) {
        console.error(err);
        return res.status(500).json({ error: 'Server error' });
    }
});

router.post('/resets/:resetToken', async (req, res) => {
    const { resetToken } = req.params;
    const { email, password } = req.body;
    if (!email || typeof email !== 'string') {
        return res.status(400).json({ error: 'email is required' });
    }
    if (password !== undefined && !isValidPassword(password)) {
        return res.status(400).json({ error: 'Invalid password format' });
    }
    try {
        const account = await prisma.account.findFirst({ where: { resetToken } });
        if (!account) return res.status(401).json({ error: 'Invalid or expired reset token' });
        if (account.expiresAt && account.expiresAt < new Date()) {
            return res.status(410).json({ error: 'Reset token has expired' });
        }
        if (account.email !== email) {
            return res.status(401).json({ error: 'Email does not match reset token' });
        }
        const updateData = { resetToken: null, expiresAt: null, activated: true };
        if (password) updateData.password = await bcrypt.hash(password, 10);
        const updated = await prisma.account.update({
            where: { id: account.id },
            data: updateData,
        });
        return res.json({
            id: updated.id,
            email: updated.email,
            activated: updated.activated,
            role: updated.role,
        });
    } catch (err) {
        console.error(err);
        return res.status(500).json({ error: 'Server error' });
    }
});

// Catches for unsupported methods
router.all('/tokens', (req, res) => {
  res.set('Allow', 'POST').status(405).json({ error: 'Method not allowed' });
});

router.all('/resets', (req, res) => {
  res.set('Allow', 'POST').status(405).json({ error: 'Method not allowed' });
});

router.all('/resets/:resetToken', (req, res) => {
  res.set('Allow', 'POST').status(405).json({ error: 'Method not allowed' });
});

// 404 catch-all for undefined paths
router.all('*', (_req, res) => {
  res.status(404).json({ error: 'Not found' });
});

module.exports = router;
module.exports.isValidPassword = isValidPassword;
module.exports.isValidEmail = isValidEmail;
