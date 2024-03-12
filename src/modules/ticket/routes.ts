import { Router } from "express";
import multer from "multer";
import { isRepresentative } from "../../middleware/authorization/isAdmin";
import isLoggedIn from "../../middleware/authorization/isLoggedIn";
import { CONSUMER } from "../../types/consumer/consumer";
import MongoService from "../../utils/mongo";
import * as controllers from "./controllers";
import * as validations from "./validations";
import { updateSubStage } from "./functions";
const upload = multer();
const router: Router = Router();
router.use(isLoggedIn);
router
  .route("/")
  .post(upload.single("image"), validations.create, controllers.createTicket)
  // .get(isLoggedIn ,controllers.createTicket )
   .get(isRepresentative, controllers.getRepresentativeTickets);
router.route("/:consumerId").get(controllers.ticketsWithPrescription);
router.route("/ticketUpdate").put(controllers.updateTicketData);
router.route("/subStageUpdate").put(controllers.updateTicketSubStageCode);
router
  .route("/estimate")
  .post( controllers.createEstimateController);
router
  .route("/estimate/:ticketId")
  .get(validations.get_estimate, controllers.GetTicketEstimates);
router
  .route("/:ticketId/estimate/upload")
  .post(
    upload.single("estimate"),
    validations.upload_estimate,
    controllers.EstimateUploadAndSend
  );
router.route("/note").post(validations.create_note, controllers.CreateNote);
router
  .route("/note/:ticketId")
  .get(validations.get_notes, controllers.GetTicketNotes);
router
  .route("/patientStatus")
  .post(
    upload.single("image"),
    validations.patientStatusValidate,
    controllers.createPatientStatus
  );
router.route("/validateTicket").put(controllers.validateTicket);
// router.route("/skip").post( controllers.skipResult);
router.route("/skipEstimate").post(controllers.skipEstimate);

router.route("/ticketResult").post(controllers.skipResult);
router.route("/updateConsumer/:id").put(controllers.updateTicketHandler);
// router.route("/search/:key").get(async (req, resp) => {
//   const query = { firstName: { $regex: /name-to-search/i } };
//   const consumers = await MongoService.collection("consumer")
//     .find<CONSUMER>(query)
//     .toArray();
//   return consumers;
// });
// router.route("/ticketResult").post(controllers.skipResult);
export default router;
