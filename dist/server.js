"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
// ADD THIS AT THE VERY TOP
require("dotenv/config");
const express_1 = __importDefault(require("express"));
const cors_1 = __importDefault(require("cors"));
const googleapis_1 = require("googleapis");
const app = (0, express_1.default)();
// ✅ USE PROCESS ENVIRONMENT PORT (VERCEL PROVIDES THIS)
const PORT = process.env.PORT || 5000;
// ✅ UPDATE CORS FOR PRODUCTION
app.use((0, cors_1.default)({
    origin: [
        process.env.FRONTEND_URL || "http://localhost:3000",
        "https://ecofrontw.vercel.app", // We'll update this later
    ],
    credentials: true,
}));
app.use(express_1.default.json());
app.use(express_1.default.urlencoded({ extended: true }));
// ======== GOOGLE DRIVE CONFIGURATION ========
const authenticateGoogleDrive = () => {
    try {
        const credentials = process.env.GOOGLE_SERVICE_ACCOUNT;
        if (!credentials) {
            throw new Error("Google service account credentials not found");
        }
        const auth = new googleapis_1.google.auth.GoogleAuth({
            credentials: JSON.parse(credentials),
            scopes: ["https://www.googleapis.com/auth/drive.file"],
        });
        return googleapis_1.google.drive({ version: "v3", auth });
    }
    catch (error) {
        console.error("Google Drive authentication failed:", error);
        throw error;
    }
};
const DRIVE_FOLDER_ID = process.env.GOOGLE_DRIVE_FOLDER_ID || "your-folder-id";
// ======== END GOOGLE DRIVE CONFIG ========
// ✅ KEEP ALL YOUR EXISTING ENDPOINTS (login, upload, files, delete)
// ... your existing endpoints here ...
// ✅ ADD A ROOT ENDPOINT
app.get("/", (req, res) => {
    res.json({
        message: "Economic App Backend is running! 🚀",
        status: "OK",
        timestamp: new Date().toISOString(),
    });
});
// ✅ START SERVER WITH PROCESS.env.PORT
app.listen(PORT, () => {
    console.log(`Server is running on port ${PORT}`);
});
