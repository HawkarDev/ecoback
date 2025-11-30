import { Request, Response } from "express";
import { google } from "googleapis";
import fs from "fs";

// Google Drive authentication function
const authenticateGoogleDrive = () => {
  const credentials = process.env.GOOGLE_SERVICE_ACCOUNT;
  if (!credentials)
    throw new Error("Google service account credentials not found");

  const auth = new google.auth.GoogleAuth({
    credentials: JSON.parse(credentials),
    scopes: ["https://www.googleapis.com/auth/drive.file"],
  });

  return google.drive({ version: "v3", auth });
};

const DRIVE_FOLDER_ID = process.env.GOOGLE_DRIVE_FOLDER_ID || "your-folder-id";

export const getFiles = async (req: Request, res: Response) => {
  try {
    const drive = authenticateGoogleDrive();

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

    res.status(200).json(files);
  } catch (error: any) {
    console.error("Error fetching files:", error);
    res
      .status(500)
      .json({ message: "Failed to fetch files from Google Drive" });
  }
};

export const uploadFile = async (req: Request, res: Response) => {
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
        body: fs.createReadStream(req.file.path),
      },
      fields: "id,name,webViewLink,webContentLink,mimeType",
    });

    // Make file publicly accessible
    await drive.permissions.create({
      fileId: response.data.id!,
      requestBody: {
        role: "reader",
        type: "anyone",
      },
    });

    // Clean up temporary file
    try {
      fs.unlinkSync(req.file.path);
    } catch (deleteError) {
      console.log("Could not delete temporary file:", deleteError);
    }

    const downloadUrl = `https://drive.google.com/uc?export=download&id=${response.data.id}`;

    res.status(200).json({
      message: "File uploaded successfully!",
      file: {
        id: response.data.id!,
        url: downloadUrl,
        viewUrl: response.data.webViewLink,
        type: response.data.mimeType || req.file.mimetype,
      },
    });
  } catch (error: any) {
    // Clean up on error
    try {
      fs.unlinkSync(req.file.path);
    } catch (deleteError) {
      console.log("Cleanup error:", deleteError);
    }

    res.status(500).json({
      message: "File upload failed",
      error: error.message,
    });
  }
};

export const deleteFile = async (req: Request, res: Response) => {
  const fileId = req.params.id;

  try {
    const drive = authenticateGoogleDrive();
    await drive.files.delete({ fileId });

    res.status(200).json({ message: "File deleted successfully" });
  } catch (err: any) {
    console.error("Error deleting file:", err);

    if (err.code === 404) {
      res.status(404).json({ message: "File not found" });
    } else {
      res.status(500).json({ message: "Failed to delete file" });
    }
  }
};
