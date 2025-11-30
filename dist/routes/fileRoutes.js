"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = require("express");
const multer_1 = __importDefault(require("multer"));
const path_1 = __importDefault(require("path"));
const fs_1 = __importDefault(require("fs"));
const fileController_1 = require("../controllers/fileController");
const authMiddleware_1 = require("../middleware/authMiddleware");
const router = (0, express_1.Router)();
// Multer configuration
const storage = multer_1.default.diskStorage({
    destination: (req, file, cb) => {
        const uploadDir = path_1.default.join(__dirname, "../../uploads");
        if (!fs_1.default.existsSync(uploadDir)) {
            fs_1.default.mkdirSync(uploadDir, { recursive: true });
        }
        cb(null, uploadDir);
    },
    filename: (req, file, cb) => {
        const fileName = `${Date.now()}-${file.originalname}`;
        cb(null, fileName);
    },
});
const upload = (0, multer_1.default)({ storage });
router.get("/", fileController_1.getFiles);
router.post("/upload", authMiddleware_1.authenticateAdmin, upload.single("file"), fileController_1.uploadFile);
router.delete("/:id", authMiddleware_1.authenticateAdmin, fileController_1.deleteFile);
exports.default = router;
