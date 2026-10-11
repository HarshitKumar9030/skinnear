import { test } from "node:test";
import assert from "node:assert/strict";
import { MongoDatabase } from "../src/lib/mongodb";
import { AppError } from "../src/lib/errors";

test("malformed MongoDB configuration returns an actionable error without leaking the URI", async () => {
  const previous = process.env.MONGODB_URI;
  process.env.MONGODB_URI = "invalid-test-placeholder";
  try {
    await assert.rejects(
      MongoDatabase.connect(),
      (error: unknown) =>
        error instanceof AppError &&
        error.status === 503 &&
        error.message.includes("connection setting is invalid") &&
        !error.message.includes("invalid-test-placeholder"),
    );
  } finally {
    if (previous !== undefined) process.env.MONGODB_URI = previous;
    else delete process.env.MONGODB_URI;
  }
});
