import { test } from "node:test";
import assert from "node:assert/strict";
import { TaskTokenService } from "../src/services/TaskTokenService";

test("signed scan tokens round-trip and reject tampering", () => {
  const tokens = new TaskTokenService();
  const token = tokens.issue("provider-task-id");
  assert.equal(tokens.verify(token), "provider-task-id");
  assert.throws(() => tokens.verify(token + "x"), /invalid/);
  assert.throws(() => tokens.verify("malformed"), /invalid/);
});
