import { Router } from "express";
import {
  changeCurrentPassword,
  getCurrentUser,
  getUserChannelProfile,
  getWatchHistory,
  loginUser,
  logoutUser,
  refreshAccessToken,
  registerUser,
  updateAccountDetails,
  updateAvatar,
  updateCoverImage,
} from "../controllers/user.controllers";
import { upload } from "../middlewares/multer.middlewares";
import { loginValidator, registerValidator, validate } from "../utils/validators.utils";
import { verifyJWT } from "../middlewares/auth.middlewares";

const userRouter = Router();

// get Routes
userRouter.get("/channel/:userName", verifyJWT, getUserChannelProfile);
userRouter.get("/history", verifyJWT, getWatchHistory);
userRouter.get("/current-user", verifyJWT, getCurrentUser);

// post Routes
userRouter.post(
  "/register",
  upload.fields([
    { name: "avatar", maxCount: 1 },
    { name: "coverImage", maxCount: 1 },
  ]),
  validate(registerValidator),
  registerUser
);
userRouter.post("/login", validate(loginValidator), loginUser);
userRouter.post("/logout", verifyJWT, logoutUser);
userRouter.post("/refresh-token", refreshAccessToken);
userRouter.post("/change-password", verifyJWT, changeCurrentPassword);

// patch Routes
userRouter.patch("/update-account", verifyJWT, updateAccountDetails);
userRouter.patch("/update-avatar", verifyJWT, upload.single("avatar"), updateAvatar);
userRouter.patch("/update-coverImage", verifyJWT, upload.single("coverImage"), updateCoverImage);
export default userRouter;
