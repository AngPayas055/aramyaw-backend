import { Router } from "express";

import { getAdminDashboard } from "../controllers/admin.controller.ts";
import { authenticateToken } from "../middleware/jwt.ts";
import { requireAdmin } from "../middleware/requireAdmin.ts";
import { getAdminPayments } from "../controllers/admin-payment.controller.ts";

const router = Router();

router.get(
  "/dashboard",
  authenticateToken,
  requireAdmin,
  getAdminDashboard,
);

router.get(
  "/payments",
  authenticateToken,
  requireAdmin,
  getAdminPayments,
);

export default router;