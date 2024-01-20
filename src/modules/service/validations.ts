import { body, param, query } from "express-validator";
import { ObjectId } from "mongodb";

export const create = [
  body("*.name").notEmpty().toLowerCase(),
  body("*.serviceId").notEmpty(),
  body("*.department")
    .notEmpty()
    .isString()
    .customSanitizer((value) => new ObjectId(value)),
  body("*.departmentType")
    .notEmpty()
    .isString()
    .customSanitizer((value) => new ObjectId(value)),
  body("*.tag")
    .notEmpty()
    .isHexadecimal()
    .customSanitizer((value) => new ObjectId(value)),
  body("*.opd_one").notEmpty().bail().toInt().isNumeric(),
  // body("*.opd_two").notEmpty().toInt().isNumeric(),
  body("*.ipd_one").notEmpty().toInt().isNumeric(),
  // body("*.ipd_two").notEmpty().toInt().isNumeric(),
  body("*.four_one").notEmpty().toInt().isNumeric(),
  // body("*.four_two").notEmpty().toInt().isNumeric(),
  body("*.twin_one").notEmpty().toInt().isNumeric(),
  // body("*.twin_two").notEmpty().toInt().isNumeric(),
  body("*.single_one").notEmpty().toInt().isNumeric(),
  // body("*.single_two").notEmpty().toInt().isNumeric(),
  body("*.deluxe_one").notEmpty().toInt().isNumeric(),
  // body("*.deluxe_two").notEmpty().toInt().isNumeric(),
  body("*.vip_one").notEmpty().toInt().isNumeric(),
  // body("*.vip_two").notEmpty().toInt().isNumeric(),
];

export const get_services = [
  query("pageLength").notEmpty().bail().isInt().bail().toInt(),
  query("page").notEmpty().bail().isInt().bail().toInt(),
];
