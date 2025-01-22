import {ApiError} from "../utils/ApiError.js"
import {ApiResponse} from "../utils/ApiResponse.js"
import {asyncHandler} from "../utils/asyncHandler.js"
import mongoose from "mongoose";


const healthcheck = asyncHandler(async (req, res) => {
  try {
    // Perform a basic database connection health check
    const dbStatus = await mongoose.connection.db.admin().ping();

    // Aggregate data from collections to verify their operational status
    const statsPipeline = [
      {
        $facet: {
          users: [{ $count: "count" }],
          videos: [{ $count: "count" }],
          subscriptions: [{ $count: "count" }],
        },
      },
      {
        $project: {
          usersCount: { $arrayElemAt: ["$users.count", 0] },
          videosCount: { $arrayElemAt: ["$videos.count", 0] },
          subscriptionsCount: { $arrayElemAt: ["$subscriptions.count", 0] },
        },
      },
    ];

    const stats = await mongoose.connection.db
      .collection("users") // Start aggregation from the "users" collection
      .aggregate(statsPipeline)
      .toArray();

    const result = stats[0] || {
      usersCount: 0,
      videosCount: 0,
      subscriptionsCount: 0,
    };

    // Constructing a response with stats and health status
    return res.status(200).json(
      new ApiResponse(200, {
        status: "OK",
        dbStatus: dbStatus.ok ? "Connected" : "Disconnected",
        stats: result,
      }, "Healthcheck passed")
    );
  } catch (error) {
    console.error("Healthcheck error:", error);

    // Return an error response
    throw new ApiError(500, "Healthcheck failed: " + error.message);
  }
});

export { healthcheck };
