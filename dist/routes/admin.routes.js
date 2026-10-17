import { Router } from "express";
import { getAdminDashboard } from "../controllers/admin.controller.js";
import { authenticateToken } from "../middleware/jwt.js";
import { requireAdmin } from "../middleware/requireAdmin.js";
import { getAdminPayments } from "../controllers/admin-payment.controller.js";
const router = Router();
router.get("/dashboard", authenticateToken, requireAdmin, getAdminDashboard);
router.get("/payments", authenticateToken, requireAdmin, getAdminPayments);
export default router;
