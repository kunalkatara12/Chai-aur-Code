import asyncHandler from "../utils/asyncHandler.utils";

import { Request, Response, NextFunction } from "express";
import { ApiError } from "../utils/ApiError.utils";
import { verify } from "jsonwebtoken";
import { User } from "../models/user.models";
type DecodedToken = {
  _id: string;
  email: string;
  userName: string;
  fullName: string;
};
export const verifyJWT = asyncHandler(
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      const token =
        req.cookies?.accessToken || req.header("Authorization")?.split(" ")[1];
      // .split(" ")[1] is used to remove Bearer from the token. You can also use .replace("Bearer ","")
      if (!token)
        throw new ApiError(
          401,
          "Please login to access this resource in auth.middlewares.ts"
        );
      const decodedToken: DecodedToken = verify(
        token,
        process.env.ACCESS_TOKEN_SECRET as string
      ) as DecodedToken;

      const user = await User.findById(decodedToken?._id).select(
        "-password -refreshToken"
      );
      if (!user) throw new ApiError(404, "No user found with this id");
      req.user = user;
      next();
    } catch (error:any) {
      throw new ApiError(401, "Invalid Access Token in auth.middlewares.ts");
    }
  }
);
