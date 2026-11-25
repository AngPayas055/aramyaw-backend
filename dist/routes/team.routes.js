import { Router } from "express";
import { createTeamJoinRequest, listPendingTeamJoinRequests, reviewTeamJoinRequest, } from "../controllers/teamJoinRequest.controller.js";
import { createTeam, getMyTeams, getSeasonTeams, reviewTeam, } from "../controllers/team.controller.js";
import { authenticateToken } from "../middleware/jwt.js";
import { requireAdmin } from "../middleware/requireAdmin.js";
import { listPlayers, createPlayer, updatePlayer, deletePlayer, listTeamPlayersForAdmin, updatePlayerStatus } from "../controllers/player.controller.js";
const router = Router({ mergeParams: true });
router.get("/:teamId/roster", authenticateToken, requireAdmin, listTeamPlayersForAdmin);
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
router.patch("/:teamId/players/:playerId/status", authenticateToken, requireAdmin, updatePlayerStatus);
router.get("/:teamId/join-requests", authenticateToken, listPendingTeamJoinRequests);
router.post("/:teamId/join-requests", authenticateToken, createTeamJoinRequest);
router.patch("/:teamId/join-requests/:requestId", authenticateToken, reviewTeamJoinRequest);
export default router;
