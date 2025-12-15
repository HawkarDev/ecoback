// // Export for Vercel

import "dotenv/config";
import express from "express";
import cors from "cors";
import multer from "multer";
import bcrypt from "bcryptjs";
import jwt from "jsonwebtoken";
import { list, put } from "@vercel/blob";

const app = express();

// Middleware
app.use(
  cors({
    origin: "*",
    credentials: true,
    methods: ["GET", "POST", "PUT", "DELETE", "OPTIONS"],
    allowedHeaders: ["Content-Type", "Authorization"],
  })
);

app.options("*", (req, res) => {
  res.header("Access-Control-Allow-Origin", req.headers.origin);
  res.header("Access-Control-Allow-Methods", "GET, POST, PUT, DELETE, OPTIONS");
  res.header("Access-Control-Allow-Headers", "Content-Type, Authorization");
  res.header("Access-Control-Allow-Credentials", "true");
  res.status(200).send();
});
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// Multer for file handling
const storage = multer.memoryStorage();
const upload = multer({ storage });

const JWT_SECRET = process.env.JWT_SECRET || "your-secret-key";

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
    message: "Economic App Backend is running on Vercel with Blob Storage! 🚀",
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

// Test endpoint to verify blob token is working
app.get("/api/verify-blob-token", (req, res) => {
  const token = process.env.BLOB_READ_WRITE_TOKEN;
  const isConfigured = !!token;

  // Security: Only show first few chars
  let tokenPreview = "NOT SET";
  if (isConfigured) {
    tokenPreview = `${token.substring(0, 10)}...${token.substring(
      token.length - 5
    )}`;
  }

  res.json({
    timestamp: new Date().toISOString(),
    backend: "economic-backend-new.vercel.app",
    blobTokenConfigured: isConfigured,
    tokenPreview: tokenPreview,
    tokenLength: isConfigured ? token.length : 0,
    environment: process.env.NODE_ENV || "production",
    status: isConfigured
      ? "✅ READY FOR UPLOADS"
      : "❌ TOKEN MISSING - REDEPLOY NEEDED",

    // Helpful instructions if token is missing
    instructions: !isConfigured
      ? [
          "1. Check Vercel Dashboard → Settings → Environment Variables",
          "2. Look for BLOB_READ_WRITE_TOKEN in Production column",
          "3. If missing, add it and REDEPLOY",
          "4. Token should start with: vercel_blob_rw_",
        ]
      : [
          "✅ Token is configured!",
          "Next: Test upload with curl command below",
        ],

    // Example curl command if token exists
    testCommand: isConfigured
      ? "curl -X POST https://economic-backend-new.vercel.app/api/upload \\\n" +
        "  -H 'Authorization: Bearer YOUR_JWT_TOKEN' \\\n" +
        "  -F 'file=@test.jpg'"
      : "First configure the token, then test",
  });
});
// VERCELL BLOB UPLOAD ENDPOINT
app.post(
  "/api/upload",
  authenticateAdmin,
  upload.single("file"),
  async (req, res) => {
    if (!req.file) {
      return res.status(400).json({ message: "No file uploaded" });
    }

    try {
      // Upload to Vercel Blob
      const blob = await put(
        `economic-files/${Date.now()}-${req.file.originalname}`,
        req.file.buffer,
        {
          access: "public",
          contentType: req.file.mimetype,
          token: process.env.BLOB_READ_WRITE_TOKEN,
        }
      );

      console.log("✅ File uploaded to Vercel Blob:", req.file.originalname);

      res.status(200).json({
        message: "File uploaded successfully to Vercel Blob!",
        file: {
          id: blob.pathname,
          name: req.file.originalname,
          url: blob.url,
          type: req.file.mimetype,
          size: req.file.size,
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

// app.delete("/api/files/:id", authenticateAdmin, async (req, res) => {
//   // Note: Vercel Blob deletion requires a different approach
//   // For now, return success (implement proper deletion later)
//   res.status(200).json({ message: "File deleted successfully" });
// });

// Export for Vercel
// Add this BEFORE export default app

app.get("/api/files", async (req, res) => {
  console.log("=== /api/files ENDPOINT CALLED ===");
  console.log("Current time:", new Date().toISOString());

  // TEMPORARY: Return just your uploaded file
  const responseData = [
    {
      id: "economic-files/1765827961503-debugpdffile.txt",
      name: "debugpdffile.txt",
      url: "https://eeap8astexqehuzi.public.blob.vercel-storage.com/economic-files/1765827961503-debugpdffile.txt",
      type: "text/plain",
      size: 18127,
      viewUrl:
        "https://eeap8astexqehuzi.public.blob.vercel-storage.com/economic-files/1765827961503-debugpdffile.txt",
      createdTime: new Date().toISOString(),
    },
  ];

  console.log("Returning data:", JSON.stringify(responseData, null, 2));

  res.status(200).json(responseData);
});

app.get("/api/check-deployment", (req, res) => {
  const token = process.env.BLOB_READ_WRITE_TOKEN;
  const hasToken = !!token;
  const isCorrectFormat = hasToken && token.startsWith("vercel_blob_rw_");

  res.json({
    timestamp: new Date().toISOString(),
    deployment: "latest",
    blobTokenExists: hasToken,
    isCorrectFormat: isCorrectFormat,
    tokenLength: hasToken ? token.length : 0,
    tokenPreview: hasToken ? `${token.substring(0, 20)}...` : "none",
    status: hasToken
      ? isCorrectFormat
        ? "✅ READY"
        : "❌ WRONG FORMAT"
      : "❌ MISSING",
    note: isCorrectFormat
      ? "Uploads should work now!"
      : hasToken
      ? "Token doesn't start with 'vercel_blob_rw_'"
      : "No token found",
  });
});
export default app;
