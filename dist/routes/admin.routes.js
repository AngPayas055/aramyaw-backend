import { Router } from "express";
import { getAdminDashboard } from "../controllers/admin.controller.js";
import { authenticateToken } from "../middleware/jwt.js";
import { requireAdmin } from "../middleware/requireAdmin.js";
const router = Router();
router.get("/dashboard", authenticateToken, requireAdmin, getAdminDashboard);
export default router;
