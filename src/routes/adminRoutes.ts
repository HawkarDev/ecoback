import { Router } from "express";
import { loginAdmin, getAdminProfile } from "../controllers/adminController";
import { authenticateAdmin } from "../middleware/authMiddleware";

const router = Router();

router.post("/login", loginAdmin);
router.get("/profile", authenticateAdmin, getAdminProfile);

export default router;
