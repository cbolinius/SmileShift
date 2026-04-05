const jwt = require('jsonwebtoken');
const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

const JWT_SECRET = process.env.JWT_SECRET;

if (!JWT_SECRET) {
    throw new Error("JWT_SECRET environment variable is not set");
}

const authenticate = async (req, res, next) => {
    const authHeader = req.headers['authorization'];
    if (!authHeader) {
        req.user = null; // no user, continue
        return next();
    }

    // Bearer <token>
    const parts = authHeader.split(' ');
    if (parts.length !== 2 || parts[0] !== 'Bearer') {
        return res.status(401).json({ message: "Invalid authorization header" });
    }

    const token = parts[1];
    if (!token) {
        return res.status(401).json({ message: "Missing token" });
    }

    try {
        const payload = jwt.verify(token, JWT_SECRET); // Verify JWT token
        const user = await prisma.account.findUnique({ // Fetch user from database
            where: { id: payload.userId },
            include: { regularUser: true }
        });

        if (!user) {
            return res.status(401).json({ message: "Invalid token" });
        }

        req.user = user; // Set authenticated user for later endpoints

        // UPDATE ACTIVITY TIMESTAMP
        if (user.role === 'regular') {
            await prisma.regularUser.update({
                where: { accountId: user.id },
                data: { lastActiveAt: new Date() }
            });
        }

        next();

    } catch (err) {
        return res.status(401).json({ message: "Invalid or expired token" });
    }
};

module.exports = authenticate;
