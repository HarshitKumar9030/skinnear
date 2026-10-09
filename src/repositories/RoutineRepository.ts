import { ObjectId } from "mongodb";
import type { Routine, RoutineRequest } from "@/domain/schemas";
import { MongoDatabase } from "@/lib/mongodb";

export class RoutineRepository {
  async save(ownerId: string, request: RoutineRequest, routine: Routine): Promise<string> {
    const db = await MongoDatabase.connect();
    const collection = db.collection("routines");
    await collection.createIndex({ expiresAt: 1 }, { expireAfterSeconds: 0 });
    const result = await collection.insertOne({ ownerId, request, routine, createdAt: new Date(), expiresAt: new Date(Date.now() + 30 * 86400000) });
    return result.insertedId.toHexString();
  }

  async get(id: string, ownerId: string) {
    if (!ObjectId.isValid(id)) return null;
    const db = await MongoDatabase.connect();
    return db.collection("routines").findOne({ _id: new ObjectId(id), ownerId, expiresAt: { $gt: new Date() } }, { projection: { _id: 0, ownerId: 0 } });
  }

  async remove(id: string, ownerId: string) {
    if (!ObjectId.isValid(id)) return false;
    const db = await MongoDatabase.connect();
    return (await db.collection("routines").deleteOne({ _id: new ObjectId(id), ownerId })).deletedCount === 1;
  }
}
