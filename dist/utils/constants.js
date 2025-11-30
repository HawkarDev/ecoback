"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.constants = void 0;
exports.constants = {
    JWT_SECRET: process.env.JWT_SECRET || "your-secret-key",
    DRIVE_FOLDER_ID: process.env.GOOGLE_DRIVE_FOLDER_ID || "your-folder-id",
    CORS_ORIGINS: [
        process.env.FRONTEND_URL || "http://localhost:3000",
        "https://ecofrontw.vercel.app",
    ],
};
