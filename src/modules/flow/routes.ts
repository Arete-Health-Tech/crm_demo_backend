import { Router } from "express";
import * as validations from "./validations";
import * as controllers from "./controller";
import isLoggedIn from "../../middleware/authorization/isLoggedIn";
import isAdmin from "../../middleware/authorization/isAdmin";
import { followUpMessage } from "../../services/whatsapp/whatsapp";

const router = Router();
router.route("/search").get(validations.searchFlowNode, controllers.FindNode);
router
  .route("/reply")
  .post(
    isLoggedIn,
    validations.createReply,
    controllers.createReplyNodeController
  );
router
  .route("/list")
  .post(
    isLoggedIn,
    validations.createList,
    controllers.createListNodeController
  );
router
  .route("/connect")
  .post(isLoggedIn, isAdmin, validations.connect_flow, controllers.ConnectFlow)
  .get(validations.get_flow_connector, controllers.GetConnector);
  router.route("/webhook").get(controllers.verifyWhatsap);
router.route("/webhook").post(controllers.HandleWebhook);
router
  .route("/message")
  .post(validations.send_message, controllers.SendMessage);
// router
// router
//   .route("/message")
//   .post(isLoggedIn, validations.send_message, controllers.SendFollowUpMessage);

export default router;
