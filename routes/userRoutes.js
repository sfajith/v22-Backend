import express from "express";
import {
  registerMiddleware,
  loginMiddleware,
  myAccountMiddleware,
  verifyAccountMiddleware,
  resendVerifyMiddleware,
  forgotPasswordMiddleware,
  recoverPasswordMiddleware,
} from "../middlewares/userMiddleware.js";
import {
  registerController,
  loginController,
  myAccountController,
  myCollectionController,
  deleteController,
  resetPasswordController,
  logoutController,
  deleteLinkController,
  authController,
  verifyAccountController,
  resendVerifyController,
  forgotPasswordController,
  recoverPasswordController,
} from "../controllers/userController.js";

const router = express.Router();

router.post("/register", registerMiddleware, registerController);
router.post("/login", loginMiddleware, loginController);
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
router.post("/auth", myAccountMiddleware, authController);
router.get("/:username", myAccountMiddleware, myAccountController);
router.get(
  "/:username/collection",
  myAccountMiddleware,
  myCollectionController
);
router.delete("/:username/:linkId", myAccountMiddleware, deleteLinkController);
router.put("/:username/reset", myAccountMiddleware, resetPasswordController);
router.post("/:username/delete", myAccountMiddleware, deleteController);
router.post("/:username/logout", myAccountMiddleware, logoutController);
router.post("/auth", myAccountMiddleware, authController);

export default router;
