import { Request, Response } from "express";
import bcrypt from "bcryptjs";
import jwt from "jsonwebtoken";

const JWT_SECRET = process.env.JWT_SECRET || "your-secret-key";

// Mock admin (replace with your actual admin model)
const admin = {
  username: process.env.ADMIN_USERNAME || "admin",
  password: bcrypt.hashSync(process.env.ADMIN_PASSWORD || "admin123", 10),
};

export const loginAdmin = (req: Request, res: Response) => {
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
};

export const getAdminProfile = (req: Request, res: Response) => {
  res.json({
    message: "Admin profile",
    user: (req as any).user,
  });
};
