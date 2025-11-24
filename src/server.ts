// ADD THIS AT THE VERY TOP
import "dotenv/config";

import express from "express";
import multer from "multer";
import cors from "cors";
import fs from "fs";
import path from "path";
import bcrypt from "bcryptjs";
import jwt from "jsonwebtoken";
import { authenticateAdmin } from "./middleware/authMiddleware";
import { google } from "googleapis";

const app = express();

// ✅ USE PROCESS ENVIRONMENT PORT (VERCEL PROVIDES THIS)
const PORT = process.env.PORT || 5000;

// ✅ UPDATE CORS FOR PRODUCTION
app.use(
  cors({
    origin: [
      process.env.FRONTEND_URL || "http://localhost:3000",
      "https://ecofrontw.vercel.app",
    ],
    credentials: true,
  })
);

app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// ======== GOOGLE DRIVE CONFIGURATION ========
const authenticateGoogleDrive = () => {
  try {
    const credentials = process.env.GOOGLE_SERVICE_ACCOUNT;

    if (!credentials) {
      throw new Error("Google service account credentials not found");
    }

    const auth = new google.auth.GoogleAuth({
      credentials: JSON.parse(credentials),
      scopes: ["https://www.googleapis.com/auth/drive.file"],
    });

    return google.drive({ version: "v3", auth });
  } catch (error: any) {
    console.error("Google Drive authentication failed:", error);
    throw error;
  }
};

const DRIVE_FOLDER_ID = process.env.GOOGLE_DRIVE_FOLDER_ID || "your-folder-id";
// ======== END GOOGLE DRIVE CONFIG ========

// Set up Multer for temporary file uploads
const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    const uploadDir = path.join(__dirname, "../uploads");
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

// Use environment variables for admin credentials
const admin = {
  username: process.env.ADMIN_USERNAME || "admin",
  password: bcrypt.hashSync(process.env.ADMIN_PASSWORD || "admin123", 10),
};

// Use environment variable for JWT secret
const JWT_SECRET = process.env.JWT_SECRET || "your-secret-key";

// ======== DEBUG ROUTES ========
app.get("/debug", (req, res) => {
  res.json({
    message: "Debug route working!",
    routes: ["/", "/files", "/login", "/upload", "/debug/files"],
    environment: process.env.NODE_ENV,
    timestamp: new Date().toISOString(),
  });
});

app.get("/debug/files", (req, res) => {
  res.json({
    message: "Files debug route working!",
    test: "If this works, your routes are configured correctly",
  });
});

app.get("/env-check", (req, res) => {
  res.json({
    hasGoogleServiceAccount: !!process.env.GOOGLE_SERVICE_ACCOUNT,
    hasDriveFolderId: !!process.env.GOOGLE_DRIVE_FOLDER_ID,
    hasAdminUsername: !!process.env.ADMIN_USERNAME,
    nodeEnv: process.env.NODE_ENV,
    timestamp: new Date().toISOString(),
  });
});

// ======== MAIN ROUTES ========

// ✅ ROOT ENDPOINT
app.get("/", (req, res) => {
  res.json({
    message: "Economic App Backend is running! 🚀",
    status: "OK",
    timestamp: new Date().toISOString(),
  });
});

// ✅ LOGIN ENDPOINT
app.post("/login", (req, res) => {
  const { username, password } = req.body;

  try {
    if (
      username === admin.username &&
      bcrypt.compareSync(password, admin.password)
    ) {
      const token = jwt.sign({ username: admin.username }, JWT_SECRET, {
        expiresIn: "1h",
      });

      res.status(200).json({ message: "Login successful", token });
    } else {
      res.status(401).json({ message: "Invalid credentials" });
    }
  } catch (error: any) {
    console.error("Error during login:", error);
    res.status(500).json({ message: "An error occurred during login" });
  }
});

// ✅ FILES ENDPOINT
app.get("/files", async (req, res) => {
  try {
    const drive = authenticateGoogleDrive();

    console.log("Fetching files from Google Drive folder:", DRIVE_FOLDER_ID);

    const response = await drive.files.list({
      q: `'${DRIVE_FOLDER_ID}' in parents and trashed = false`,
      fields: "files(id, name, mimeType, webViewLink, createdTime, size)",
      orderBy: "createdTime desc",
    });

    const files =
      response.data.files?.map((file) => ({
        id: file.id!,
        name: file.name!,
        type: file.mimeType!,
        url: `https://drive.google.com/uc?export=download&id=${file.id}`,
        viewUrl: file.webViewLink!,
        createdTime: file.createdTime!,
        size: file.size!,
      })) || [];

    console.log(`Found ${files.length} files in Google Drive`);
    res.status(200).json(files);
  } catch (error: any) {
    console.error("Error fetching files from Google Drive:", error);
    res
      .status(500)
      .json({ message: "Failed to fetch files from Google Drive" });
  }
});

// ✅ UPLOAD ENDPOINT
app.post(
  "/upload",
  authenticateAdmin,
  upload.single("file"),
  async (req, res) => {
    console.log("Upload request received for Google Drive");

    if (!req.file) {
      return res.status(400).json({ message: "No file uploaded" });
    }

    try {
      const drive = authenticateGoogleDrive();

      console.log("Uploading to Google Drive...", {
        name: req.file.originalname,
        size: req.file.size,
        type: req.file.mimetype,
      });

      // Upload to Google Drive
      const response = await drive.files.create({
        requestBody: {
          name: `${Date.now()}-${req.file.originalname}`,
          parents: [DRIVE_FOLDER_ID],
        },
        media: {
          mimeType: req.file.mimetype,
          body: fs.createReadStream(req.file.path),
        },
        fields: "id,name,webViewLink,webContentLink,mimeType",
      });

      console.log("Google Drive upload successful:", {
        fileId: response.data.id,
        name: response.data.name,
      });

      // Make file publicly accessible
      await drive.permissions.create({
        fileId: response.data.id!,
        requestBody: {
          role: "reader",
          type: "anyone",
        },
      });

      // Create downloadable URL
      const downloadUrl = `https://drive.google.com/uc?export=download&id=${response.data.id}`;

      const metadata = {
        name: req.body.name || req.file.originalname,
        category: req.body.category || "general",
        driveFileId: response.data.id,
        driveFileName: response.data.name,
      };

      // Clean up temporary local file
      try {
        fs.unlinkSync(req.file.path);
        console.log("Temporary file deleted");
      } catch (deleteError) {
        console.log("Could not delete temporary file:", deleteError);
      }

      res.status(200).json({
        message: "File uploaded successfully to Google Drive!",
        file: {
          id: response.data.id!,
          url: downloadUrl,
          viewUrl: response.data.webViewLink,
          type: response.data.mimeType || req.file.mimetype,
          metadata: metadata,
        },
      });
    } catch (error: any) {
      console.error("Google Drive upload error:", error);

      // Clean up temporary file on error
      try {
        fs.unlinkSync(req.file.path);
      } catch (deleteError) {
        console.log("Cleanup error:", deleteError);
      }

      res.status(500).json({
        message: "File upload failed to Google Drive",
        error: error.message,
      });
    }
  }
);

// ✅ DELETE ENDPOINT
app.delete("/files/:id", authenticateAdmin, async (req, res) => {
  const fileId = req.params.id;

  try {
    const drive = authenticateGoogleDrive();

    await drive.files.delete({
      fileId: fileId,
    });

    res
      .status(200)
      .json({ message: "File deleted successfully from Google Drive" });
  } catch (err: any) {
    console.error("Error deleting file from Google Drive:", err);

    if (err.code === 404) {
      res.status(404).json({ message: "File not found in Google Drive" });
    } else {
      res
        .status(500)
        .json({ message: "Failed to delete file from Google Drive" });
    }
  }
});

// ✅ START SERVER WITH PROCESS.env.PORT
app.listen(PORT, () => {
  console.log(`Server is running on port ${PORT}`);
});
