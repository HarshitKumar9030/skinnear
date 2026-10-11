import { MongoServerError } from "mongodb";
import { MongoDatabase } from "@/lib/mongodb";
import { AppError } from "@/lib/errors";

export interface AbuseStore {
  increment(key: string, expiresAt: number): Promise<number>;
  acquire(key: string, lease: string, expiresAt: number): Promise<boolean>;
  release(key: string, lease: string): Promise<void>;
}
type Entry = { count: number; expiresAt: number; lease?: string };
/** Bounded development store; public production uses MongoDB. */
export class MemoryAbuseStore implements AbuseStore {
  constructor(
    private readonly entries = new Map<string, Entry>(),
    private readonly now = () => Date.now(),
  ) {}
  private prune() {
    for (const [key, entry] of this.entries)
      if (entry.expiresAt <= this.now()) this.entries.delete(key);
    if (this.entries.size >= 10000)
      throw new AppError("Request protection is busy. Please retry later.", 503);
  }
  async increment(key: string, expiresAt: number) {
    this.prune();
    const entry = this.entries.get(key) ?? { count: 0, expiresAt };
    this.entries.set(key, entry);
    return ++entry.count;
  }
  async acquire(key: string, lease: string, expiresAt: number) {
    this.prune();
    if (this.entries.has(key)) return false;
    this.entries.set(key, { count: 0, expiresAt, lease });
    return true;
  }
  async release(key: string, lease: string) {
    if (this.entries.get(key)?.lease === lease) this.entries.delete(key);
  }
}
type AbuseEntry = { _id: string; count?: number; lease?: string; expiresAt: Date };
export class MongoAbuseStore implements AbuseStore {
  private async collection() {
    try {
      const collection = (await MongoDatabase.connect()).collection<AbuseEntry>("request_limits");
      await collection.createIndex({ expiresAt: 1 }, { expireAfterSeconds: 0 });
      return collection;
    } catch {
      throw new AppError("Request protection is unavailable. Please retry later.", 503);
    }
  }
  async increment(key: string, expiresAt: number): Promise<number> {
    const collection = await this.collection();
    try {
      const result = await collection.findOneAndUpdate(
        { _id: key },
        { $inc: { count: 1 }, $setOnInsert: { expiresAt: new Date(expiresAt) } },
        { upsert: true, returnDocument: "after" },
      );
      return result!.count!;
    } catch (error) {
      if (error instanceof MongoServerError && error.code === 11000) {
        const result = await collection.findOneAndUpdate(
          { _id: key },
          { $inc: { count: 1 } },
          { returnDocument: "after" },
        );
        if (result?.count) return result.count;
      }
      throw new AppError("Request protection is unavailable. Please retry later.", 503);
    }
  }
  async acquire(key: string, lease: string, expiresAt: number) {
    const collection = await this.collection();
    try {
      await collection.updateOne(
        { _id: key, expiresAt: { $lte: new Date() } },
        { $set: { lease, expiresAt: new Date(expiresAt) } },
        { upsert: true },
      );
      return true;
    } catch (error) {
      if (error instanceof MongoServerError && error.code === 11000) return false;
      throw new AppError("Request protection is unavailable. Please retry later.", 503);
    }
  }
  async release(key: string, lease: string) {
    try {
      await (await this.collection()).deleteOne({ _id: key, lease });
    } catch {
      /* Cleanup failure leaves a short, expiring lease. */
    }
  }
}
