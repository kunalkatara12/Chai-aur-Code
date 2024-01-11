import { v2 as cloudinary } from "cloudinary";
import fs from "fs";
cloudinary.config({
  cloud_name: process.env.CLOUDINARY_CLOUD_NAME as string,
  api_key: process.env.CLOUDINARY_API_KEY as string,
  api_secret: process.env.CLOUDINARY_API_SECRET as string,
});

// upload file to cloudinary
const uploadOnCloudinary = async (localFilePath: string) => {
  try {
    if (!localFilePath) throw new Error("No file path provided");
    const result = await cloudinary.uploader.upload(localFilePath, {
      resource_type: "auto",
    });
    console.log("File is uploaded:", result.url);
    // console.log(localFilePath)
    fs.unlinkSync(localFilePath)
    return result;
  } catch (err) {
    fs.unlinkSync(localFilePath)
    // remove temp file from local storage
    console.log(err);
    throw new Error("Error uploading image to cloudinary");
  }
};

export { uploadOnCloudinary };
