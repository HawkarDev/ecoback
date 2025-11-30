import { Router } from "express";
import multer from "multer";
import path from "path";
import fs from "fs";
import {
  getFiles,
  uploadFile,
  deleteFile,
} from "../controllers/fileController";
import { authenticateAdmin } from "../middleware/authMiddleware";

const router = Router();

// Multer configuration
const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    const uploadDir = path.join(__dirname, "../../uploads");
    if (!fs.existsSync(uploadDir)) {
      fs.mkdirSync(uploadDir, { recursive: true });
    }
    cb(null, uploadDir);
  },
  filename: (req, file, cb) => {
    const fileName = `${Date.now()}-${file.originalname}`;
    cb(null, fileName);
  },
});

const upload = multer({ storage });

router.get("/", getFiles);
router.post("/upload", authenticateAdmin, upload.single("file"), uploadFile);
router.delete("/:id", authenticateAdmin, deleteFile);

export default router;
