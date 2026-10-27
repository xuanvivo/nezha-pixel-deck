import { test } from "node:test";
import assert from "node:assert/strict";
import {
  bytes,
  cpuCount,
  publicDescription,
  escapeHTML,
  isOnline,
  parseConfig,
  parseServers,
  percent,
  sortServers,
} from "../src/model";
import type { Server } from "../src/model";
const now = Date.now();
const node = (id: number, extra: Partial<Server> = {}): Server => ({
  id,
  name: `Node ${id}`,
  state: { cpu: id },
  last_active: new Date(now).toISOString(),
  ...extra,
});
test("backend priority uses descending display_index and stable ID tie breaker", () => {
  assert.deepEqual(
    sortServers(
      [
        node(1, { display_index: -10 }),
        node(3),
        node(2, { display_index: 30 }),
      ],
      "default",
      false,
    ).map((s) => s.id),
    [2, 3, 1],
  );
});
test("online-first overrides metric sort and stale/missing reports are offline", () => {
  const offline = node(99, {
    last_active: new Date(now - 31_000).toISOString(),
  });
  assert.deepEqual(
    sortServers([offline, node(1), node(2)], "cpu", true, [], now).map(
      (s) => s.id,
    ),
    [2, 1, 99],
  );
  assert.equal(isOnline(node(1, { state: null }), now), false);
  assert.equal(isOnline(node(1, { last_active: "invalid" }), now), false);
});
test("custom order appends new servers by backend priority", () => {
  assert.deepEqual(
    sortServers([node(1), node(2), node(3)], "custom", false, [3, 1]).map(
      (s) => s.id,
    ),
    [3, 1, 2],
  );
});
test("memory sorts percentages, names use natural order, and sorting never mutates input", () => {
  const a = [
    node(10, { state: { mem_used: 10 }, host: { mem_total: 100 } }),
    node(2, { state: { mem_used: 9 }, host: { mem_total: 10 } }),
  ];
  assert.equal(sortServers(a, "memory", false)[0].id, 2);
  assert.equal(sortServers(a, "name", false)[0].id, 2);
  assert.equal(a[0].id, 10);
});
test("unknown capacities remain unknown and nonfinite values cannot reach style attributes", () => {
  assert.equal(percent(1, 0), null);
  assert.equal(percent(Infinity, 100), 0);
  assert.equal(percent(1000, 100), 100);
  assert.equal(bytes(-1), "0 B");
  assert.equal(bytes(1024), "1.0 KiB");
});
test("stream parsing accepts v2 envelopes and filters invalid or duplicate identities", () => {
  assert.equal(
    parseServers({
      data: { servers: [node(1), node(1), { id: "<script>", name: "x" }] },
    }).length,
    1,
  );
  assert.deepEqual(parseServers({ servers: [] }), []);
  assert.throws(() => parseServers({ error: "unauthorized" }));
});
test("untrusted notes and aliases are treated as text; config uses only recognized fields", () => {
  assert.equal(escapeHTML('<script>"&'), "&lt;script&gt;&quot;&amp;");
  assert.deepEqual(
    parseConfig({
      siteName: "Demo",
      serverOrder: [2, 2, 1, -1, "x"],
      token: "never",
      aliases: { "1": "A", invalid: "B" },
    }),
    { siteName: "Demo", serverOrder: [2, 1], aliases: { "1": "A" } },
  );
});

test("CPU count reads Nezha core descriptors and never guesses from a single CPU model", () => {
  assert.equal(cpuCount(["Example CPU 4 Virtual Core"]), 4);
  assert.equal(
    cpuCount(["Example CPU 8 Physical Core", "Example CPU 8 Physical Core"]),
    16,
  );
  assert.equal(cpuCount(["Unknown model"]), null);
});
test("structured legacy notes show a readable plan and exclude billing details", () => {
  assert.equal(
    publicDescription(
      JSON.stringify({
        planDataMod: { extra: "Example", bandwidth: "1 Gbps" },
        billingDataMod: { amount: "private billing" },
      }),
    ),
    "Example · 1 Gbps",
  );
  assert.equal(
    publicDescription(
      JSON.stringify({ billingDataMod: { amount: "private" } }),
    ),
    "",
  );
});
