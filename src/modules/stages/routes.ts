import { Router } from "express";
import isAdmin from "../../middleware/authorization/isAdmin";
import isLoggedIn from "../../middleware/authorization/isLoggedIn";
import * as controllers from "./controllers";
import * as validations from "./validations";

const router: Router = Router();
router.use(isLoggedIn);
router
  .route("/")
  .post(validations.create, isAdmin, controllers.createStage)
  .get(controllers.getAllStages);
router.route("/search").get(controllers.search);
router.route('/subStage').get(controllers.getAllSubStages)

export default router;
