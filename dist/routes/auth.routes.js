import { Router } from "express";
import { listMyPlayerTeams } from "../controllers/teamJoinRequest.controller.js";
import { forgotPassword, login, register, resetPassword, } from "../controllers/auth.controller.js";
import { playerProfile } from "../controllers/playerProfile.controller.js";
import { authenticateToken } from "../middleware/jwt.js";
import { getMyPlayerPayment, submitPlayerPayment, } from "../controllers/playerPayment.controller.js";
const router = Router();
router.post("/register", register);
router.post("/login", login);
router.post("/forgot-password", forgotPassword);
router.post("/reset-password", resetPassword);
router.get("/player-profile", authenticateToken, playerProfile);
router.patch("/player-profile", authenticateToken, playerProfile);
router.get("/player-teams", authenticateToken, listMyPlayerTeams);
router
    .route("/player-teams/:teamId/payments")
    .get(authenticateToken, getMyPlayerPayment)
    .post(authenticateToken, submitPlayerPayment);
export default router;
