import multer from "multer";
// import path from "path";
import { mkdirSync, existsSync } from "fs"; 


const uploadDirectory = "./public/temp";
if (!existsSync(uploadDirectory)) {
  mkdirSync(uploadDirectory, { recursive: true });
}


const storage = multer.diskStorage({
  destination: function (req, file, cb) {
    cb(null, uploadDirectory); 
  },
  filename: function (req, file, cb) {
    
    const uniqueSuffix = `${Date.now()}-${Math.round(Math.random() * 1e9)}`;
    cb(null, `${uniqueSuffix}-${file.originalname}`);
    // cb(null, file.originalname);
  },
});

// File filter to validate file types
const fileFilter = (req, file, cb) => {
  const allowedTypes = ["video/mp4", "image/jpeg", "image/png"];
  if (allowedTypes.includes(file.mimetype)) {
    cb(null, true); // Accept file
  } else {
    cb(new Error("Invalid file type. Only MP4, JPEG, and PNG are allowed!"), false); // Reject file
  }
};

// Export multer instance with limits and filter
export const upload = multer({
  storage,
  limits: {
    fileSize: 100 * 1024 * 1024, // Limit file size to 20 MB
  },
  fileFilter,
});




















// import multer from "multer";

// const storage = multer.diskStorage({
//   destination: function (req, file, cb) {
//     cb(null, "./public/temp");
//   },
//   filename: function (req, file, cb) {
//     cb(null, file.originalname);
//   },
// });

// export const upload = multer({
//   storage,
  
// });
