import { Router } from "express";
import isAdmin from "../../middleware/authorization/isAdmin";
import isLoggedIn from "../../middleware/authorization/isLoggedIn";
import * as controllers from "./controllers";
import * as validations from "./validations";

const router: Router = Router();
router
  .route("/register")
  .post( validations.create, controllers.register);
router.route("/login").post(validations.login, controllers.login);

router.route("/all").get(controllers.getAllRepresentative);

export default router;
