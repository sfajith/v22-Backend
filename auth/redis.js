import Redis from "ioredis";

//conexion
const redisClient = new Redis({
  host: "127.0.0.1",
  port: 6379,
});

//evento error
redisClient.on("error", (err) => {
  console.error("Redis Client Error", err);
});

//evento conexion
redisClient.on("connect", () => {
  console.log("✅ Conectado a Redis con ioredis");
});

export default redisClient;
