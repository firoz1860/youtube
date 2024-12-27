import express from "express";
import cors from "cors";
import cookieParser from "cookie-parser";

const app = express();

app.use(
  cors({
    origin: process.env.CORS_ORIGIN,
    credentials: true,
  })
);

app.use(express.json({ limit: "50mb" }));
app.use(express.urlencoded({ extended: true }));
app.use(cookieParser());
app.use(express.static("public"));


//routes import
import userRouter  from "./routes/user.routes.js";


//router declaration

app.use("/api/v1/users", userRouter);
//http://localhost:3000/api/v1/users/register
// Error handling middleware
// app.use((err, req, res, next) => {
//   if (err instanceof ApiError) {
//     return res.status(err.statusCode).json({
//       success: err.success,
//       message: err.message,
//       errors: err.errors,
//       data: err.data,
//     });
//   }

//   return res.status(500).json({
//     success: false,
//     message: "Internal server error",
//   });
// });

export { app };
// export default app;
