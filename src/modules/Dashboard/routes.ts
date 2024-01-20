import { Router } from "express";
import isAdmin from "../../middleware/authorization/isAdmin";
import isLoggedIn from "../../middleware/authorization/isLoggedIn";
import * as controllers from "./controller";
const router: Router = Router();
router.use(isLoggedIn);
router.route("/ticketStatus/:id").post(controllers.updateTicketStatus);
router.route("/dnd").get(controllers.getTicketsBydnd);
router.route("/pending").get(controllers.getTicketsByPending);
router.route("/todaytask").get(controllers.getTicketsBytodayTask);
router.route("/callCompleted").get(controllers.getTicketsByCallCompleted);
router.route("/RescheduleCall").get(controllers.getTicketsByRescheduleCall);
router.route("/resultData").get(controllers.pieWONLoss);
router.route("/stageCount").get(controllers.getTicketsCountByAssignedStage);


export default router;
