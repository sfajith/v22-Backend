import Link from "../models/Links.js";

export async function cleanOldLinks() {
  try {
    const result = await Link.deleteMany({
      username: "linkAdmin",
      createdAt: { $lt: new Date(Date.now() - 30 * 24 * 60 * 60 * 1000) },
    });
    console.log(`🧹 Enlaces eliminados: ${result.deletedCount}`);
  } catch (error) {
    console.error("Error al limpiar enlaces antiguos:", error.message);
  }
}
