import express from "express";
import {
  myAccountMiddleware,
  usernameValidationMiddleware,
  emailValidationMiddleware,
  passwordValidationMiddleware,
} from "../middlewares/userMiddleware.js";
import {
  myAccountController,
  myCollectionController,
  deleteLinkController,
  usernameValidationController,
  emailValidationController,
  passwordValidationControlador,
} from "../controllers/userController.js";

const router = express.Router();

router.post(
  "/username-validation",
  usernameValidationMiddleware,
  usernameValidationController
);
router.post(
  "/email-validation",
  emailValidationMiddleware,
  emailValidationController
);
router.post(
  "/password-validation",
  passwordValidationMiddleware,
  passwordValidationControlador
);
router.get("/:username", myAccountMiddleware, myAccountController);
router.get(
  "/:username/collection",
  myAccountMiddleware,
  myCollectionController
);
router.delete("/:username/:linkId", myAccountMiddleware, deleteLinkController);

export default router;
