import { v2 as cloudinary } from "cloudinary";
import fs from "fs";

// Configuration
cloudinary.config({
  cloud_name: process.env.CLOUDINARY_CLOUD_NAME,
  api_key: process.env.CLOUDINARY_API_KEY,
  api_secret: process.env.CLOUDINARY_API_SECRET, // Click 'View API Keys' above to copy your API secret
});

const uploadOnCloudinary = async(localFilePath)=>{
  try {
    if(!localFilePath){
      throw new Error('File path is required');
    }
    const response = await cloudinary.uploader.upload(localFilePath,{
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
}

export { uploadOnCloudinary };


