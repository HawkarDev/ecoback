"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.authenticateAdmin = void 0;
const jsonwebtoken_1 = __importDefault(require("jsonwebtoken"));
const authenticateAdmin = (req, res, next) => {
    var _a;
    const token = (_a = req.headers.authorization) === null || _a === void 0 ? void 0 : _a.split(" ")[1]; // Get the token from the header
    if (!token) {
        return res.status(401).json({ message: "Access denied. No token provided." });
    }
    try {
        // Verify the token
        const decoded = jsonwebtoken_1.default.verify(token, "your-secret-key");
        req.user = decoded; // Attach the decoded user to the request object
        next();
    }
    catch (error) {
        res.status(400).json({ message: "Invalid token" });
    }
};
exports.authenticateAdmin = authenticateAdmin;
