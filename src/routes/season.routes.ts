import { Router } from "express";
import teamRoutes from "./team.routes.ts";
import paymentRoutes from "./payment.routes.ts";
import {
  createSeason,
  getSeasons,
  getSeasonById,
  updateSeason,
} from "../controllers/season.controller.ts";

import { authenticateToken } from "../middleware/jwt.ts";
import { requireAdmin } from "../middleware/requireAdmin.ts";
import divisionRoutes from "./division.routes.ts";
import { listSeasonPlayersForAdmin } from "../controllers/player.controller.ts";
const router = Router();

const adminOnly = [authenticateToken, requireAdmin];

router.get("/:seasonId/players", ...adminOnly, listSeasonPlayersForAdmin);
// Public GET, protected POST
router
  .route("/")
  .get(getSeasons)
  .post(...adminOnly, createSeason);

// Division routes
router.use("/:seasonId/divisions", divisionRoutes);
router.use(
  "/:seasonId/teams/:teamId/payments",
  paymentRoutes,
);
router.use("/:seasonId/teams", teamRoutes);
router.use("/:seasonId/teams", teamRoutes);
// Public GET, protected PATCH
router
  .route("/:seasonId")
  .get(getSeasonById)
  .patch(...adminOnly, updateSeason);

export default router;