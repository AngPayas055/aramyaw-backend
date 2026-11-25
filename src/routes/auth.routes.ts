import { Router } from "express";

import {
  forgotPassword,
  login,
  register,
  resetPassword,
} from "../controllers/auth.controller.ts";
import { playerProfile } from "../controllers/playerProfile.controller.ts";
import { authenticateToken } from "../middleware/jwt.ts";

const router = Router();

router.post("/register", register);
router.post("/login", login);
router.post("/forgot-password", forgotPassword);
router.post("/reset-password", resetPassword);

router.get("/player-profile", authenticateToken, playerProfile);
router.patch("/player-profile", authenticateToken, playerProfile);

export default router;