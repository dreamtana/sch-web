const { PrismaClient } = require("@prisma/client");

// สร้าง singleton instance ของ PrismaClient
const prisma = global.prisma || new PrismaClient();

if (process.env.NODE_ENV !== "production") global.prisma = prisma;

module.exports = prisma;
