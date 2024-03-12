import { Router } from "express";
import representative from "./representative/routes";
import consumer from "./consumer/routes";
import service from "./service/routes";
import department from "./department/routes";
import stage from "./stages/routes";
import ticket from "./ticket/routes";
import flow from "./flow/routes";
import script from "./script/routes";
import task from "./task/routes";
import dashboard from "./Dashboard/routes";
// import { searchedTicketData } from "./ticket/controllers";
const router = Router();
// router.use((req, res, next) => {
//     res.header('Cache-Control', 'no-cache, no-store, must-revalidate');
//     next();
//   });

router.use("/representative", representative);
router.use("/consumer", consumer);
router.use("/service", service);
router.use("/department", department);
router.use("/stage", stage);
router.use("/ticket", ticket);
router.use("/flow", flow);
router.use("/script", script);
router.use("/task", task);
router.use("/dashboard", dashboard);
// router.use("/search",searchedTicketData)
// router.use("/uhid",uhidDetails)

export default router;
