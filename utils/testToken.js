import jwt from "jsonwebtoken";

const secret = "Fajith001@@";

const token = jwt.sign({ id: "test" }, secret, { expiresIn: "1h" });
console.log("Token generado:", token);

const decoded = jwt.verify(token, secret);
console.log("Decoded:", decoded);
