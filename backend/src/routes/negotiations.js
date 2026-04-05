const express = require('express');
const router = express.Router();
const { PrismaClient } = require('@prisma/client');

const authenticate = require('../middleware/auth');
const { getIO } = require('../socket');

const prisma = new PrismaClient();

function getIOIfAvailable() {
    try {
        return getIO();
    } catch {
        return null;
    }
}

// Helper function to format negotiation response consistently
function formatNegotiationResponse(negotiation) {
    return {
        id: negotiation.id,
        status: negotiation.status,
        createdAt: negotiation.createdAt,
        expiresAt: negotiation.expiresAt,
        updatedAt: negotiation.updatedAt,
        job: {
            id: negotiation.job.id,
            status: negotiation.job.status,
            position_type: {
                id: negotiation.job.positionType.id,
                name: negotiation.job.positionType.name
            },
            business: {
                id: negotiation.job.business.accountId,
                business_name: negotiation.job.business.businessName
            },
            salary_min: negotiation.job.salaryMin,
            salary_max: negotiation.job.salaryMax,
            start_time: negotiation.job.startTime,
            end_time: negotiation.job.endTime,
            updatedAt: negotiation.job.updatedAt
        },
        user: {
            id: negotiation.user.accountId,
            first_name: negotiation.user.firstName,
            last_name: negotiation.user.lastName
        },
        decisions: {
            candidate: negotiation.candidateDecision,
            business: negotiation.businessDecision
        }
    };
}

// POST /negotiations - create new negotiation
router.post('/', authenticate, async (req, res) => {
    if (!req.user) {
        return res.status(401).json({ message: "Unauthorized" });
    }

    const { interest_id } = req.body;

    if (!interest_id) {
        return res.status(400).json({ message: "interest_id required" });
    }

    try {
        // Expire old negotiations
        await prisma.negotiation.updateMany({
            where: {
                status: 'active',
                expiresAt: { lt: new Date() }
            },
            data: { status: 'failed' }
        });

        const interest = await prisma.interest.findUnique({
            where: { id: interest_id },
            include: {
                job: { include: { business: { select: { id: true, accountId: true, businessName: true  } } } },
                user: {
                    select: {
                        id: true,
                        accountId: true,
                        firstName: true,
                        lastName: true,
                        available: true,
                        lastActiveAt: true,
                        account: { select: { activated: true, suspended: true } },
                        jobs: {
                            where: { status: 'filled' },
                            select: { startTime: true, endTime: true }
                        }
                    }
                }
            }
        });

        if (!interest) return res.status(404).json({ message: "Interest not found" });

        const isCandidate = req.user.role === 'regular' && interest.user.accountId === req.user.id;
        const isBusiness = req.user.role === 'business' && interest.job.business.accountId === req.user.id;

        // TESTING LOGS ===========================
        console.log('=== START NEGOTIATION ===');
        console.log('Interest ID:', interest_id);
        console.log('User role:', req.user.role);
        console.log('Interest user accountId:', interest.user.accountId);
        console.log('Request user id:', req.user.id);
        console.log('isCandidate:', isCandidate);
        console.log('isBusiness:', isBusiness);

        if (!isCandidate && !isBusiness)
            return res.status(404).json({ message: "Not authorized" });

        // Check if there's already an active negotiation for this specific interest (most specific check first)
        const existingForInterest = await prisma.negotiation.findFirst({
            where: { interestId: interest.id, status: 'active' },
            include: {
                job: {
                    include: {
                        positionType: true,
                        business: true
                    }
                },
                user: true
            }
        });

        // ONLY if 'active'. Restarting a 'failed' negotiation at end
        if (existingForInterest) {
            // TESTING LOG =======================
            console.log('Found existing negotiation for this interest:', existingForInterest.id);

            const response = formatNegotiationResponse(existingForInterest);
            return res.status(200).json(response);
        }

        // Check if there's already a negotiation for this exact job (next-most specific check)
        const existingForJob = await prisma.negotiation.findFirst({
            where: {
                status: 'active',
                jobId: interest.job.id
            },
            include: {
                job: {
                    include: {
                        positionType: true,
                        business: true
                    }
                },
                user: true
            }
        });

        // If there's already a negotiation for this exact job
        if (existingForJob) {
            // Check if the current user is a participant in this negotiation
            const isParticipant = (isCandidate && existingForJob.userId === interest.user.id) ||
                                  (isBusiness && existingForJob.job.businessId === interest.job.businessId);

            if (isParticipant) {
                // User/business is trying to start negotiation for a job they're already negotiating
                const response = formatNegotiationResponse(existingForJob);
                return res.status(200).json(response);
            } else {
                // Someone else is negotiating this job
                return res.status(409).json({ message: "Job is already in negotiation with another party" });
            }
        }

        // Check if the user is already in any active negotiation
        const userActive = await prisma.negotiation.findFirst({
            where: {
                status: 'active',
                userId: interest.user.id
            },
            include: {
                job: {
                    include: {
                        positionType: true,
                        business: true
                    }
                },
                user: true
            }
        });

        // If the candidate is already in an active negotiation
        if (userActive) {
            // CASE 1: The candidate (regular user) is the one trying to start negotiation
            if (isCandidate) {
                // Check if it's the SAME job they're already negotiating
                if (userActive.jobId === interest.job.id) {
                    // Same job - return existing negotiation
                    const response = formatNegotiationResponse(userActive);
                    return res.status(200).json(response);
                } else {
                    // Different job - user cannot be in two negotiations at once
                    return res.status(409).json({
                        message: "You are already in an active negotiation. Complete or decline it before starting another."
                    });
                }
            }

            // CASE 2: The business is trying to start negotiation, but candidate is already negotiating for another job
            if (isBusiness) {
                // Business cannot start negotiation with this candidate
                // Calculate remaining time
                const remainingSeconds = Math.max(0, Math.ceil((userActive.expiresAt - new Date()) / 1000));
                const minutes = Math.floor(remainingSeconds / 60);
                const seconds = remainingSeconds % 60;
                const waitTime = minutes > 0 ? `${minutes} minute${minutes !== 1 ? 's' : ''}` : `${seconds} second${seconds !== 1 ? 's' : ''}`;

                return res.status(409).json({
                    message: `Candidate is currently in another active negotiation. Please wait approximately ${waitTime}.`
                });
            }
        }

        // Check if the business is already in an active negotiation
        const businessActive = await prisma.negotiation.findFirst({
            where: {
                status: 'active',
                job: { businessId: interest.job.businessId }
            },
            include: {
                job: {
                    include: {
                        positionType: true,
                        business: true
                    }
                },
                user: true
            }
        });

        // If the business is already in an active negotiation
        if (businessActive) {
            // CASE 1: The business is the one trying to start negotiation
            if (isBusiness) {
                // Check if it's the SAME job they're already negotiating
                if (businessActive.jobId === interest.job.id) {
                    // Same job - return existing negotiation
                    const response = formatNegotiationResponse(businessActive);
                    return res.status(200).json(response);
                } else {
                    // Different job - business cannot be in two negotiations at once
                    return res.status(409).json({
                        message: "Your business is already in an active negotiation. Complete or decline it before starting another."
                    });
                }
            }

            // CASE 2: The candidate is trying to start negotiation, but business is already in another negotiation
            if (isCandidate) {
                // Candidate cannot start negotiation with this business
                // Calculate remaining time
                const remainingSeconds = Math.max(0, Math.ceil((businessActive.expiresAt - new Date()) / 1000));
                const minutes = Math.floor(remainingSeconds / 60);
                const seconds = remainingSeconds % 60;
                const waitTime = minutes > 0 ? `${minutes} minute${minutes !== 1 ? 's' : ''}` : `${seconds} second${seconds !== 1 ? 's' : ''}`;

                return res.status(409).json({
                    message: `Business is currently in another active negotiation. Please wait approximately ${waitTime}.`
                });
            }
        }

        // TESTING LOGS ==================
        console.log('existingForJob:', existingForJob?.id);
        console.log('userActive:', userActive?.id, 'jobId:', userActive?.jobId);
        console.log('businessActive:', businessActive?.id, 'jobId:', businessActive?.jobId);
        console.log('existingForInterest:', existingForInterest?.id);

        // Mutual interest check
        if (!interest.candidateInterested || !interest.businessInterested)
            return res.status(403).json({ message: "Interest not mutual" });

        // Job must be open
        if (interest.job.status !== 'open')
            return res.status(409).json({ message: "Job not open" });

        // Check for time conflicts
        const now = new Date();
        const INACTIVITY_MS = 5 * 60 * 1000;

        const conflict = interest.user.jobs.some(j =>
            interest.job.startTime < j.endTime && interest.job.endTime > j.startTime
        );

        // Full discoverability check
        const isDiscoverable =
            interest.user.account.activated &&
            !interest.user.account.suspended;

        if (!isDiscoverable) {
            return res.status(403).json({ message: "User not discoverable" });
        }

        // Check for failed negotiation to reactivate
        const failedNegotiation = await prisma.negotiation.findFirst({
            where: {
                interestId: interest.id,
                status: 'failed'
            },
            include: {
                job: {
                    include: {
                        positionType: true,
                        business: true
                    }
                },
                user: true
            }
        });

        // If there's a failed negotiation, reactivate it
        if (failedNegotiation) {
            console.log('Found failed negotiation to reactivate:', failedNegotiation.id);

            const systemConfig = require('../config/system');
            const seconds = systemConfig.negotiation_window || 900;
            const expiresAt = new Date(Date.now() + seconds * 1000);

            const reactivated = await prisma.negotiation.update({
                where: { id: failedNegotiation.id },
                data: {
                    status: 'active',
                    expiresAt: expiresAt,
                    candidateDecision: null,
                    businessDecision: null,
                    updatedAt: new Date()
                },
                include: {
                    job: {
                        include: {
                            positionType: true,
                            business: true
                        }
                    },
                    user: true
                }
            });

            const response = formatNegotiationResponse(reactivated);

            const io = getIOIfAvailable();
            if (io) {
                io.to(`account:${interest.user.accountId}`).emit('negotiation:started', {
                    negotiation_id: reactivated.id,
                    initiated_by: isCandidate ? 'you' : 'business'
                });
                io.to(`account:${interest.job.business.accountId}`).emit('negotiation:started', {
                    negotiation_id: reactivated.id,
                    initiated_by: isBusiness ? 'you' : 'candidate'
                });
            }

            return res.status(200).json(response);
        }

        // If no failed negotiation exists, create a new one
        console.log('Creating new negotiation for interest:', interest.id);

        const systemConfig = require('../config/system');
        const minutes = systemConfig.negotiation_window
            ? Math.round(systemConfig.negotiation_window / 60)
            : 15;
        const expiresAt = new Date(Date.now() + minutes * 60000);

        const negotiation = await prisma.negotiation.create({
            data: {
                interestId: interest.id,
                jobId: interest.jobId,
                userId: interest.userId,
                expiresAt
            }
        });

        const fullNegotiation = await prisma.negotiation.findUnique({
            where: { id: negotiation.id },
            include: {
                job: {
                    include: {
                        positionType: true,
                        business: true
                    }
                },
                user: true
            }
        });

        const io = getIOIfAvailable();
        if (io) {
            // Autojoin both parties to negotiation room
            io.sockets.sockets.forEach((s) => {
                if (s.accountId === interest.user.accountId || s.accountId === interest.job.business.accountId) {
                    s.join(`negotiation:${negotiation.id}`);
                }
            });

            io.to(`account:${interest.user.accountId}`).emit('negotiation:started', {
                negotiation_id: negotiation.id,
                initiated_by: isCandidate ? 'you' : 'business'
            });

            io.to(`account:${interest.job.business.accountId}`).emit('negotiation:started', {
                negotiation_id: negotiation.id,
                initiated_by: isBusiness ? 'you' : 'candidate'
            });
        }

        const response = formatNegotiationResponse(fullNegotiation);
        return res.status(201).json(response);
    } catch (err) {
        console.error(err);
        res.status(500).json({ message: "Server error" });
    }
});

// GET /negotiations/me - retrieve negotiations involving specific user
router.get('/me', authenticate, async (req, res) => {
    if (!req.user) {
        return res.status(401).json({ message: "Unauthorized" });
    }

    try {
        const negotiation = await prisma.negotiation.findFirst({
            where: {
                status: 'active',
                OR: [
                    { user: { accountId: req.user.id } },
                    { job: { business: { accountId: req.user.id } } }
                ]
            },
            include: {
                job: {
                    include: {
                        positionType: true,
                        business: true
                    }
                },
                user: true
            }
        });

        if (!negotiation)
            return res.status(404).json({ message: "No active negotiation" });

        if (new Date() > negotiation.expiresAt)
            return res.status(409).json({ message: "Negotiation expired" });

        const response = {
            id: negotiation.id,
            status: negotiation.status,
            createdAt: negotiation.createdAt,
            expiresAt: negotiation.expiresAt,
            updatedAt: negotiation.updatedAt,
            job: {
                id: negotiation.job.id,
                status: negotiation.job.status,
                position_type: {
                    id: negotiation.job.positionType.id,
                    name: negotiation.job.positionType.name
                },
                business: {
                    id: negotiation.job.business.accountId,
                    business_name: negotiation.job.business.businessName
                },
                salary_min: negotiation.job.salaryMin,
                salary_max: negotiation.job.salaryMax,
                start_time: negotiation.job.startTime,
                end_time: negotiation.job.endTime,
                updatedAt: negotiation.job.updatedAt
            },
            user: {
                id: negotiation.user.accountId,
                first_name: negotiation.user.firstName,
                last_name: negotiation.user.lastName
            },
            decisions: {
                candidate: negotiation.candidateDecision,
                business: negotiation.businessDecision
            }
        };

        return res.json(response);
    } catch (err) {
        console.error(err);
        res.status(500).json({ message: "Server error" });
    }
});

// PATCH /negotiations/me/decision - match current active negotiation if required conditions met
router.patch('/me/decision', authenticate, async (req, res) => {
    if (!req.user) {
        return res.status(401).json({ message: "Unauthorized" });
    }

    const { decision, negotiation_id } = req.body;

    // TESTING
    console.log('PATCH /negotiations/me/decision received:', { decision, negotiation_id, userRole: req.user.role });

    if (!negotiation_id) {
        return res.status(400).json({ message: "negotiation_id is required" });
    }

    if (!["accept", "decline"].includes(decision))
        return res.status(400).json({ message: "Invalid decision" });

    try {
        const negotiation = await prisma.negotiation.findUnique({
            where: { id: negotiation_id },
            include: {
                job: {
                    include: {
                        business: true
                    }
                },
                user: true
            }
        });

        if (!negotiation || negotiation.status !== 'active')
            return res.status(404).json({ message: "No active negotiation" });

        if (new Date() > negotiation.expiresAt) {
            await prisma.negotiation.update({
                where: { id: negotiation.id },
                data: { status: "failed" }
            });

            const io = getIOIfAvailable();
            if (io) {
                io.to(`negotiation:${negotiation.id}`).emit('negotiation-updated', {
                    id: negotiation.id,
                    status: "failed"
                });
            }

            return res.status(409).json({ message: "Expired" });
        }

        const isCandidate = req.user.role === 'regular' && negotiation.user.accountId === req.user.id;
        const isBusiness = req.user.role === 'business' && negotiation.job.business.accountId === req.user.id;

        if (!isCandidate && !isBusiness)
            return res.status(404).json({ message: "Not involved" });

        let updateData = {};

        if (isCandidate) {
            updateData.candidateDecision = decision;
        } else {
            updateData.businessDecision = decision;
        }

        // TESTING
        console.log('Updating negotiation with:', updateData);

        const updated = await prisma.negotiation.update({
            where: { id: negotiation.id },
            data: updateData
        });

        const io = getIOIfAvailable();
        if (io) {
            const targetAccountId = isCandidate
                ? negotiation.job.business.accountId
                : negotiation.user.accountId;

            io.to(`account:${targetAccountId}`).emit('negotiationDecision', {
                negotiationId: negotiation.id,
                decisionBy: req.user.role,
                decision
            });
        }

        // decline case
        if (decision === "decline") {
            // TESTING
            console.log('Someone declined! Marking negotiation as failed...');

            const failedNegotiation = await prisma.negotiation.update({
                where: { id: negotiation.id },
                data: { status: "failed" }
            });

            if (io) {
                io.to(`negotiation:${negotiation.id}`).emit('negotiation-updated', {
                    id: negotiation.id,
                    status: "failed"
                });
            }

            return res.json({
                id: failedNegotiation.id,
                status: failedNegotiation.status,
                createdAt: failedNegotiation.createdAt,
                expiresAt: failedNegotiation.expiresAt,
                updatedAt: failedNegotiation.updatedAt,
                decisions: {
                    candidate: isCandidate ? "decline" : negotiation.candidateDecision,
                    business: isBusiness ? "decline" : negotiation.businessDecision
                }
            });
        }

        // accept case (check both)
        if (updated.candidateDecision === "accept" &&
            updated.businessDecision === "accept") {

            // TESTING
            console.log('Both accepted! Filling job...');

            const fullNegotiation = await prisma.negotiation.findUnique({
                where: { id: negotiation.id },
                include: {
                    job: {
                        include: {
                            business: true
                        }
                    },
                    user: {
                        include: {
                            account: true
                        }
                    }
                }
            });

            const result = await prisma.$transaction([
                prisma.job.update({
                    where: { id: negotiation.jobId },
                    data: {
                        status: "filled",
                        workerId: negotiation.userId
                    }
                }),
                prisma.interest.update({
                    where: { id: negotiation.interestId },
                    data: {
                        candidateInterested: true,
                        businessInterested: true
                    }
                }),
                prisma.negotiation.update({
                    where: { id: negotiation.id },
                    data: { status: "success" }
                })
            ]);

            const io = getIOIfAvailable();
            if (io) {
                io.to(`negotiation:${negotiation.id}`).emit('negotiation-updated', {
                    id: negotiation.id,
                    status: "success"
                });

                io.to(`account:${fullNegotiation.user.accountId}`).emit('job:filled', {
                    jobId: fullNegotiation.job.id,
                    jobTitle: fullNegotiation.job.positionType?.name,
                    businessName: fullNegotiation.job.business?.businessName,
                    message: 'The job has been filled'
                });

                io.to(`account:${fullNegotiation.job.business.accountId}`).emit('job:filled', {
                    jobId: fullNegotiation.job.id,
                    jobTitle: fullNegotiation.job.positionType?.name,
                    businessName: fullNegotiation.job.business?.businessName,
                    message: 'The job has been filled'
                });
            }

            const finalNegotiation = await prisma.negotiation.findUnique({
                where: { id: negotiation.id },
                include: {
                    job: {
                        include: {
                            positionType: true,
                            business: true
                        }
                    },
                    user: true
                }
            });

            // Return success negotiation
            return res.json({
                id: finalNegotiation.id,
                status: finalNegotiation.status,
                createdAt: finalNegotiation.createdAt,
                expiresAt: finalNegotiation.expiresAt,
                updatedAt: finalNegotiation.updatedAt,
                job: {
                    id: finalNegotiation.job.id,
                    status: finalNegotiation.job.status,
                    position_type: {
                        id: finalNegotiation.job.positionType.id,
                        name: finalNegotiation.job.positionType.name
                    },
                    business: {
                        id: finalNegotiation.job.business.accountId,
                        business_name: finalNegotiation.job.business.businessName
                    },
                    salary_min: finalNegotiation.job.salaryMin,
                    salary_max: finalNegotiation.job.salaryMax,
                    start_time: finalNegotiation.job.startTime,
                    end_time: finalNegotiation.job.endTime,
                    updatedAt: finalNegotiation.job.updatedAt
                },
                user: {
                    id: finalNegotiation.user.accountId,
                    first_name: finalNegotiation.user.firstName,
                    last_name: finalNegotiation.user.lastName
                },
                decisions: {
                    candidate: finalNegotiation.candidateDecision,
                    business: finalNegotiation.businessDecision
                }
            });
        }

        // still active (one party accepted)
        return res.json({
            id: updated.id,
            status: updated.status,
            createdAt: updated.createdAt,
            expiresAt: updated.expiresAt,
            updatedAt: updated.updatedAt,
            decisions: {
                candidate: isCandidate ? decision : updated.candidateDecision,
                business: isBusiness ? decision : updated.businessDecision
            }
        });
    } catch (err) {
        console.error(err);
        res.status(500).json({ message: "Server error" });
    }
});

// PATCH /negotiations/me/withdraw - withdraw acceptance
router.patch('/me/withdraw', authenticate, async (req, res) => {
    if (!req.user) {
        return res.status(401).json({ message: "Unauthorized" });
    }

    const { negotiation_id } = req.body;

    if (!negotiation_id) {
        return res.status(400).json({ message: "negotiation_id required" });
    }

    try {
        const negotiation = await prisma.negotiation.findUnique({
            where: { id: negotiation_id },
            include: {
                job: {
                    include: {
                        business: true
                    }
                },
                user: true
            }
        });

        if (!negotiation || negotiation.status !== 'active') {
            return res.status(404).json({ message: "No active negotiation found" });
        }

        const isCandidate = req.user.role === 'regular' && negotiation.user.accountId === req.user.id;
        const isBusiness = req.user.role === 'business' && negotiation.job.business.accountId === req.user.id;

        if (!isCandidate && !isBusiness) {
            return res.status(404).json({ message: "Not involved" });
        }

        // Reset the user's decision to null
        const updateData = {};
        if (isCandidate) {
            updateData.candidateDecision = null;
        } else {
            updateData.businessDecision = null;
        }

        const updated = await prisma.negotiation.update({
            where: { id: negotiation.id },
            data: updateData
        });

        const io = getIOIfAvailable();
        if (io) {
            const targetAccountId = isCandidate
                ? negotiation.job.business.accountId
                : negotiation.user.accountId;

            io.to(`account:${targetAccountId}`).emit('negotiationDecision', {
                negotiationId: negotiation.id,
                decisionBy: req.user.role,
                decision: 'withdrawn'
            });
        }

        return res.json({
            id: updated.id,
            status: updated.status,
            decisions: {
                candidate: updated.candidateDecision,
                business: updated.businessDecision
            }
        });
    } catch (err) {
        console.error(err);
        res.status(500).json({ message: "Server error" });
    }
});

// GET /negotiations/interest/:interestId - get negotiation by interestId
router.get('/interest/:interestId', authenticate, async (req, res) => {
    if (!req.user) return res.status(401).json({ message: "Unauthorized" });

    const interestId = parseInt(req.params.interestId);
    if (isNaN(interestId)) return res.status(400).json({ message: "Invalid interest ID" });

    try {
        const negotiation = await prisma.negotiation.findFirst({
            where: {
                interestId: interestId
            },
            include: {
                job: {
                    include: {
                        positionType: true,
                        business: true
                    }
                },
                user: true
            }
        });

        if (!negotiation) {
            return res.status(404).json({ message: "No negotiation found for this interest" });
        }

        // Check if user is authorized to view this negotiation
        const isRegular = req.user.role === 'regular' && negotiation.user.accountId === req.user.id;
        const isBusiness = req.user.role === 'business' && negotiation.job.business.accountId === req.user.id;

        if (!isRegular && !isBusiness) {
            return res.status(403).json({ message: "Not authorized" });
        }

        const response = {
            id: negotiation.id,
            status: negotiation.status,
            expiresAt: negotiation.expiresAt,
            candidateDecision: negotiation.candidateDecision,
            businessDecision: negotiation.businessDecision
        };

        return res.json(response);
    } catch (err) {
        console.error(err);
        return res.status(500).json({ message: "Server error" });
    }
});

// GET /negotiations/:id - get negotiation by ID (for fetching expired negotiations)
router.get('/:id', authenticate, async (req, res) => {
    if (!req.user) return res.status(401).json({ message: "Unauthorized" });

    const id = parseInt(req.params.id);
    if (isNaN(id)) return res.status(400).json({ message: "Invalid negotiation ID" });

    try {
        const negotiation = await prisma.negotiation.findUnique({
            where: { id },
            include: {
                job: {
                    include: {
                        positionType: true,
                        business: true
                    }
                },
                user: true
            }
        });

        if (!negotiation) {
            return res.status(404).json({ message: "Negotiation not found" });
        }

        // Check authorization
        const isRegular = req.user.role === 'regular' && negotiation.user.accountId === req.user.id;
        const isBusiness = req.user.role === 'business' && negotiation.job.business.accountId === req.user.id;

        if (!isRegular && !isBusiness) {
            return res.status(403).json({ message: "Not authorized" });
        }

        const response = formatNegotiationResponse(negotiation);
        return res.json(response);
    } catch (err) {
        console.error(err);
        return res.status(500).json({ message: "Server error" });
    }
});

// Catches for unsupported methods
router.all('/', (req, res) => {
    res.set('Allow', 'POST');
    return res.status(405).json({ message: "Method Not Allowed" });
});

router.all('/me', (req, res) => {
    res.set('Allow', 'GET');
    return res.status(405).json({ message: "Method Not Allowed" });
});

router.all('/me/decision', (req, res) => {
    res.set('Allow', 'PATCH');
    return res.status(405).json({ message: "Method Not Allowed" });
});

// 404 catch-all for undefined paths
router.all('*', (_req, res) => {
  res.status(404).json({ error: 'Not found' });
});

module.exports = router;
