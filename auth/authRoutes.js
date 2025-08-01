import express from "express";
import {
  registerMiddleware,
  loginMiddleware,
  verifyAccountMiddleware,
  resendVerifyMiddleware,
  forgotPasswordMiddleware,
  recoverPasswordMiddleware,
  renewMiddleware,
  logoutMiddleware,
} from "./authMiddleware.js";
import {
  registerController,
  loginController,
  deleteController,
  resetPasswordController,
  logoutController,
  verifyAccountController,
  resendVerifyController,
  forgotPasswordController,
  recoverPasswordController,
} from "./authController.js";
import { myAccountMiddleware } from "../middlewares/userMiddleware.js";

const router = express.Router();

router.post("/register", registerMiddleware, registerController);
router.post("/login", loginMiddleware, loginController);
router.post("/renew", renewMiddleware);
router.get("/verify-email", verifyAccountMiddleware, verifyAccountController);
router.post(
  "/resend-verification",
  resendVerifyMiddleware,
  resendVerifyController
);
router.post(
  "/forgot-password",
  forgotPasswordMiddleware,
  forgotPasswordController
);
router.post(
  "/recover-password",
  recoverPasswordMiddleware,
  recoverPasswordController
);
router.post("/logout", logoutMiddleware);
router.put("/:username/reset", myAccountMiddleware, resetPasswordController);
router.post("/:username/delete", myAccountMiddleware, deleteController);
router.post("/:username/logout", myAccountMiddleware, logoutController);

export default router;
