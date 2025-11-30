"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.deleteFile = exports.uploadFile = exports.getFiles = void 0;
const googleapis_1 = require("googleapis");
const fs_1 = __importDefault(require("fs"));
// Google Drive authentication function
const authenticateGoogleDrive = () => {
    const credentials = process.env.GOOGLE_SERVICE_ACCOUNT;
    if (!credentials)
        throw new Error("Google service account credentials not found");
    const auth = new googleapis_1.google.auth.GoogleAuth({
        credentials: JSON.parse(credentials),
        scopes: ["https://www.googleapis.com/auth/drive.file"],
    });
    return googleapis_1.google.drive({ version: "v3", auth });
};
const DRIVE_FOLDER_ID = process.env.GOOGLE_DRIVE_FOLDER_ID || "your-folder-id";
const getFiles = async (req, res) => {
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
};
exports.getFiles = getFiles;
const uploadFile = async (req, res) => {
    if (!req.file) {
        return res.status(400).json({ message: "No file uploaded" });
    }
    try {
        const drive = authenticateGoogleDrive();
        const response = await drive.files.create({
            requestBody: {
                name: `${Date.now()}-${req.file.originalname}`,
                parents: [DRIVE_FOLDER_ID],
            },
            media: {
                mimeType: req.file.mimetype,
                body: fs_1.default.createReadStream(req.file.path),
            },
            fields: "id,name,webViewLink,webContentLink,mimeType",
        });
        // Make file publicly accessible
        await drive.permissions.create({
            fileId: response.data.id,
            requestBody: {
                role: "reader",
                type: "anyone",
            },
        });
        // Clean up temporary file
        try {
            fs_1.default.unlinkSync(req.file.path);
        }
        catch (deleteError) {
            console.log("Could not delete temporary file:", deleteError);
        }
        const downloadUrl = `https://drive.google.com/uc?export=download&id=${response.data.id}`;
        res.status(200).json({
            message: "File uploaded successfully!",
            file: {
                id: response.data.id,
                url: downloadUrl,
                viewUrl: response.data.webViewLink,
                type: response.data.mimeType || req.file.mimetype,
            },
        });
    }
    catch (error) {
        // Clean up on error
        try {
            fs_1.default.unlinkSync(req.file.path);
        }
        catch (deleteError) {
            console.log("Cleanup error:", deleteError);
        }
        res.status(500).json({
            message: "File upload failed",
            error: error.message,
        });
    }
};
exports.uploadFile = uploadFile;
const deleteFile = async (req, res) => {
    const fileId = req.params.id;
    try {
        const drive = authenticateGoogleDrive();
        await drive.files.delete({ fileId });
        res.status(200).json({ message: "File deleted successfully" });
    }
    catch (err) {
        console.error("Error deleting file:", err);
        if (err.code === 404) {
            res.status(404).json({ message: "File not found" });
        }
        else {
            res.status(500).json({ message: "Failed to delete file" });
        }
    }
};
exports.deleteFile = deleteFile;
