import { v2 as cloudinary } from "cloudinary";
import fs from "fs";

// Configuration
cloudinary.config({
  cloud_name: process.env.CLOUDINARY_CLOUD_NAME,
  api_key: process.env.CLOUDINARY_API_KEY,
  api_secret: process.env.CLOUDINARY_API_SECRET, // Click 'View API Keys' above to copy your API secret
});

const uploadOnCloudinary = async (localFilePath) => {
  try {
    if (!localFilePath) {
      throw new Error("File path is required");
    }
    const response = await cloudinary.uploader.upload(localFilePath, {
      resource_type: "auto",
    });

    //file uploaded successfully
    // console.log("file is upload on cloudinary",response.url);
    fs.unlinkSync(localFilePath); //remove the file locally saved temporarily for upload operation
    return response;
  } catch (error) {
    fs.unlinkSync(localFilePath); //remove the file locally saved temporarily for upload operation got fails
    return null;
  }
};



const deleteFromCloudinary = async (fileUrl) => {
  try {
    const publicId = extractPublicIdFromUrl(fileUrl);
    if (!publicId) {
      throw new Error("Invalid file url");
    }

    const result = await cloudinary.uploader.destroy(publicId);
    if (result.result === "ok" || result.result === "not found") {
      console.log(`Deleted file from Cloudinary: ${fileUrl}`);
      return true; //file deleted successfully
    } else {
      throw new Error(
        `Failed to delete file from Cloudinary: ${result.result}`
      );
    }
  } catch (error) {
    console.error("Error deleting file from Cloudinary:", error);
    throw error;
  }
};

const extractPublicIdFromUrl = (fileUrl) => {
  try {
    const urlParts = fileUrl.split("/");
    const fileNameWithExtension = urlParts[urlParts.length - 1];
    const publicId = fileNameWithExtension.split(".")[0];
    return fileUrl.includes("upload/") 
      ? fileUrl.split("upload/")[1].split(".")[0]
      : publicId;
  } catch (error) {
    console.error("Failed to extract public ID from URL:", fileUrl, error);
    return null;
  }
};

export { uploadOnCloudinary,
  deleteFromCloudinary,
  extractPublicIdFromUrl
 };
