'use strict';

const { Server } = require('socket.io');
const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();
const jwt = require('jsonwebtoken');
const JWT_SECRET = process.env.JWT_SECRET;

let io;

function attach_sockets(server) {
    io = new Server(server, { cors: { origin: '*' } });

    // Authentication middleware for sockets
    io.use(async (socket, next) => {
        try {
            const token = socket.handshake.auth?.token;

            if (!token) {
                socket.emit("negotiation:error", {
                    error: "Not authenticated",
                    message: "Authentication token required"
                });
                return next(new Error("Authentication required"));
            }

            const decoded = jwt.verify(token, JWT_SECRET);

            // Attach correct participant id for negotiation checks
            const account = await prisma.account.findUnique({
                where: { id: decoded.userId },
                include: { regularUser: true, business: true }
            });

            if (!account) return next(new Error("Invalid token"));

            socket.accountId = account.id;
            socket.role = account.role;

            if (account.role === "regular") {
                socket.userId = account.regularUser.id;
            } else if (account.role === "business") {
                socket.userId = account.business.id;
            }

            return next();
        } catch (err) {
            socket.emit("negotiation:error", {
                error: "Not authenticated",
                message: "Invalid or expired token"
            });
            return next(new Error("Invalid token"));
        }
    });

    io.on('connection', (socket) => {
        // Join account room automatically
        const accountRoom = `account:${socket.accountId}`;
        socket.join(accountRoom);

        // Track which negotiation rooms the socket has joined
        socket.joinedNegotiations = new Set();

        // Automatically join all active negotiations for this account (async IIFE)
        (async () => {
            try {
                const activeNegotiations = await prisma.negotiation.findMany({
                    where: {
                        status: 'active',
                        OR: [
                            { userId: socket.userId },
                            { job: { businessId: socket.userId } }
                        ]
                    },
                    select: { id: true }
                });

                // TESTING LOGS =========================================
                console.log(`Socket ${socket.accountId} has ${activeNegotiations.length} active negotiations`);

                activeNegotiations.forEach(n => {
                    const roomName = `negotiation:${n.id}`;
                    socket.join(roomName);
                    socket.joinedNegotiations.add(n.id);
                    console.log(`Socket ${socket.accountId} auto-joined ${roomName}`);
                });

                socket.emit("negotiation:ready");
            } catch (err) {
                console.error("Error auto-joining negotiations:", err);
                socket.emit("negotiation:error", {
                    error: "Server error",
                    message: "Failed to auto-join negotiations"
                });
            }
        })();

        // Manual join requests
        socket.on('join-negotiation', async ({ negotiationId }) => {
            console.log(`Manual join request for negotiation ${negotiationId} from account ${socket.accountId}`);

            const negotiation = await prisma.negotiation.findUnique({
                where: { id: negotiationId },
                select: {
                    id: true,
                    status: true,
                    userId: true,
                    job: { select: { businessId: true } }
                }
            });

            if (!negotiation) {
                console.log(`Negotiation ${negotiationId} not found`);
                return;
            }

            if (negotiation.status !== 'active') {
                console.log(`Negotiation ${negotiationId} is not active`);
                return;
            }

            const isParticipant = negotiation.userId === socket.userId ||
                                  negotiation.job.businessId === socket.userId;

            if (!isParticipant) {
                console.log(`Account ${socket.accountId} is not a participant`);
                return;
            }

            const roomName = `negotiation:${negotiationId}`;
            socket.join(roomName);
            socket.joinedNegotiations.add(negotiationId);
            console.log(`Socket ${socket.accountId} joined ${roomName}`);

            socket.emit('negotiation:joined', { negotiationId });
        });

        socket.on('negotiation:message', async ({ negotiation_id, text }) => {
            if (!socket.joinedNegotiations.has(negotiation_id)) {
                return socket.emit('negotiation:error', {
                    error: "Not ready",
                    message: "Negotiation room not joined yet"
                });
            }

            if (!text || !text.trim()) {
                return socket.emit('negotiation:error', {
                    error: "Invalid message",
                    message: "Text is required"
                });
            }

            const negotiation = await prisma.negotiation.findUnique({
                where: { id: negotiation_id },
                select: {
                    id: true,
                    status: true,
                    userId: true,
                    job: { select: { businessId: true } }
                }
            });

            if (!negotiation) {
                return socket.emit('negotiation:error', {
                    error: "Negotiation not found",
                    message: "Negotiation does not exist"
                });
            }

            if (negotiation.status !== 'active') {
                return socket.emit('negotiation:error', {
                    error: "Negotiation not active",
                    message: "Negotiation is not active"
                });
            }

            const isParticipant =
                negotiation.userId === socket.userId ||
                negotiation.job.businessId === socket.userId;

            if (!isParticipant) {
                return socket.emit('negotiation:error', {
                    error: "Not part of this negotiation",
                    message: "You are not part of this negotiation"
                });
            }

            // Check negotiation mismatch
            const userActive = await prisma.negotiation.findFirst({
                where: {
                    status: "active",
                    OR: [
                        { userId: socket.userId },
                        { job: { businessId: socket.userId } }
                    ]
                },
                select: { id: true }
            });

            if (!userActive || userActive.id !== negotiation_id) {
                return socket.emit('negotiation:error', {
                    error: "Negotiation mismatch",
                    message: "This is not your active negotiation"
                });
            }

            const timestamp = new Date();

            io.to(`negotiation:${negotiation_id}`).emit('negotiation:message', {
                negotiation_id,
                sender: {
                    role: socket.role,
                    id: socket.accountId
                },
                text,
                createdAt: timestamp.toISOString()
            });
        });

        socket.on('leave-negotiation', (negotiationId) => {
            socket.leave(`negotiation:${negotiationId}`);
        });

        socket.on('disconnect', () => {
            console.log(`Socket disconnected: account ${socket.accountId}`);
        });
    });

    return io;
}

function getIO() {
    if (!io) throw new Error("Socket.io not initialized");
    return io;
}

module.exports = { attach_sockets, getIO };
