// backend/src/models/Admin.ts
import bcrypt from "bcryptjs";

interface Admin {
  username: string;
  password: string;
}

// Example admin (for demonstration purposes)
// const admin: Admin = {
//   username: "admin",
//   password: bcrypt.hashSync("admin123", 10), // Hash the password
// };

// To environment variables:
const admin: Admin = {
  username: process.env.ADMIN_USERNAME || "admin",
  password: bcrypt.hashSync(process.env.ADMIN_PASSWORD || "admin123", 10),
};
export default admin;
