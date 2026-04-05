/*
 * Complete this script so that it is able to add a superuser to the database
 * Usage example: 
 *   node prisma/createsu.js clive123 clive.su@mail.utoronto.ca SuperUser123!
 */
'use strict';

const { PrismaClient } = require('@prisma/client');
const bcrypt = require('bcrypt');

const prisma = new PrismaClient();

async function main() {
    const args = process.argv;

    if (args.length !== 5) {
        console.error("Usage: node prisma/createsu.js <utorid> <email> <password>");
        process.exit(1);
    }

    const utorid = args[2];
    const email = args[3];
    const plaintextPassword = args[4];

    try {
        // Check if email already exists
        const existingEmail = await prisma.account.findUnique({
            where: { email }
        });

        if (existingEmail) {
            console.error("Error: An account with this email already exists.");
            process.exit(1);
        }

        // Check if utorid already exists
        const existingUtorid = await prisma.account.findUnique({
            where: { utorid }
        });

        if (existingUtorid) {
            console.error("Error: An account with this utorid already exists.");
            process.exit(1);
        }

        // Hash password
        const hashedPassword = await bcrypt.hash(plaintextPassword, 10);

        // Create administrator
        const admin = await prisma.account.create({
            data: {
                utorid,
                email,
                password: hashedPassword,
                role: "administrator",
                activated: true,
                suspended: false
            }
        });

        console.log("Administrator created successfully:");
        console.log({
            id: admin.id,
            utorid: admin.utorid,
            email: admin.email,
            role: admin.role,
            activated: admin.activated
        });

    } catch (err) {
        console.error("Error creating administrator:", err.message);
    } finally {
        await prisma.$disconnect();
    }
}

main();
