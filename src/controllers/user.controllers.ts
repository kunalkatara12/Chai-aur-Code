import { Request, Response, NextFunction } from "express";
import { User } from "../models/user.models";
import asyncHandler from "../utils/asyncHandler.utils";
import { ApiError } from "../utils/ApiError.utils";
import { uploadOnCloudinary } from "../utils/cloudinary.utils";
import { ApiResponse } from "../utils/ApiResponse.utils";
import { verify } from "jsonwebtoken";

const catchError = (error: any) => {
  console.log(error);
  throw new ApiError(
    500,
    "Something went wrong on generating access and refresh token in user.controllers.ts"
  );
};

const generateAccessAndRefreshToken = async (userId: string) => {
  try {
    const user = await User.findById(userId);
    if (!user) {
      throw new ApiError(401, "User not found on line 22");
    }

    const accessToken: string = user.generateAccessToken() as string;
    const refreshToken: string = user.generateRefreshToken() as string;

    user.refreshToken = refreshToken;
    await user.save({
      validateBeforeSave: false,
    });

    return { accessToken, refreshToken };
  } catch (error) {
    catchError(error);
  }
};
      const options = {
        httpOnly: true,
        secure: true,
      };

export const registerUser = asyncHandler(
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      const { userName, email, fullName, password, confirmPassword } = req.body;
      //existing user
      const exUser = await User.findOne({
        $or: [{ userName }, { email }],
      });
      if (exUser)
        throw new ApiError(
          409,
          "User already exists with same username or email in user.controllers.ts"
        );

      //password is required
      if (password === "" || password === null || password === undefined)
        throw new ApiError(400, "Password is required in user.controllers.ts");
      // password and confirm password should match
      if (password !== confirmPassword) {
        throw new ApiError(
          400,
          "Password and confirm password should match in user.controllers.ts"
        );
      }

      console.log(req.files);
      const avatarLocalPath = req.files?.avatar[0]?.path;
      let coverImageLocalPath = req.files.coverImage[0].path;

      if (!avatarLocalPath)
        throw new ApiError(
          400,
          "Avatar Path is required in user.controllers.ts"
        );

      const avatar = await uploadOnCloudinary(avatarLocalPath);
      const coverImage = await uploadOnCloudinary(coverImageLocalPath);

      if (!avatar)
        throw new ApiError(400, "Avatar is required in user.controllers.ts ");
      /* 
      const user = await new User({
        userName,
        fullName,
        avatar: avatar.url,
        coverImage: coverImage?.url || "",
        email,
        password: hashedPassword,
      }).save();
      */
      //saving user
      const user = await User.create({
        userName,
        fullName,
        avatar: avatar.url,
        coverImage: coverImage?.url || "",
        email,
        password,
      });

      const createdUser = await User.findById(user._id).select(
        "-password -refreshToken"
      ); //select("-password -refreshToken") is used to hide password and refreshToken from response

      if (!createdUser)
        throw new ApiError(500, "User not created in user.controllers.ts");

      return res
        .status(201)
        .json(
          new ApiResponse(
            200,
            createdUser,
            "User created successfully in user.controllers.ts"
          )
        );
    } catch (error: any) {
      catchError(error);
    }
  }
);

export const loginUser = asyncHandler(
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      const { email, userName, password } = req.body;

      if (!(email || userName)) {
        throw new ApiError(
          400,
          "Email or username is required in user.controllers.ts"
        );
      }
      // check if user exists
      const user = await User.findOne({ $or: [{ email }, { userName }] });
      if (!user) {
        throw new ApiError(400, "User not found in user.controllers.ts");
      }

      // check if password is correct
      const isPasswordValid: boolean = await user.isPasswordCorrect(password);
      // console.log(
      //   typeof isPasswordValid,
      //   typeof password,
      //   typeof user.password
      // );

      // console.log(isPasswordValid, password, user.password );

      if (!isPasswordValid) {
        throw new ApiError(
          401,
          "Password is incorrect 🥲  in user.controllers.ts"
        );
      }

      // create token
      // save refresh token in db
      const { accessToken, refreshToken } = await generateAccessAndRefreshToken(
        user._id
      );
      // send token in cookie
      const loggedInUser = await User.findById(user._id).select(
        "-password -refreshToken"
      );

      // send response
      return res
        .status(200)
        .cookie("accessToken", accessToken, options)
        .cookie("refreshToken", refreshToken, options)
        .json(
          new ApiResponse(
            200,
            {
              user: loggedInUser,
              accessToken,
              refreshToken,
            },
            "User logged in successfully in user.controllers.ts"
          )
        );
    } catch (error: any) {
      catchError(error);
    }
  }
);

export const logoutUser = asyncHandler(
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      const { _id } = req.user._id;
      await User.findByIdAndUpdate(
        _id,
        {
          $set: {
            refreshToken: "",
          },
        },
        { new: true }
      );

      return res
        .status(200)
        .clearCookie("accessToken", options)
        .clearCookie("refreshToken", options)
        .json(
          new ApiResponse(
            200,
            {},
            "User logged out successfully in user.controllers.ts"
          )
        );
    } catch (error: any) {
      catchError(error);
    }
    // clear cookies
  }
);

export const refreshAccessToken = asyncHandler(
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      // getting refresh topen from cookie
      const inRefreshToken = req.cookies.refreshToken || req.body.refreshToken;
      if (!inRefreshToken) {
        throw new ApiError(
          401,
          "Unauthorized Request: Refresh token not found in user.controllers.ts"
        );
      }
      // check if refresh token is valid with jwt.verify   
      const decodedToken = await verify(
        inRefreshToken,
        process.env.REFRESH_TOKEN_SECRET as string
      );
      // console.log(decoded);
      let user;
      if (typeof decodedToken === 'string') {
        throw new ApiError(
          401,
          "Invalid token in user.controllers.ts"
        );
      } else {
        user = await User.findById(decodedToken._id);
      }
      if (!user) {
        throw new ApiError(
          401,
          "User not found in user.controllers.ts"
        );
      }
      if (inRefreshToken !== user.refreshToken) {
        throw new ApiError(
          401,
          "Refresh Token exired or used in user.controllers.ts"
        );
      }
      const { accessToken, newRefreshToken } = await generateAccessAndRefreshToken(
        user._id  
      );

      // send response
      return res
        .status(200)
        .cookie("accessToken", accessToken, options)
        .cookie("refreshToken", newRefreshToken, options)
        .json(
          new ApiResponse(
            200,
            {
              accessToken,
              refreshToken:newRefreshToken,
            },
            "Access token refreshed successfully in user.controllers.ts"
          )
        );
    } catch (error: any) {
      catchError(error);
    }
  }
);
