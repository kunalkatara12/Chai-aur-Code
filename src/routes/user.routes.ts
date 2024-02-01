import { Router } from "express";
import {
  loginUser,
  logoutUser,
  refreshAccessToken,
  registerUser,
} from "../controllers/user.controllers";
import { upload } from "../middlewares/multer.middlewares";
import { loginValidator, registerValidator, validate } from "../utils/validators.utils";
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

userRouter.post("/login",validate(loginValidator), loginUser);
userRouter.post("/logout", verifyJWT, logoutUser);
userRouter.post("/refresh-token", refreshAccessToken);
export default userRouter;
