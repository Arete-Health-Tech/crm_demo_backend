import { Router } from "express";
import isLoggedIn from "../../middleware/authorization/isLoggedIn";
import * as validations from "./validations";
import * as controllers from "./controller";
import { consumers } from "stream";

const router = Router();

router.use(isLoggedIn);
router
  .route("/reminder")
  .post(validations.create_reminder, controllers.CreateReminder)
  .get(controllers.GetReminder);
router.route("/allReminder").get(controllers.GetTicketReminders);
router.route("/todo").post(validations.create_todo, controllers.CreateTodo)
  .get(controllers.GetCreatorTodo)
  .put(validations.update_todo_status, controllers.UpdateTodoStatus);
router.route("/todo/:ticketId").get(controllers.GetTicketTodo);




export default router;
