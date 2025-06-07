import express from "express";
import {
  linkMiddleware,
  liveCodeMiddleware,
  redirectMiddleware,
  secureLinkCheckerMiddleware,
} from "../middlewares/linkMiddleware.js";
import {
  createShortLink,
  linkRedirect,
  liveCodeController,
} from "../controllers/linkController.js";

const router = express.Router();

router.post("/new", linkMiddleware, createShortLink);
router.post("/live-code", liveCodeMiddleware, liveCodeController);
router.post("/secureLinkCheck", secureLinkCheckerMiddleware);
router.get("/:short", redirectMiddleware, linkRedirect);

export default router;
