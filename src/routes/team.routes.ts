import { Router } from "express";

import {
  createTeam,
  getMyTeams,
  getSeasonTeams,
  reviewTeam,
} from "../controllers/team.controller.ts";
import { authenticateToken } from "../middleware/jwt.ts";
import { requireAdmin } from "../middleware/requireAdmin.ts";

const router = Router({ mergeParams: true });

router.get("/mine", authenticateToken, getMyTeams);

router
  .route("/")
  .post(authenticateToken, createTeam)
  .get(authenticateToken, requireAdmin, getSeasonTeams);

router.patch(
  "/:teamId/review",
  authenticateToken,
  requireAdmin,
  reviewTeam,
);

export default router;