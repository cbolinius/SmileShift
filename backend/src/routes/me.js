'use strict';

const express = require('express');
const { PrismaClient } = require('@prisma/client');
const authenticate = require('../middleware/auth');

const prisma = new PrismaClient();
const router = express.Router();

// GET /me - Get current user info with role-specific details
router.get('/', authenticate, async (req, res) => {
    if (!req.user) {
        return res.status(401).json({ message: 'Not authorized' });
    }

    try {
        const account = req.user;
        const baseResponse = {
            id: account.id,
            email: account.email,
            role: account.role,
            activated: account.activated,
            suspended: account.suspended,
            createdAt: account.createdAt
        };

        // Add role-specific information
        if (account.role === 'regular') {
            const regularUser = await prisma.regularUser.findUnique({
                where: { accountId: account.id }
            });

            if (regularUser) {
                return res.json({
                    ...baseResponse,
                    first_name: regularUser.firstName,
                    last_name: regularUser.lastName,
                    phone_number: regularUser.phoneNumber || '',
                    postal_address: regularUser.postalAddress || '',
                    birthday: regularUser.birthday,
                    avatar: regularUser.avatar,
                    resume: regularUser.resume,
                    biography: regularUser.biography,
                    available: regularUser.available,
                    lastActiveAt: regularUser.lastActiveAt
                });
            }
        }
        else if (account.role === 'business') {
            const business = await prisma.business.findUnique({
                where: { accountId: account.id }
            });

            if (business) {
                return res.json({
                    ...baseResponse,
                    business_name: business.businessName,
                    owner_name: business.ownerName,
                    phone_number: business.phoneNumber,
                    postal_address: business.postalAddress,
                    location: {
                        lon: business.lon,
                        lat: business.lat
                    },
                    avatar: business.avatar,
                    biography: business.biography,
                    verified: business.verified
                });
            }
        }
        else if (account.role === 'administrator') {
            return res.json(baseResponse);
        }

        // Fallback if no role-specific data found
        return res.json(baseResponse);

    } catch (error) {
        console.error('Error in /me endpoint:', error);
        return res.status(500).json({ message: 'Server error' });
    }
});

module.exports = router;
