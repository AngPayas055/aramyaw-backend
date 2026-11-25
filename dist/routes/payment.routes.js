import { Router } from "express";
import { authenticateToken } from "../middleware/jwt.js";
import { requireAdmin } from "../middleware/requireAdmin.js";
import { getTeamPayments, reviewPayment, } from "../controllers/payment.controller.js";
const router = Router({ mergeParams: true });
router.use(authenticateToken);
router.get("/", getTeamPayments);
router.post("/", (_req, res) => {
    res.status(410).json({
        message: "Team registration is free. Players pay their own registration fee.",
    });
});
router.patch("/:paymentId/review", requireAdmin, reviewPayment);
export default router;
