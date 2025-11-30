"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
// backend/src/models/Admin.ts
const bcryptjs_1 = __importDefault(require("bcryptjs"));
// Example admin (for demonstration purposes)
// const admin: Admin = {
//   username: "admin",
//   password: bcrypt.hashSync("admin123", 10), // Hash the password
// };
// To environment variables:
const admin = {
    username: process.env.ADMIN_USERNAME || "admin",
    password: bcryptjs_1.default.hashSync(process.env.ADMIN_PASSWORD || "admin123", 10),
};
exports.default = admin;
