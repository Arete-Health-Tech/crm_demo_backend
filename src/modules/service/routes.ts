import { Router } from "express";
import isAdmin from "../../middleware/authorization/isAdmin";
import isLoggedIn from "../../middleware/authorization/isLoggedIn";
import * as controllers from "./controllers";
import * as validations from "./validations";

const router: Router = Router();
router.use(isLoggedIn);
router
  .route("/")
  .post( controllers.createService)
  .get(validations.get_services, controllers.GetServices);
router.route("/search").get(controllers.search);

export default router;
