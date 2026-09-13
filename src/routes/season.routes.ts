import { Router } from "express";
import {
  createSeason,
  getSeasons,
  getSeasonById,
  updateSeason,
} from "../controllers/season.controller.ts";

import { authenticateToken } from "../middleware/jwt.ts";
import { requireAdmin } from "../middleware/requireAdmin.ts";
import divisionRoutes from "./division.routes.ts";

const router = Router();

router.use(authenticateToken, requireAdmin);

router.route("/")
  .get(getSeasons)
  .post(createSeason);

router.use("/:seasonId/divisions", divisionRoutes);

router.route("/:seasonId")
  .get(getSeasonById)
  .patch(updateSeason);

export default router;