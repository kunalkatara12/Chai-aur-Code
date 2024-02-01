import { Request, Response, NextFunction } from "express";
import {
  ValidationChain,
  body,
  validationResult,
  ContextRunner,
} from "express-validator";

export const validate = (validations: ContextRunner[]) => {
  return async (req: Request, res: Response, next: NextFunction) => {
    for (let validation of validations) {
      const result = await validation.run(req);
      if (result.isEmpty()) {
        break;
      }
    }
    const errors = validationResult(req);
    if (errors.isEmpty()) {
      return next();
    }
    return res.status(422).json({
      message: "Bad request in validator.utils.ts",
      errors: errors,
    });
  };
};
export const loginValidator = [
  body("email")
    .trim()
    .notEmpty()
    .withMessage("Email is required")
    .isEmail()
    .withMessage("Email is invalid"),
  body("userName").trim().notEmpty().withMessage("User Name is required"),
  body("password")
    .trim()
    .notEmpty()
    .withMessage("Password is required")
    .isLength({ min: 6 })
    .withMessage("Password must be at least 6 characters long"),
];
export const registerValidator = [
  body("fullName").trim().notEmpty().withMessage("Full Name is required"),
  ...loginValidator,
];

export const passwordValidator = [
  body("newPassword")
    .trim()
    .notEmpty()
    .withMessage("Password is required")
    .isLength({ min: 6 })
    .withMessage("Password must be at least 6 characters long"),
];
