import { Router } from "express";

import { getAdminDashboard } from "../controllers/admin.controller.ts";
import { authenticateToken } from "../middleware/jwt.ts";
import { requireAdmin } from "../middleware/requireAdmin.ts";

const router = Router();

router.get(
  "/dashboard",
  authenticateToken,
  requireAdmin,
  getAdminDashboard,
);

export default router;