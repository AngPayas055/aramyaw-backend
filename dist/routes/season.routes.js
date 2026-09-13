import { Router } from "express";
import { createSeason, getSeasons, getSeasonById, updateSeason, } from "../controllers/season.controller.js";
import { authenticateToken } from "../middleware/jwt.js";
import { requireAdmin } from "../middleware/requireAdmin.js";
import divisionRoutes from "./division.routes.js";
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
