import { Router } from "express";

import { authenticateToken } from "../middleware/jwt.ts";
import { requireAdmin } from "../middleware/requireAdmin.ts";

import {
  getTeamPayments,
  submitTeamPayment,
  reviewPayment,
} from "../controllers/payment.controller.ts";

const router = Router({ mergeParams: true });

router.use(authenticateToken);

router
  .route("/")
  .get(getTeamPayments)
  .post(submitTeamPayment);

router.patch(
  "/:paymentId/review",
  requireAdmin,
  reviewPayment,
);

export default router;