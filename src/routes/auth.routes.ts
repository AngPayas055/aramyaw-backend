import { Router } from "express";
import { listMyPlayerTeams } from "../controllers/teamJoinRequest.controller.ts";
import {
  forgotPassword,
  login,
  register,
  resetPassword,
} from "../controllers/auth.controller.ts";
import { playerProfile } from "../controllers/playerProfile.controller.ts";
import { authenticateToken } from "../middleware/jwt.ts";
import {
  getMyPlayerPayment,
  submitPlayerPayment,
} from "../controllers/playerPayment.controller.ts";

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