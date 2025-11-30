import "dotenv/config";
import express from "express";
import cors from "cors";
import multer from "multer";
import bcrypt from "bcryptjs";
import jwt from "jsonwebtoken";
import { google } from "googleapis";
import { Readable } from "stream";

const app = express();

// Middleware
// ======== CORS CONFIGURATION ========
// Enable CORS for all routes
// Simple CORS - allow all origins (quick fix)
app.use(
  cors({
    origin: "*", // Allow ALL origins temporarily
    credentials: true,
    methods: ["GET", "POST", "PUT", "DELETE", "OPTIONS"],
    allowedHeaders: ["Content-Type", "Authorization"],
  })
);

// Handle preflight requests explicitly
app.options("*", (req, res) => {
  res.header("Access-Control-Allow-Origin", req.headers.origin);
  res.header("Access-Control-Allow-Methods", "GET, POST, PUT, DELETE, OPTIONS");
  res.header("Access-Control-Allow-Headers", "Content-Type, Authorization");
  res.header("Access-Control-Allow-Credentials", "true");
  res.status(200).send();
});
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

const DRIVE_FOLDER_ID = process.env.GOOGLE_DRIVE_FOLDER_ID as string;
const JWT_SECRET = process.env.JWT_SECRET || "your-secret-key";

// In-memory storage for Vercel
const storage = multer.memoryStorage();
const upload = multer({ storage });

// Admin credentials
const admin = {
  username: process.env.ADMIN_USERNAME || "admin",
  password: bcrypt.hashSync(process.env.ADMIN_PASSWORD || "admin123", 10),
};

// ======== MIDDLEWARE ========
const authenticateAdmin = (
  req: express.Request,
  res: express.Response,
  next: express.NextFunction
) => {
  const token = req.headers.authorization?.split(" ")[1];

  if (!token) {
    return res
      .status(401)
      .json({ message: "Access denied. No token provided." });
  }

  try {
    const decoded = jwt.verify(token, JWT_SECRET);
    (req as any).user = decoded;
    next();
  } catch (error) {
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
    if (
      username === admin.username &&
      bcrypt.compareSync(password, admin.password)
    ) {
      const token = jwt.sign({ username: admin.username }, JWT_SECRET, {
        expiresIn: "1h",
      });

      res.status(200).json({
        message: "Login successful",
        token,
        user: { username: admin.username },
      });
    } else {
      res.status(401).json({ message: "Invalid credentials" });
    }
  } catch (error: any) {
    console.error("Error during login:", error);
    res.status(500).json({ message: "An error occurred during login" });
  }
});

app.get("/api/admin/profile", authenticateAdmin, (req, res) => {
  res.json({
    message: "Admin profile accessed successfully!",
    user: (req as any).user,
    timestamp: new Date().toISOString(),
  });
});

app.get("/api/files", async (req, res) => {
  try {
    const drive = authenticateGoogleDrive();

    const response = await drive.files.list({
      q: `'${DRIVE_FOLDER_ID}' in parents and trashed = false`,
      fields: "files(id, name, mimeType, webViewLink, createdTime, size)",
      orderBy: "createdTime desc",
    });

    const files =
      response.data.files?.map((file: any) => ({
        id: file.id,
        name: file.name,
        type: file.mimeType,
        url: `https://drive.google.com/uc?export=download&id=${file.id}`,
        viewUrl: file.webViewLink,
        createdTime: file.createdTime,
        size: file.size,
      })) || [];

    res.status(200).json(files);
  } catch (error: any) {
    console.error("Error fetching files:", error);
    res
      .status(500)
      .json({ message: "Failed to fetch files from Google Drive" });
  }
});

// WORKING FILE UPLOAD ENDPOINT
app.post(
  "/api/upload",
  authenticateAdmin,
  upload.single("file"),
  async (req, res) => {
    if (!req.file) {
      return res.status(400).json({ message: "No file uploaded" });
    }

    try {
      const drive = authenticateGoogleDrive();

      console.log("📤 Uploading file:", req.file.originalname);

      // Convert buffer to stream
      const bufferStream = new Readable();
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
        fileId: response.data.id!,
        requestBody: {
          role: "reader",
          type: "anyone",
        },
      });

      const downloadUrl = `https://drive.google.com/uc?export=download&id=${response.data.id}`;

      res.status(200).json({
        message: "File uploaded successfully to Google Drive!",
        file: {
          id: response.data.id!,
          name: response.data.name!,
          url: downloadUrl,
          viewUrl: response.data.webViewLink!,
          type: response.data.mimeType || req.file.mimetype,
          size: `${(req.file.size / 1024 / 1024).toFixed(2)} MB`,
        },
      });
    } catch (error: any) {
      console.error("❌ Upload error:", error);
      res.status(500).json({
        message: "File upload failed",
        error: error.message,
      });
    }
  }
);

app.delete("/api/files/:id", authenticateAdmin, async (req, res) => {
  const fileId = req.params.id;

  try {
    const drive = authenticateGoogleDrive();
    await drive.files.delete({ fileId });

    res.status(200).json({ message: "File deleted successfully" });
  } catch (err: any) {
    console.error("Error deleting file:", err);
    res.status(500).json({ message: "Failed to delete file" });
  }
});

// Export for Vercel
export default app;
