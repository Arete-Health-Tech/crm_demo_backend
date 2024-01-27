import { Router } from "express";
import isLoggedIn from "../../middleware/authorization/isLoggedIn";
import * as controllers from "./controllers";
import * as validations from "./validations";

const router: Router = Router(); 
router
  .route("/register") 
  .post(isLoggedIn, validations.create, controllers.register);  
router.route("/search").get(isLoggedIn, controllers.search); 
router.route("/findConsumer").get(controllers.findConsumerByUhid);  

export default router;
