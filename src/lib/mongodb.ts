import { MongoClient } from "mongodb";
import { AppError } from "./errors";

/** One connection pool per process, reused across Next.js development reloads. */
export class MongoDatabase {
  private static readonly state = globalThis as typeof globalThis & {
    skinnearMongo?: Promise<MongoClient>;
  };

  static async connect() {
    const uri = process.env.MONGODB_URI;
    if (!uri)
      throw new AppError(
        "MongoDB is not configured. Add MONGODB_URI to enable saved routines.",
        503,
      );
    try {
      if (!this.state.skinnearMongo) {
        this.state.skinnearMongo = new MongoClient(uri, {
          serverSelectionTimeoutMS: 4000,
          maxPoolSize: 10,
        }).connect();
      }
      const client = await this.state.skinnearMongo;
      return client.db(process.env.MONGODB_DATABASE || "skinnear");
    } catch (error) {
      this.state.skinnearMongo = undefined;
      if (error instanceof Error && error.name === "MongoParseError")
        throw new AppError(
          "The MongoDB connection setting is invalid. Correct MONGODB_URI or leave it empty to use the sample catalog.",
          503,
        );
      throw new AppError(
        "MongoDB is unavailable. Your routine is still here; try saving again later.",
        503,
      );
    }
  }
}
