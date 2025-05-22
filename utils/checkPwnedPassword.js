import sha1 from "crypto-js/sha1.js";

export const checkPwnedPassword = async (password) => {
  const hash = sha1(password).toString().toUpperCase();
  const prefix = hash.slice(0, 5);
  const suffix = hash.slice(5);

  const response = await fetch(
    `https://api.pwnedpasswords.com/range/${prefix}`
  );
  const data = await response.text();
  return data.includes(suffix);
};
