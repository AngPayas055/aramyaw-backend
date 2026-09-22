import { Router } from "express";
import { createSeason, getSeasons, getSeasonById, updateSeason, } from "../controllers/season.controller.js";
import { authenticateToken } from "../middleware/jwt.js";
import { requireAdmin } from "../middleware/requireAdmin.js";
import divisionRoutes from "./division.routes.js";
const router = Router();
const adminOnly = [authenticateToken, requireAdmin];
// Public GET, protected POST
router
    .route("/")
    .get(getSeasons)
    .post(...adminOnly, createSeason);
// Division routes
router.use("/:seasonId/divisions", divisionRoutes);
// Public GET, protected PATCH
router
    .route("/:seasonId")
    .get(getSeasonById)
    .patch(...adminOnly, updateSeason);
export default router;
