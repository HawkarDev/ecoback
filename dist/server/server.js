"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
require("dotenv/config");
const express_1 = __importDefault(require("express"));
const cors_1 = __importDefault(require("cors"));
const multer_1 = __importDefault(require("multer"));
const bcryptjs_1 = __importDefault(require("bcryptjs"));
const jsonwebtoken_1 = __importDefault(require("jsonwebtoken"));
const googleapis_1 = require("googleapis");
const stream_1 = require("stream");
const app = (0, express_1.default)();
// Middleware
// ======== CORS CONFIGURATION ========
// Enable CORS for all routes
// Simple CORS - allow all origins (quick fix)
app.use((0, cors_1.default)({
    origin: "*", // Allow ALL origins temporarily
    credentials: true,
    methods: ["GET", "POST", "PUT", "DELETE", "OPTIONS"],
    allowedHeaders: ["Content-Type", "Authorization"],
}));
// Handle preflight requests explicitly
app.options("*", (req, res) => {
    res.header("Access-Control-Allow-Origin", req.headers.origin);
    res.header("Access-Control-Allow-Methods", "GET, POST, PUT, DELETE, OPTIONS");
    res.header("Access-Control-Allow-Headers", "Content-Type, Authorization");
    res.header("Access-Control-Allow-Credentials", "true");
    res.status(200).send();
});
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
const DRIVE_FOLDER_ID = process.env.GOOGLE_DRIVE_FOLDER_ID;
const JWT_SECRET = process.env.JWT_SECRET || "your-secret-key";
// In-memory storage for Vercel
const storage = multer_1.default.memoryStorage();
const upload = (0, multer_1.default)({ storage });
// Admin credentials
const admin = {
    username: process.env.ADMIN_USERNAME || "admin",
    password: bcryptjs_1.default.hashSync(process.env.ADMIN_PASSWORD || "admin123", 10),
};
// ======== MIDDLEWARE ========
const authenticateAdmin = (req, res, next) => {
    var _a;
    const token = (_a = req.headers.authorization) === null || _a === void 0 ? void 0 : _a.split(" ")[1];
    if (!token) {
        return res
            .status(401)
            .json({ message: "Access denied. No token provided." });
    }
    try {
        const decoded = jsonwebtoken_1.default.verify(token, JWT_SECRET);
        req.user = decoded;
        next();
    }
    catch (error) {
        res.status(400).json({ message: "Invalid token" });
    }
};
// ======== ROUTES ========
app.get("/", (req, res) => {
    res.json({
        message: "Economic App Backend is running on Vercel! 🚀",
        status: "OK",
        timestamp: new Date().toISOString(),
    });
});
app.get("/api/health", (req, res) => {
    res.json({
        message: "API is healthy!",
        timestamp: new Date().toISOString(),
    });
});
app.post("/api/admin/login", (req, res) => {
    const { username, password } = req.body;
    try {
        if (username === admin.username &&
            bcryptjs_1.default.compareSync(password, admin.password)) {
            const token = jsonwebtoken_1.default.sign({ username: admin.username }, JWT_SECRET, {
                expiresIn: "1h",
            });
            res.status(200).json({
                message: "Login successful",
                token,
                user: { username: admin.username },
            });
        }
        else {
            res.status(401).json({ message: "Invalid credentials" });
        }
    }
    catch (error) {
        console.error("Error during login:", error);
        res.status(500).json({ message: "An error occurred during login" });
    }
});
app.get("/api/admin/profile", authenticateAdmin, (req, res) => {
    res.json({
        message: "Admin profile accessed successfully!",
        user: req.user,
        timestamp: new Date().toISOString(),
    });
});
app.get("/api/files", async (req, res) => {
    var _a;
    try {
        const drive = authenticateGoogleDrive();
        const response = await drive.files.list({
            q: `'${DRIVE_FOLDER_ID}' in parents and trashed = false`,
            fields: "files(id, name, mimeType, webViewLink, createdTime, size)",
            orderBy: "createdTime desc",
        });
        const files = ((_a = response.data.files) === null || _a === void 0 ? void 0 : _a.map((file) => ({
            id: file.id,
            name: file.name,
            type: file.mimeType,
            url: `https://drive.google.com/uc?export=download&id=${file.id}`,
            viewUrl: file.webViewLink,
            createdTime: file.createdTime,
            size: file.size,
        }))) || [];
        res.status(200).json(files);
    }
    catch (error) {
        console.error("Error fetching files:", error);
        res
            .status(500)
            .json({ message: "Failed to fetch files from Google Drive" });
    }
});
// WORKING FILE UPLOAD ENDPOINT
app.post("/api/upload", authenticateAdmin, upload.single("file"), async (req, res) => {
    if (!req.file) {
        return res.status(400).json({ message: "No file uploaded" });
    }
    try {
        const drive = authenticateGoogleDrive();
        console.log("📤 Uploading file:", req.file.originalname);
        // Convert buffer to stream
        const bufferStream = new stream_1.Readable();
        bufferStream.push(req.file.buffer);
        bufferStream.push(null);
        // Upload to Google Drive
        const response = await drive.files.create({
            requestBody: {
                name: `${Date.now()}-${req.file.originalname}`,
                parents: [DRIVE_FOLDER_ID],
            },
            media: {
                mimeType: req.file.mimetype,
                body: bufferStream,
            },
            fields: "id,name,webViewLink,mimeType",
        });
        console.log("✅ File uploaded to Google Drive:", response.data.name);
        // Make file publicly accessible
        await drive.permissions.create({
            fileId: response.data.id,
            requestBody: {
                role: "reader",
                type: "anyone",
            },
        });
        const downloadUrl = `https://drive.google.com/uc?export=download&id=${response.data.id}`;
        res.status(200).json({
            message: "File uploaded successfully to Google Drive!",
            file: {
                id: response.data.id,
                name: response.data.name,
                url: downloadUrl,
                viewUrl: response.data.webViewLink,
                type: response.data.mimeType || req.file.mimetype,
                size: `${(req.file.size / 1024 / 1024).toFixed(2)} MB`,
            },
        });
    }
    catch (error) {
        console.error("❌ Upload error:", error);
        res.status(500).json({
            message: "File upload failed",
            error: error.message,
        });
    }
});
app.delete("/api/files/:id", authenticateAdmin, async (req, res) => {
    const fileId = req.params.id;
    try {
        const drive = authenticateGoogleDrive();
        await drive.files.delete({ fileId });
        res.status(200).json({ message: "File deleted successfully" });
    }
    catch (err) {
        console.error("Error deleting file:", err);
        res.status(500).json({ message: "Failed to delete file" });
    }
});
// Export for Vercel
exports.default = app;
