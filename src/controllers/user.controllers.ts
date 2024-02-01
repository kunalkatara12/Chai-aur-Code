import { Request, Response, NextFunction } from "express";
import { User } from "../models/user.models";
import asyncHandler from "../utils/asyncHandler.utils";
import { ApiError } from "../utils/ApiError.utils";
import { uploadOnCloudinary } from "../utils/cloudinary.utils";
import { ApiResponse } from "../utils/ApiResponse.utils";
import { verify } from "jsonwebtoken";
import { Types } from "mongoose";
type UpdateFields = {
  userName?: string;
  fullName?: string;
  email?: string;
  // Add other fields if necessary
};
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
  async (
    req: Request & { user?: any } & { files?: any },
    res: Response,
    next: NextFunction
  ) => {
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
  async (req: Request & { user?: any }, res: Response, next: NextFunction) => {
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
      const { accessToken, refreshToken } =
        (await generateAccessAndRefreshToken(user._id)) as {
          accessToken: string;
          refreshToken: string;
        };
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
  async (req: Request & { user?: any }, res: Response, next: NextFunction) => {
    try {
      const { _id } = req.user._id;
      await User.findByIdAndUpdate(
        _id,
        {
          // $set: {
          //   refreshToken: "",
          // },
          $unset: {
            refreshToken: 1
          }
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
  async (req: Request & { user?: any }, res: Response, next: NextFunction) => {
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
      if (typeof decodedToken === "string") {
        throw new ApiError(401, "Invalid token in user.controllers.ts");
      } else {
        user = await User.findById(decodedToken._id);
      }
      if (!user) {
        throw new ApiError(401, "User not found in user.controllers.ts");
      }
      if (inRefreshToken !== user.refreshToken) {
        throw new ApiError(
          401,
          "Refresh Token exired or used in user.controllers.ts"
        );
      }
      const { accessToken, refreshToken } =
        (await generateAccessAndRefreshToken(user._id)) as {
          accessToken: string;
          refreshToken: string;
        };
      const newRefreshToken: string = refreshToken;
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
              refreshToken: newRefreshToken,
            },
            "Access token refreshed successfully in user.controllers.ts"
          )
        );
    } catch (error: any) {
      catchError(error);
    }
  }
);

export const changeCurrentPassword = asyncHandler(
  async (req: Request & { user?: any }, res: Response, next: NextFunction) => {
    try {
      const { currentPassword, newPassword, confirmPassword } = req.body;
      if (newPassword === currentPassword) {
        throw new ApiError(
          400,
          "New password can't be same as current password in user.controllers.ts"
        );
      }
      if (newPassword !== confirmPassword) {
        throw new ApiError(
          400,
          "New password and confirm password should match in user.controllers.ts"
        );
      }
      const user = await User.findById(req.user?._id);
      // const user = await User.findById(
      //   (req as Request & { user?: { _id: string } }).user?._id
      // );
      const isPasswordCorrect = await user.isPasswordCorrect(currentPassword);
      if (!isPasswordCorrect) {
        throw new ApiError(
          400,
          "Current password is incorrect in user.controllers.ts"
        );
      }
      user.password = newPassword;
      await user.save({
        validateBeforeSave: false,
      });
      return res
        .status(200)
        .json(
          new ApiResponse(
            200,
            {},
            "Password Cahnged Successfully in user.controllers.ts"
          )
        );
    } catch (error: any) {
      catchError(error);
    }
  }
);

export const getCurrentUser = asyncHandler(
  async (req: Request & { user?: any }, res: Response, next: NextFunction) => {
    try {
      return res
        .status(200)
        .json(
          new ApiResponse(
            200,
            req?.user,
            "Current user fetched successfully in user.controllers.ts"
          )
        );
    } catch (error: any) {
      catchError(error);
    }
  }
);

export const updateAccountDetails = asyncHandler(
  async (req: Request & { user?: any }, res: Response, next: NextFunction) => {
    try {
      const { newUserName, newFullName, newEmail } = req.body;
      if (!newUserName && !newFullName && !newEmail) {
        throw new ApiError(
          400,
          "At least one field is required in user.controllers.ts"
        );
      }

      const updateFields: UpdateFields = {};

      // Only include fields that are provided
      if (newUserName) {
        updateFields.userName = newUserName;
      }

      if (newFullName) {
        updateFields.fullName = newFullName;
      }

      if (newEmail) {
        updateFields.email = newEmail;
      }
      if (newUserName || newEmail) {
        const query: Record<string, string> = {};

        if (newUserName) {
          query.userName = newUserName;
        }

        if (newEmail) {
          query.email = newEmail;
        }

        const exUserWithSameField = await User.findOne(query);

        if (exUserWithSameField) {
          throw new ApiError(
            409,
            `User already exists with the same ${newUserName ? "username" : "email"
            } in user.controllers.ts`
          );
        }
      }
      const userWithUpdatedInfo = User.findByIdAndUpdate(
        req.user?._id,
        {
          $set: updateFields,
        },
        {
          new: true,
        }
      ).select("-password");
      return res
        .status(200)
        .json(
          new ApiResponse(
            200,
            userWithUpdatedInfo,
            "Account details updated successfully in user.controllers.ts"
          )
        );
    } catch (error) {
      catchError(error);
    }
  }
);

export const updateAvatar = asyncHandler(
  async (req: Request & { user?: any }, res: Response, next: NextFunction) => {
    try {
      const newAvataLocalPath = req.file?.path;
      if (!newAvataLocalPath)
        throw new ApiError(400, "Avatar is required in user.controllers.ts");
      const newAvatar = await uploadOnCloudinary(newAvataLocalPath);
      if (!newAvatar.url)
        throw new ApiError(
          400,
          "Avatar not uploaded properly in user.controllers.ts"
        );
      const user = await User.findByIdAndUpdate(
        req.user?._id,
        {
          $set: {
            avatar: newAvatar.url,
          },
        },
        {
          new: true,
        }
      ).select("-password");
      return res
        .status(200)
        .json(
          new ApiResponse(
            200,
            user,
            "Avatar updated successfully in user.controllers.ts"
          )
        );
    } catch (error) {
      catchError(error);
    }
  }
);

export const updateCoverImage = asyncHandler(
  async (req: Request & { user?: any }, res: Response, next: NextFunction) => {
    try {
      const newCoverImageLocalPath = req.file?.path;
      if (!newCoverImageLocalPath)
        throw new ApiError(
          400,
          "Cover image is required in user.controllers.ts"
        );
      const newCoverImage = await uploadOnCloudinary(newCoverImageLocalPath);
      if (!newCoverImage.url)
        throw new ApiError(
          400,
          "Cover image not uploaded properly in user.controllers.ts"
        );
      const user = await User.findByIdAndUpdate(
        req.user?._id,
        {
          $set: {
            coverImage: newCoverImage.url,
          },
        },
        {
          new: true,
        }
      ).select("-password");
      return res
        .status(200)
        .json(
          new ApiResponse(
            200,
            user,
            "Cover image updated successfully in user.controllers.ts"
          )
        );
    } catch (error) {
      catchError(error);
    }
  }
);

export const getUserChannelProfile = asyncHandler(
  async (req: Request & { user?: any }, res: Response, next: NextFunction) => {
    try {
      const { userName } = req.params;
      if (!userName?.trim()) {
        throw new ApiError(400, "Username is missing in user.controllers.ts");
      }
      const channel = await User.aggregate(
        [
          {
            $match: {
              userName: userName
            }
          },
          {
            $lookup: {
              from: "subscriptions",
              localField: "_id",
              foreignField: "channel",
              as: "subscribers"
            }
          },
          {
            $lookup: {
              from: "subscriptions",
              localField: "_id",
              foreignField: "subscriber",
              as: "subscribedTo"
            }
          },
          {
            $addFields: {
              subscribeersCount: {
                $size: "$subscribers"
              },
              channelsSubscribedToCount: {
                $size: "$subscribedTo"
              },
              isSubscribed: {
                $cond: {
                  if: {
                    $in: [req.user?._id, "$subscribers.subscriber"]
                  },
                  then: true,
                  else: false
                }
              }
            }
          },
          {
            $project: {
              fullName: 1,
              userName: 1,
              subscribersCount: 1,
              channelsSubscribedToCount: 1,
              avatar: 1,
              coverImage: 1,
              email: 1,
            }
          }
        ]
      );
      if (!channel?.length) {
        throw new ApiError(404, "Channel not found in user.controllers.ts");
      }
      return res
        .status(200)
        .json(
          new ApiResponse(
            200,
            channel[0],
            "Channel profile fetched successfully in user.controllers.ts"
          )
        );
    } catch (error: any) {
      catchError(error);
    }

  }
);

export const getWatchHistory = asyncHandler(
  async (req: Request & { user?: any }, res: Response, next: NextFunction) => {
    try {
      const user = await User.aggregate([
        {
          $match: {
            _id: new Types.ObjectId(req.user?._id)
          }
        },
        {
          $lookup: {
            from: "videos",
            localField: "watchHistory",
            foreignField: "user",
            as: "watchHistory",
            pipeline: [
              {
                $lookup: {
                  from: "users",
                  localField: "owner",
                  foreignField: "_id",
                  as: "owner",
                  pipeline: [
                    {
                      $project: {
                        fullName: 1,
                        userName: 1,
                        avatar: 1,
                      }
                    }
                  ]
                }
              }
            ]
          }
        },
        {
          $addFields: {
            owner: {
              // $arrayElemAt: ["$owner", 0]
              $first: "$owner"
            }
          }
        }
      ])
      return res.status(200).json(new ApiResponse(200, user[0].watchHistory, "Watch history fetched successfully in user.controllers.ts"));
    } catch (error) {
      catchError(error);
    }
  }
);