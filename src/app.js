import express from "express";
import cors from "cors";
import cookieParser from "cookie-parser";

const app = express();

// app.use((req, res, next) => {
//   console.log(`Incoming request: ${req.method} ${req.url}`);
//   next();
// });

app.use(
  cors({
    origin: process.env.CORS_ORIGIN,
    credentials: true,
  })
);

app.use(express.json({ limit: "50mb" }));
app.use(express.urlencoded({ extended: true, limit: "16kb" }));
app.use(cookieParser());
app.use(express.static("public"));

//routes import
import userRouter from "./routes/user.routes.js";
import videoRouter from "./routes/video.routes.js";
import commentRouter from "./routes/comment.routes.js";
import likeRouter from "./routes/like.routes.js"
import tweetRouter from "./routes/tweet.routes.js"

//router declaration
app.use("/api/v1/users", userRouter);
app.use("/api/v1/videos", videoRouter);
app.use("/api/v1/comments",
//    (req, res, next) => {
//   console.log("commentRouter base route hit");
//   next();
// }, 
commentRouter); // Corrected route
app.use("/api/v1/likes", likeRouter);
app.use("/api/v1/tweets", tweetRouter);



export { app };
