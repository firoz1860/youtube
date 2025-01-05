import { Router } from "express";
import {
  getVideoComments,
  addComment,
  deleteComment,
  updateComment,
} from "../controllers/comment.controller.js";

import { verifyJWT } from "../middlewares/auth.middleware.js";

const router = Router();

// router.use((req, res, next) => {
//   console.log(`Incoming request: ${req.method} ${req.url}`);
//   next();
// });

router.use(verifyJWT); // Protect all routes in this file

router.route("/comment/:videoId").get(
//   (req, res, next) => {
//   console.log("getVideoComments route hit");
//   next();
// },
 getVideoComments).post(
//   (req, res, next) => {
//   console.log("addComment route hit");
//   next();
// }, 
addComment);

router.route("/comment/:commentId").delete(
//   (req, res, next) => {
//   console.log("deleteComment route hit");
//   next();
// }, 
deleteComment).patch(
//   (req, res, next) => {
//   console.log("updateComment route hit");
//   next();
// }, 
updateComment);

export default router;