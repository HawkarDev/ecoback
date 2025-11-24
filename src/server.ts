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
      "https://ecofrontw.vercel.app", // We'll update this later
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
