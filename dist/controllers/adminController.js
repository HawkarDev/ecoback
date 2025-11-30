"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.getAdminProfile = exports.loginAdmin = void 0;
const bcryptjs_1 = __importDefault(require("bcryptjs"));
const jsonwebtoken_1 = __importDefault(require("jsonwebtoken"));
const JWT_SECRET = process.env.JWT_SECRET || "your-secret-key";
// Mock admin (replace with your actual admin model)
const admin = {
    username: process.env.ADMIN_USERNAME || "admin",
    password: bcryptjs_1.default.hashSync(process.env.ADMIN_PASSWORD || "admin123", 10),
};
const loginAdmin = (req, res) => {
    const { username, password } = req.body;
    try {
        if (username === admin.username &&
            bcryptjs_1.default.compareSync(password, admin.password)) {
            const token = jsonwebtoken_1.default.sign({ username: admin.username }, JWT_SECRET, {
                expiresIn: "1h",
            });
            res.status(200).json({ message: "Login successful", token });
        }
        else {
            res.status(401).json({ message: "Invalid credentials" });
        }
    }
    catch (error) {
        console.error("Error during login:", error);
        res.status(500).json({ message: "An error occurred during login" });
    }
};
exports.loginAdmin = loginAdmin;
const getAdminProfile = (req, res) => {
    res.json({
        message: "Admin profile",
        user: req.user,
    });
};
exports.getAdminProfile = getAdminProfile;
