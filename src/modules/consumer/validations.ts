import { body } from "express-validator";

export const create = [
  body("firstName").notEmpty().toLowerCase(),
  body("lastName").optional({ nullable: true }).notEmpty().toLowerCase(),
  body("email").optional({ nullable: true }).isEmail().toLowerCase(),
  body("dob").optional({ nullable: true }).toDate().notEmpty(),
  body("phone")
    .isLength({ max: 20, min: 1 })
    .isMobilePhone("en-IN")
    .customSanitizer((value) => value),
  body("uid").notEmpty(),
  body("gender")
    .optional({ nullable: true })
    .notEmpty()
    .custom((value, { req }) => {
      if (value !== "M" && value !== "F" && value !== "O") {
        throw Error("Invalid Value");
      }
      return value;
    }),
];
