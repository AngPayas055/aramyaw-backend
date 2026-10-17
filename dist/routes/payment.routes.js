import { Router } from "express";
import { authenticateToken } from "../middleware/jwt.js";
import { requireAdmin } from "../middleware/requireAdmin.js";
import { getTeamPayments, submitTeamPayment, reviewPayment, } from "../controllers/payment.controller.js";
const router = Router({ mergeParams: true });
router.use(authenticateToken);
router
    .route("/")
    .get(getTeamPayments)
    .post(submitTeamPayment);
router.patch("/:paymentId/review", requireAdmin, reviewPayment);
export default router;
