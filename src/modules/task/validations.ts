import { body } from "express-validator";
import { ObjectId } from "mongodb";

export const create_reminder = [
  body("date").notEmpty().isInt().toInt(),
  body("title").notEmpty().isString(),
  body("description").notEmpty().isString(),
  body("ticket")
    .notEmpty()
    .isString()
    .customSanitizer((value) => new ObjectId(value))
    .notEmpty(),
];

export const create_todo = [
  body("date").notEmpty().isInt().toInt(),
  body("title").notEmpty().isString(),
  body("description").notEmpty().isString(),
  body("ticket")
    .notEmpty()
    .isString()
    .customSanitizer((value) => new ObjectId(value))
    .notEmpty(),
];

export const update_todo_status = [
  body("todoId")
    .notEmpty()
    .isString()
    .customSanitizer((value) => new ObjectId(value)),
  body("status").notEmpty().isBoolean(),
];


export const create_reschedular = [
  body("date").notEmpty().isInt().toInt(),
  // body("title").notEmpty().isString(),
  body("description").notEmpty().isString(),
  body("ticket")
    .notEmpty()
    .isString()
    .customSanitizer((value) => new ObjectId(value))
    .notEmpty(),
];