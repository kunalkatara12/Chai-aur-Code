import { Router } from "express";
import {
  loginUser,
  logoutUser,
  registerUser,
} from "../controllers/user.controllers";
import { upload } from "../middlewares/multer.middlewares";
import { registerValidator, validate } from "../utils/validators.utils";
import { verifyJWT } from "../middlewares/auth.middlewares";

const userRouter = Router();

userRouter.post(
  "/register",
  upload.fields([
    { name: "avatar", maxCount: 1 },
    { name: "coverImage", maxCount: 1 },
  ]),
  validate(registerValidator),
  registerUser
);

userRouter.post("/login", loginUser);
userRouter.post("/logout", verifyJWT, logoutUser);
export default userRouter;
