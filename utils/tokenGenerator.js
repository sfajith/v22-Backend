import jwt from "jsonwebtoken";
import dotenv from "dotenv";

dotenv.config();

export function generateAccessToken(user) {
  // console.log(process.env.JWT_ACCESS_SECRET, "generateAccessToken");
  const accessToken = jwt.sign(
    {
      id: user._id,
      username: user.username,
    },
    process.env.JWT_ACCESS_SECRET,
    {
      expiresIn: process.env.JWT_ACCESS_EXPIRES,
    }
  );
  return accessToken;
}

export function generateRefreshToken(user) {
  /*   console.log(
    process.env.JWT_REFRESH_SECRET,
    "process.env.JWT_REFRESH_SECRET para firmar"
  ); */
  const refreshToken = jwt.sign(
    {
      id: user._id,
      username: user.username,
    },
    process.env.JWT_REFRESH_SECRET,
    {
      expiresIn: process.env.JWT_REFRESH_EXPIRES,
    }
  );
  // console.log(refreshToken, "refreshToken que genero");
  return refreshToken;
}
