import express from "express";
import {
  linkMiddleware,
  redirectMiddleware,
} from "../middlewares/linkMiddleware.js";
import {
  createShortLink,
  linkRedirect,
} from "../controllers/linkController.js";

const router = express.Router();

router.post("/new", linkMiddleware, createShortLink);
router.get("/:short", redirectMiddleware, linkRedirect);

export default router;
