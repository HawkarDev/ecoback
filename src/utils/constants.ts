export const constants = {
  JWT_SECRET: process.env.JWT_SECRET || "your-secret-key",
  DRIVE_FOLDER_ID: process.env.GOOGLE_DRIVE_FOLDER_ID || "your-folder-id",
  CORS_ORIGINS: [
    process.env.FRONTEND_URL ||
      "https://ecofront4-n7tvstqg2-hawkardevs-projects.vercel.app",
  ],
};
