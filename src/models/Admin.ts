// backend/src/models/Admin.ts
import bcrypt from "bcryptjs";

interface Admin {
  username: string;
  password: string;
}

// Example admin (for demonstration purposes)
const admin: Admin = {
  username: "admin",
  password: bcrypt.hashSync("admin123", 10), // Hash the password
};

export default admin;
