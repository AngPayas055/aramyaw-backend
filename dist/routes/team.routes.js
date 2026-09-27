import { Router } from "express";
import { createTeam, getMyTeams, getSeasonTeams, reviewTeam, } from "../controllers/team.controller.js";
import { authenticateToken } from "../middleware/jwt.js";
import { requireAdmin } from "../middleware/requireAdmin.js";
import { listPlayers, createPlayer, updatePlayer, deletePlayer, } from "../controllers/player.controller.js";
const router = Router({ mergeParams: true });
router.get("/:teamId/players", authenticateToken, listPlayers);
router.post("/:teamId/players", authenticateToken, createPlayer);
router.patch("/:teamId/players/:playerId", authenticateToken, updatePlayer);
router.delete("/:teamId/players/:playerId", authenticateToken, deletePlayer);
router.get("/mine", authenticateToken, getMyTeams);
router
    .route("/")
    .post(authenticateToken, createTeam)
    .get(authenticateToken, requireAdmin, getSeasonTeams);
router.patch("/:teamId/review", authenticateToken, requireAdmin, reviewTeam);
export default router;
