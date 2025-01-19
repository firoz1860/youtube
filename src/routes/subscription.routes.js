import { Router } from "express";

import { toggleSubscription ,getUserChannelSubscribers,getSubscribedChannels} from "../controllers/subscription.controller.js";

import { verifyJWT } from "../middlewares/auth.middleware.js";

const router = Router();

router.use(verifyJWT);

// router.use((req, res, next) => {
//   console.log(`Incoming request: ${req.method} ${req.url}`);
//   next();
// });

router
  .route("/c/:channelId").post(toggleSubscription).get(getUserChannelSubscribers);

router.route("/u/:subscriberId").get(getSubscribedChannels)

export default router;
