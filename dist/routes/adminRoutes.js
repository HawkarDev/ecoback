"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = require("express");
const adminController_1 = require("../controllers/adminController");
const authMiddleware_1 = require("../middleware/authMiddleware");
const router = (0, express_1.Router)();
router.post("/login", adminController_1.loginAdmin);
router.get("/profile", authMiddleware_1.authenticateAdmin, adminController_1.getAdminProfile);
exports.default = router;
