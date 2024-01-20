// import { Router } from "express";
// import isAdmin from "../../middleware/authorization/isAdmin";
// import isLoggedIn from "../../middleware/authorization/isLoggedIn";
// import * as controllers from "./controllers";
// import * as validations from "./validations";

// const router: Router = Router();
// router
//   .route("/register")
//   .post( validations.create, controllers.register);
// router.route("/login").post(validations.login, controllers.login);

// router.route("/all").get(controllers.getAllRepresentative);
// router.route("/logOut").post(controllers.logout);
// export default router;


import { Router } from "express";
import isAdmin from "../../middleware/authorization/isAdmin";
import isLoggedIn from "../../middleware/authorization/isLoggedIn";
import * as controllers from "./controllers";
import * as validations from "./validations";
import { updateRepresentative } from "./crud";
import { ObjectId } from "mongodb";
const router: Router = Router();
router.route("/register").post(validations.create, controllers.register);
router.route("/login").post(validations.login, controllers.login);
router.route("/all").get(controllers.getAllRepresentative);
router.route("/createGroup").post(controllers.createGroupController);
//update api for representative
router.route("/update/:id").put(controllers.updateRepresentativeHandler);
// delete api for representative
router.route("/delete/:id").delete(controllers.deleteRepresentativeHandler);
// Update a group with a specific ID
router.route("/group/:id").put(controllers.updateGroupHandler);
router.route("/deleteGroup/:id").delete(controllers.deleteGroupHandler);
// this is for update the members delete and update
router.route("/updatemembers/:id").put(controllers.updateGroupMembers);
//  this is for logout
router.route("/logOut").post(controllers.logout);
export default router;