import { Router } from "express";

import { getAdminDashboard } from "../controllers/admin.controller.ts";
import { authenticateToken } from "../middleware/jwt.ts";
import { requireAdmin } from "../middleware/requireAdmin.ts";
import { getAdminPayments } from "../controllers/admin-payment.controller.ts";
import {
  listPendingPlayerPayments,
  reviewPlayerPayment,
} from "../controllers/adminPlayerPayment.controller.ts";

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

router.get(
  "/player-payments",
  authenticateToken,
  requireAdmin,
  listPendingPlayerPayments,
);

router.patch(
  "/player-payments/:paymentId/review",
  authenticateToken,
  requireAdmin,
  reviewPlayerPayment,
);

export default router;