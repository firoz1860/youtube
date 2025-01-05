import { v2 as cloudinary } from "cloudinary";
import fs from "fs";

// Configuration
cloudinary.config({
  cloud_name: process.env.CLOUDINARY_CLOUD_NAME,
  api_key: process.env.CLOUDINARY_API_KEY,
  api_secret: process.env.CLOUDINARY_API_SECRET,
});

const uploadOnCloudinary = async (localFilePath) => {
  try {
    if (!localFilePath) {
      throw new Error("File path is required");
    }

    // Upload the file to Cloudinary
    const response = await cloudinary.uploader.upload(localFilePath, {
      resource_type: "auto", // Auto-detects whether it's an image or video
    });
    // console.log("File uploaded successfully:", response.secure_url);

    // Remove the local file after successful upload
    fs.unlinkSync(localFilePath);
    return response;
  } catch (error) {
    // console.error("Error uploading file to Cloudinary:", error);

    // Ensure cleanup even if upload fails
    if (fs.existsSync(localFilePath)) {
      fs.unlinkSync(localFilePath);
    }
    return null;
  }
};

const deleteFromCloudinary = async (fileUrl) => {
  try {
    const publicId = extractPublicIdFromUrl(fileUrl);
    if (!publicId) {
      throw new Error("Invalid file URL");
    }

    // Delete the file from Cloudinary
    const result = await cloudinary.uploader.destroy(publicId);
    if (result.result === "ok" || result.result === "not found") {
      // console.log(`Deleted file from Cloudinary: ${fileUrl}`);
      return true;
    } else {
      throw new Error(`Failed to delete file from Cloudinary: ${result.result}`);
    }
  } catch (error) {
    // console.error("Error deleting file from Cloudinary:", error);
    throw error;
  }
};

const extractPublicIdFromUrl = (fileUrl) => {
  try {
    if (!fileUrl.includes("upload/")) {
      throw new Error("Invalid Cloudinary URL structure");
    }

    // Extract the public ID from the URL
    return fileUrl.split("upload/")[1].split(".")[0];
  } catch (error) {
    // console.error("Failed to extract public ID from URL:", fileUrl, error);
    return null;
  }
};

export {
  uploadOnCloudinary,
  deleteFromCloudinary,
  extractPublicIdFromUrl,
};


























// import { v2 as cloudinary } from "cloudinary";
// import fs from "fs";

// // Configuration
// cloudinary.config({
//   cloud_name: process.env.CLOUDINARY_CLOUD_NAME,
//   api_key: process.env.CLOUDINARY_API_KEY,
//   api_secret: process.env.CLOUDINARY_API_SECRET, 
// });



// const uploadOnCloudinary = async (localFilePath) => {
//   try {
//     if (!localFilePath) {
//       throw new Error("File path is required");
//     }
//     const response = await cloudinary.uploader.upload(localFilePath, {
//       resource_type: "auto",
//     });
//     console.log("Video uploaded successfully:", response.secure_url);
    

//     await fs.unlinkSync(localFilePath); 
//     return response;

//   } catch (error) {
//     fs.unlinkSync(localFilePath); 
//     return null;
//   }
// };



// const deleteFromCloudinary = async (fileUrl) => {
//   try {
//     const publicId = extractPublicIdFromUrl(fileUrl);
//     if (!publicId) {
//       throw new Error("Invalid file url");
//     }

//     const result = await cloudinary.uploader.destroy(publicId);
//     if (result.result === "ok" || result.result === "not found") {
//       console.log(`Deleted file from Cloudinary: ${fileUrl}`);
//       return true; //file deleted successfully
//     } else {
//       throw new Error(
//         `Failed to delete file from Cloudinary: ${result.result}`
//       );
//     }
//   } catch (error) {
//     console.error("Error deleting file from Cloudinary:", error);
//     throw error;
//   }
// };

// const extractPublicIdFromUrl = (fileUrl) => {
//   try {
//     const urlParts = fileUrl.split("/");
//     const fileNameWithExtension = urlParts[urlParts.length - 1];
//     const publicId = fileNameWithExtension.split(".")[0];
//     return fileUrl.includes("upload/") 
//       ? fileUrl.split("upload/")[1].split(".")[0]
//       : publicId;
//   } catch (error) {
//     console.error("Failed to extract public ID from URL:", fileUrl, error);
//     return null;
//   }
// };

// // const extractPublicIdFromUrl = (fileUrl) => {
// //   try {
// //     const uploadSegmentIndex = fileUrl.indexOf("upload/");
// //     if (uploadSegmentIndex !== -1) {
// //       return fileUrl
// //         .substring(uploadSegmentIndex + 7) // After "upload/"
// //         .split(".")[0]; // Remove file extension
// //     } else {
// //       throw new Error("Invalid Cloudinary URL structure");
// //     }
// //   } catch (error) {
// //     console.error("Failed to extract public ID from URL:", fileUrl, error);
// //     return null;
// //   }
// // };

// export { uploadOnCloudinary,
//   deleteFromCloudinary,
//   extractPublicIdFromUrl
//  };
