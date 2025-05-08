import express from "express";
import {
  registerMiddleware,
  loginMiddleware,
  myAccountMiddleware,
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
} from "../controllers/userController.js";

const router = express.Router();

router.post("/register", registerMiddleware, registerController);
router.post("/login", loginMiddleware, loginController);
router.get("/:username", myAccountMiddleware, myAccountController);
router.get(
  "/:username/collection",
  myAccountMiddleware,
  myCollectionController
);
router.delete("/:username/:linkId", myAccountMiddleware, deleteLinkController);
router.put("/:username/reset", myAccountMiddleware, resetPasswordController);
router.delete("/:username/delete", myAccountMiddleware, deleteController);
router.post("/:username/logout", myAccountMiddleware, logoutController);
router.post("/auth", myAccountMiddleware, authController);

export default router;
