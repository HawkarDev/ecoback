const express = require("express");
const serverless = require("serverless-http");
const multer = require("multer");
const cors = require("cors");
const fs = require("fs");
const path = require("path");
const bcrypt = require("bcryptjs");
const jwt = require("jsonwebtoken");
const { google } = require("googleapis");

const app = express();

// Enable CORS
app.use(cors());
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
  } catch (error) {
    console.error("Google Drive authentication failed:", error);
    throw error;
  }
};

const DRIVE_FOLDER_ID = process.env.GOOGLE_DRIVE_FOLDER_ID;

// Set up Multer for file uploads
const storage = multer.memoryStorage(); // Use memory storage for serverless
const upload = multer({ storage });

// Admin credentials from environment variables
const admin = {
  username: process.env.ADMIN_USERNAME || "admin",
  password: bcrypt.hashSync(process.env.ADMIN_PASSWORD || "admin123", 10),
};

const JWT_SECRET = process.env.JWT_SECRET || "your-secret-key";

// Simple auth middleware
const authenticateAdmin = (req, res, next) => {
  const token = req.headers.authorization?.split(" ")[1];

  if (!token) {
    return res
      .status(401)
      .json({ message: "Access denied. No token provided." });
  }

  try {
    const decoded = jwt.verify(token, JWT_SECRET);
    req.user = decoded;
    next();
  } catch (error) {
    res.status(400).json({ message: "Invalid token" });
  }
};

// ======== API ROUTES ========

// Root endpoint
app.get("/", (req, res) => {
  res.json({
    message: "Economic App API is running!",
    status: "OK",
  });
});

// Login endpoint
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
  } catch (error) {
    console.error("Error during login:", error);
    res.status(500).json({ message: "An error occurred during login" });
  }
});

// Files endpoint
app.get("/files", async (req, res) => {
  try {
    const drive = authenticateGoogleDrive();

    const response = await drive.files.list({
      q: `'${DRIVE_FOLDER_ID}' in parents and trashed = false`,
      fields: "files(id, name, mimeType, webViewLink, createdTime, size)",
      orderBy: "createdTime desc",
    });

    const files =
      response.data.files?.map((file) => ({
        id: file.id,
        name: file.name,
        type: file.mimeType,
        url: `https://drive.google.com/uc?export=download&id=${file.id}`,
        viewUrl: file.webViewLink,
        createdTime: file.createdTime,
        size: file.size,
      })) || [];

    res.status(200).json(files);
  } catch (error) {
    console.error("Error fetching files from Google Drive:", error);
    res
      .status(500)
      .json({ message: "Failed to fetch files from Google Drive" });
  }
});

// Upload endpoint (simplified for serverless)
app.post(
  "/upload",
  authenticateAdmin,
  upload.single("file"),
  async (req, res) => {
    if (!req.file) {
      return res.status(400).json({ message: "No file uploaded" });
    }

    try {
      const drive = authenticateGoogleDrive();

      // Upload to Google Drive
      const response = await drive.files.create({
        requestBody: {
          name: `${Date.now()}-${req.file.originalname}`,
          parents: [DRIVE_FOLDER_ID],
        },
        media: {
          mimeType: req.file.mimetype,
          body: require("stream").Readable.from(req.file.buffer),
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

      const downloadUrl = `https://drive.google.com/uc?export=download&id=${response.data.id}`;

      const metadata = {
        name: req.body.name || req.file.originalname,
        category: req.body.category || "general",
        driveFileId: response.data.id,
        driveFileName: response.data.name,
      };

      res.status(200).json({
        message: "File uploaded successfully to Google Drive!",
        file: {
          id: response.data.id,
          url: downloadUrl,
          viewUrl: response.data.webViewLink,
          type: response.data.mimeType || req.file.mimetype,
          metadata: metadata,
        },
      });
    } catch (error) {
      console.error("Google Drive upload error:", error);
      res.status(500).json({
        message: "File upload failed to Google Drive",
        error: error.message,
      });
    }
  }
);

// Delete endpoint
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
  } catch (err) {
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

// Export the serverless function
module.exports.handler = serverless(app);
