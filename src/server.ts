// import express from "express";
// import multer from "multer";
// import cors from "cors";
// import fs from "fs";
// import path from "path";
// import bcrypt from "bcryptjs";
// import jwt from "jsonwebtoken";
// import { authenticateAdmin } from "./middleware/authMiddleware";
// import { google } from "googleapis";

// const app = express();
// const PORT = 5000;

// // Enable CORS
// app.use(cors());
// app.use(express.json());
// app.use(express.urlencoded({ extended: true }));

// // Set up Multer for file uploads
// const storage = multer.diskStorage({
//   destination: (req, file, cb) => {
//     const uploadDir = path.join(__dirname, "../uploads");
//     if (!fs.existsSync(uploadDir)) {
//       fs.mkdirSync(uploadDir, { recursive: true });
//     }
//     cb(null, uploadDir);
//   },
//   filename: (req, file, cb) => {
//     const extension = path.extname(file.originalname);
//     const fileName = `${Date.now()}-${file.originalname}`;
//     cb(null, fileName);
//   },
// });

// const upload = multer({ storage });

// // Example admin (for demonstration purposes)
// const admin = {
//   username: "admin",
//   password: bcrypt.hashSync("admin123", 10), // Hash the password
// };

// // Login endpoint
// app.post("/login", (req, res) => {
//   const { username, password } = req.body;

//   try {
//     // Check if the username and password match
//     if (
//       username === admin.username &&
//       bcrypt.compareSync(password, admin.password)
//     ) {
//       // Generate a JWT token
//       const token = jwt.sign({ username: admin.username }, "your-secret-key", {
//         expiresIn: "1h", // Token expires in 1 hour
//       });

//       res.status(200).json({ message: "Login successful", token });
//     } else {
//       res.status(401).json({ message: "Invalid credentials" });
//     }
//   } catch (error) {
//     console.error("Error during login:", error);
//     res.status(500).json({ message: "An error occurred during login" });
//   }
// });

// // Logout endpoint

// app.post("/logout", (req, res) => {
//   // Perform any logout logic (e.g., invalidate the token)
//   res.status(200).json({ message: "Logged out successfully" });
// });

// // Upload endpoint (protected by admin authentication)
// app.post("/upload", authenticateAdmin, upload.single("file"), (req, res) => {
//   if (!req.file) {
//     return res.status(400).json({ message: "No file uploaded" });
//   }

//   const metadata = {
//     name: req.body.name,
//     category: req.body.category,
//   };

//   // Save metadata to a JSON file
//   const metadataPath = path.join(
//     __dirname,
//     "../uploads",
//     `${req.file.filename}.json`
//   );
//   try {
//     fs.writeFileSync(metadataPath, JSON.stringify(metadata));
//   } catch (err) {
//     console.error("Error saving metadata:", err);
//     return res.status(500).json({ message: "Failed to save metadata" });
//   }

//   res.status(200).json({
//     message: "File uploaded successfully!",
//     file: {
//       id: req.file.filename,
//       url: `http://localhost:${PORT}/uploads/${req.file.filename}`,
//       type: req.file.mimetype,
//       metadata: metadata,
//     },
//   });
// });

// // Fetch files endpoint
// app.get("/files", (req, res) => {
//   const uploadDir = path.join(__dirname, "../uploads");
//   fs.readdir(uploadDir, (err, files) => {
//     if (err) {
//       console.error("Error reading upload directory:", err);
//       return res.status(500).json({ message: "Unable to scan files" });
//     }

//     const getFileType = (file: string): string => {
//       const extension = path.extname(file).toLowerCase();
//       if ([".mp4", ".webm", ".mov", ".avi", ".mkv"].includes(extension)) {
//         return "video/" + extension.slice(1);
//       }
//       if ([".mp3", ".wav", ".ogg", ".m4a", ".flac"].includes(extension)) {
//         return "audio/" + extension.slice(1);
//       }
//       if ([".txt", ".md", ".csv", ".html", ".css", ".js"].includes(extension)) {
//         return "text/plain";
//       }
//       if (extension === ".json") {
//         return "application/json";
//       }
//       if (extension === ".pdf") {
//         return "application/pdf";
//       }
//       if (extension === ".doc") {
//         return "application/msword";
//       }
//       if (extension === ".docx") {
//         return "application/vnd.openxmlformats-officedocument.wordprocessingml.document";
//       }
//       if (
//         [".png", ".jpg", ".jpeg", ".gif", ".bmp", ".svg"].includes(extension)
//       ) {
//         return "image/" + extension.slice(1);
//       }
//       return "application/octet-stream";
//     };

//     const fileList = files
//       .filter((file) => !file.endsWith(".json"))
//       .map((file) => {
//         const metadataPath = path.join(uploadDir, `${file}.json`);
//         let metadata = {};

//         if (fs.existsSync(metadataPath)) {
//           try {
//             metadata = JSON.parse(fs.readFileSync(metadataPath, "utf8"));
//           } catch (err) {
//             console.error(`Error reading metadata for file ${file}:`, err);
//           }
//         } else {
//           console.warn(`Metadata file not found for file ${file}`);
//         }

//         return {
//           id: file,
//           url: `http://localhost:${PORT}/uploads/${file}`,
//           type: getFileType(file),
//           metadata: metadata,
//         };
//       });

//     res.status(200).json(fileList);
//   });
// });

// // Serve uploaded files statically
// app.use("/uploads", express.static(path.join(__dirname, "../uploads")));

// // Global error handler
// app.use(
//   (
//     err: Error,
//     req: express.Request,
//     res: express.Response,
//     next: express.NextFunction
//   ) => {
//     console.error("Unhandled error:", err);
//     res.status(500).json({ message: "An unexpected error occurred" });
//   }
// );
// // Delete endpoint (protected by admin authentication)
// app.delete("/files/:id", authenticateAdmin, (req, res) => {
//   const fileId = req.params.id;
//   const filePath = path.join(__dirname, "../uploads", fileId);
//   const metadataPath = path.join(__dirname, "../uploads", `${fileId}.json`);

//   try {
//     // Delete the file and its metadata
//     if (fs.existsSync(filePath)) {
//       fs.unlinkSync(filePath);
//     }
//     if (fs.existsSync(metadataPath)) {
//       fs.unlinkSync(metadataPath);
//     }

//     res.status(200).json({ message: "File deleted successfully" });
//   } catch (err) {
//     console.error("Error deleting file:", err);
//     res.status(500).json({ message: "Failed to delete file" });
//   }
// });

// // Update endpoint (protected by admin authentication)
// app.put("/files/:id", authenticateAdmin, (req, res) => {
//   const fileId = req.params.id;
//   const metadataPath = path.join(__dirname, "../uploads", `${fileId}.json`);

//   try {
//     if (!fs.existsSync(metadataPath)) {
//       return res.status(404).json({ message: "File metadata not found" });
//     }

//     // Update metadata
//     const newMetadata = req.body;
//     fs.writeFileSync(metadataPath, JSON.stringify(newMetadata));

//     res.status(200).json({ message: "File metadata updated successfully" });
//   } catch (err) {
//     console.error("Error updating file metadata:", err);
//     res.status(500).json({ message: "Failed to update file metadata" });
//   }
// });

// // Start the server
// app.listen(PORT, () => {
//   console.log(`Server is running on http://localhost:${PORT}`);
// });
// // ======== GOOGLE DRIVE CONFIGURATION ========
// const authenticateGoogleDrive = () => {
//   try {
//     const credentials = process.env.GOOGLE_SERVICE_ACCOUNT;

//     if (!credentials) {
//       throw new Error("Google service account credentials not found");
//     }

//     const auth = new google.auth.GoogleAuth({
//       credentials: JSON.parse(credentials),
//       scopes: ["https://www.googleapis.com/auth/drive.file"],
//     });

//     return google.drive({ version: "v3", auth });
//   } catch (error) {
//     console.error("Google Drive authentication failed:", error);
//     throw error;
//   }
// };

// const DRIVE_FOLDER_ID = process.env.GOOGLE_DRIVE_FOLDER_ID || "your-folder-id";
// // ======== END GOOGLE DRIVE CONFIG ========

// google api
import "dotenv/config"; // ← MUST BE FIRST LINE
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
const PORT = process.env.PORT || 5000;

// Enable CORS for production
app.use(
  cors({
    origin: [process.env.FRONTEND_URL || "http://localhost:3000"],
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
  } catch (error) {
    console.error("Google Drive authentication failed:", error);
    throw error;
  }
};

const DRIVE_FOLDER_ID = process.env.GOOGLE_DRIVE_FOLDER_ID || "your-folder-id";
// ======== END GOOGLE DRIVE CONFIG ========

// Set up Multer for temporary file uploads (before uploading to Google Drive)
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

// Logout endpoint
app.post("/logout", (req, res) => {
  res.status(200).json({ message: "Logged out successfully" });
});

// ======== UPDATED UPLOAD ENDPOINT FOR GOOGLE DRIVE ========
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
          id: response.data.id!, // Use Google Drive file ID instead of local filename
          url: downloadUrl, // Download URL
          viewUrl: response.data.webViewLink, // View in Google Drive
          type: response.data.mimeType || req.file.mimetype,
          metadata: metadata,
        },
      });
    } catch (error: any) {
      // FIXED: Added type annotation
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

// ======== UPDATED DELETE ENDPOINT FOR GOOGLE DRIVE ========
app.delete("/files/:id", authenticateAdmin, async (req, res) => {
  const fileId = req.params.id; // This is now the Google Drive file ID

  console.log("Delete request for Google Drive file:", fileId);

  try {
    const drive = authenticateGoogleDrive();

    await drive.files.delete({
      fileId: fileId,
    });

    console.log("File deleted from Google Drive:", fileId);
    res
      .status(200)
      .json({ message: "File deleted successfully from Google Drive" });
  } catch (err: any) {
    // FIXED: Added type annotation
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

// ======== UPDATED FILES ENDPOINT FOR GOOGLE DRIVE ========
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
        url: `https://drive.google.com/uc?export=download&id=${file.id}`, // Download URL
        viewUrl: file.webViewLink!, // View in Google Drive
        createdTime: file.createdTime!,
        size: file.size!,
      })) || [];

    console.log(`Found ${files.length} files in Google Drive`);
    res.status(200).json(files);
  } catch (error: any) {
    // FIXED: Added type annotation
    console.error("Error fetching files from Google Drive:", error);
    res
      .status(500)
      .json({ message: "Failed to fetch files from Google Drive" });
  }
});

// Serve uploaded files statically (keep this for any other static files)
app.use("/uploads", express.static(path.join(__dirname, "../uploads")));

// Global error handler
app.use(
  (
    err: Error,
    req: express.Request,
    res: express.Response,
    next: express.NextFunction
  ) => {
    console.error("Unhandled error:", err);
    res.status(500).json({ message: "An unexpected error occurred" });
  }
);

// Update endpoint (protected by admin authentication)
app.put("/files/:id", authenticateAdmin, (req, res) => {
  // Since we're using Google Drive, you might want to update metadata differently
  // For now, we'll keep it simple
  res.status(200).json({
    message: "File metadata update not implemented for Google Drive yet",
  });
});

// Start the server
app.listen(PORT, () => {
  console.log(`Server is running on http://localhost:${PORT}`);
  console.log(`Google Drive Folder ID: ${DRIVE_FOLDER_ID}`);
});
