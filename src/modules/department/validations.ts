import { body } from "express-validator";
import { ObjectId } from "mongodb";

export const create = [
  body("name").notEmpty().toLowerCase(),
  body("parent")
    .optional()
    .isString()
    .notEmpty()
    .customSanitizer((value) => new ObjectId(value)),
  body("tags.*")
    .customSanitizer((value) => new ObjectId(value))
    .notEmpty(),
];

export const createDoctor = [
  body("name").notEmpty().toLowerCase(),
  body("department.*").notEmpty().isString(),
];
export const createDepartmentTag = [body("name").notEmpty().toLowerCase()];

export const createWard = [
  body("name").notEmpty().isString(),
  body("type")
    .notEmpty()
    .isNumeric()
    .custom((value, _) => {
      if (value !== 0 && value !== 1) {
        throw new Error("Invalid Ward Type");
      }
      return true;
    }),
  body("code").notEmpty().isString(),
  body("roomRent").notEmpty().isNumeric(),
  body("consultation").notEmpty().isNumeric(),
  body("emergencyConsultation").notEmpty().isNumeric(),
];
