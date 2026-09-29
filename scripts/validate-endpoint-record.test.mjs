import test from "node:test";
import assert from "node:assert/strict";
import { validateEndpoint } from "./validate-endpoint-record.mjs";

test("current unavailable record is fail-closed", async () => {
  const result = validateEndpoint({service:"omnikali",status:"unavailable",endpoint:null,health:null});
  assert.equal(result.status, "PASS");
});

test("available records cannot publish loopback or private endpoints", async () => {
  const result = validateEndpoint({service:"omnikali",status:"available",endpoint:"http://127.0.0.1:8080",health:{ok:true}});
  assert.equal(result.status, "FAIL");
});

test("available records require health evidence", async () => {
  const result = validateEndpoint({service:"omnikali",status:"available",endpoint:"https://example.invalid",health:null});
  assert.equal(result.status, "FAIL");
});
