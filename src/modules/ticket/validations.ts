import { body, param } from "express-validator";
import { ObjectId } from "mongodb";

export const create = [
  body("consumer")
    .notEmpty()
    .customSanitizer((value) => {
      return new ObjectId(value);
    }),
  body("departments").notEmpty(),
  body("doctor")
    .notEmpty()
    .customSanitizer((value) => new ObjectId(value))
    .notEmpty(),
  body("condition")
    .optional({ nullable: true })
    .notEmpty()
    .bail()
    .isString()
    .toLowerCase(),
  body("symptoms").optional({ nullable: true }).notEmpty().bail().isString(),
  body("followUp").optional({ nullable: true }).notEmpty().toDate().notEmpty(),
  body("medicines").optional(),
  body("diagnostics").optional().toArray().isArray(),
  body("admission")
    .isString()
    .customSanitizer((value) => (value === "none" ? null : value)),
  body("service")
    .optional()
    .isString()
    .bail()
    .isHexadecimal()
    .bail()
    .customSanitizer((value) => new ObjectId(value)),
  body("caregiver_name").optional({ nullable: true }).isString(),
  body("caregiver_phone")
    .optional({ nullable: true })
    .isLength({ min: 10, max: 10 })
    .isMobilePhone("en-IN")
    .customSanitizer((value) => "91" + value),
];

export const createEstimate = [
  body("icuType")
    .custom((value, { req }) => {
      if (req.body.type === 1 && req.body.icuDays !== 0 && !value) {
        throw new Error("Icu Type required when icu days are added");
      }
      return true;
    })
    .optional()
    .customSanitizer((value) => new ObjectId(value)),
  body("service.*.id")
    .notEmpty()
    .customSanitizer((value) => new ObjectId(value))
    .notEmpty(),
  body("service.*.isSameSite").notEmpty().isBoolean(),
  body("investigation.*")
    .optional()
    .notEmpty()
    .customSanitizer((value) => new ObjectId(value))
    .notEmpty(),
  body("procedure.*")
    .optional()
    .notEmpty()
    .customSanitizer((value) => new ObjectId(value))
    .notEmpty(),
  body("prescription")
    .notEmpty()
    .customSanitizer((value) => new ObjectId(value)),
  body("ticket")
    .notEmpty()
    .customSanitizer((value) => new ObjectId(value)),
  body("type")
    .notEmpty()
    .isNumeric()
    .custom((value, { req }) => {
      if (value !== 0 && value !== 1) {
        throw new Error("Invalid estimate type");
      }
      return true;
    }),
  body("wardDays").custom((value, { req }) => {
    if (req.body.type === 1 && !value) {
      throw new Error("Invalid value at ward days");
    }
    return true;
  }),
  body("icuDays").custom((value, { req }) => {
    if (req.body.type === 1 && value === undefined) {
      throw new Error("Invalid value at icu days");
    }
    return true;
  }),
  body("isEmergency").notEmpty().isBoolean(),
  body("paymentType")
    .notEmpty()
    .isNumeric()
    .custom((value, { req }) => {
      if (value !== 0 && value !== 1 && value !== 2) {
        throw new Error("Invalid payment type");
      }
      return true;
    }),
  body("insuranceCompany").optional().isString(),
  body("insurancePolicyNumber").optional().isString(),
  body("insurancePolicyAmount").optional().isNumeric(),
  body("investigationAmount").optional().notEmpty().isNumeric(),
  body("procedureAmount").optional().notEmpty().isNumeric(),
  body("medicineAmount").optional().notEmpty().isNumeric(),
  body("equipmentAmount").optional().notEmpty().isNumeric(),
  body("bloodAmount").optional().notEmpty().isNumeric(),
  body("additionalAmount").optional().notEmpty().isNumeric(),
];

export const updateTicketSubStage = [
  body("ticket")
    .notEmpty()
    .isString()
    .customSanitizer((value) => new ObjectId(value)),
];

export const get_estimate = [param("ticketId").notEmpty()];

export const create_note = [
  body("text").notEmpty().isString(),
  body("ticket")
    .notEmpty()
    .isString()
    .customSanitizer((value) => new ObjectId(value)),
];

export const get_notes = [param("ticketId").notEmpty()];

export const upload_estimate = [param("ticketId").notEmpty().isHexadecimal()];
