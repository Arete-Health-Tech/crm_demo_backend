import { Router } from "express";
import isAdmin from "../../middleware/authorization/isAdmin";
import isLoggedIn from "../../middleware/authorization/isLoggedIn";
import * as controllers from "./controllers";
import * as validations from "./validations";

const router: Router = Router();

router
  .route("/")
  .post(validations.create, controllers.addDepartment)
  .get(controllers.getDepartments);

router
  .route("/doctor")
  .post(validations.createDoctor, controllers.createDoctor)
  .get(controllers.getDoctors);

router
  .route("/tag")
  .post(validations.createDepartmentTag, controllers.createDepartmentTag)
  .get(controllers.getDepartmentTags);

router
  .route("/ward")
  .post(validations.createWard, controllers.createWardController)
  .get(controllers.getAllWardsController);

export default router;
