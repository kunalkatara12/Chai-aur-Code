import { compare, hash } from "bcrypt";
import { sign } from "jsonwebtoken";
import { Schema, model } from "mongoose";

const userSchema: Schema = new Schema(
  {
    userName: {
      type: String,
      required: true,
      unique: true,
      trim: true,
      index: true,
    },
    email: {
      type: String,
      trim: true,
      required: true,
      unique: true,
      lowercase: true,
    },
    fullName: {
      type: String,
      trim: true,
      required: true,
      index: true,
    },
    password: {
      type: String,
      required: [true, "Password is required"],
    },
    refreshToken: {
      type: String,
    },
    avatar: {
      type: String, //url
      default: "",
      required: true,
    },
    coverImage: {
      type: String, //url
    },
    watchHistory: [
      {
        type: Schema.Types.ObjectId,
        ref: "Video",
      },
    ],
  },
  { timestamps: true }
);

userSchema.pre("save", async function (next) {
  if (!this.isModified("password")) return next();

  this.password = await hash(this.password, 10);
  next();
});

userSchema.methods.isPasswordCorrect = async function (password: string) {
  return await compare(password, this.password);
};

userSchema.methods.generateAccessToken = function () {
  return sign(
    //payload
    {
      _id: this._id,
      email: this.email,
      userName: this.userName,
      fullName: this.fullName,
    },
    //secret
    process.env.ACCESS_TOKEN_SECRET as string,
    //options: expiresIn
    {
      expiresIn: process.env.ACCESS_TOKEN_EXPIRY,
    }
  );
};
userSchema.methods.generateRefreshToken = function () {
  return sign(
    //payload
    {
      _id: this._id,
    },
    //secret
    process.env.REFRESH_TOKEN_SECRET as string,
    //options: expiresIn
    {
      expiresIn: process.env.REFRESH_TOKEN_EXPIRY,
    }
  );
};
export const User = model("User", userSchema);
