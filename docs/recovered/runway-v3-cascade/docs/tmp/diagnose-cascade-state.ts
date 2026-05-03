/**
 * Read-only cascade state diagnostic
 * Zero writes. Queries prod Runway DB and prints current state.
 */

import { drizzle } from "drizzle-orm/libsql";
import { createClient } from "@libsql/client";
import { eq, and, gte, lte, isNull, isNotNull, inArray, like } from "drizzle-orm";
import { loadEnvLocal } from "../../scripts/lib/load-env";

loadEnvLocal();

import { clients, projects, weekItems, updates } from "../../src/lib/db/runway-schema";

const url = process.env.RUNWAY_DATABASE_URL ?? "file:runway-local.db";
const client = createClient({ url, authToken: process.env.RUNWAY_AUTH_TOKEN });
const db = drizzle(client);

const KNOWN_SLUGS = ["bonterra", "convergix", "lppc", "hdl", "ag1", "hopdoddy", "soundly"];

async function run() {
  // ── Lookups ───────────────────────────────────────────
  const allClients = await db.select().from(clients);
  const clientMap = new Map(allClients.map((c) => [c.id, c]));
  const slugToId = new Map(allClients.map((c) => [c.slug, c.id]));

  const allProjects = await db.select().from(projects);
  const projectMap = new Map(allProjects.map((p) => [p.id, p]));

  const allWeekItems = await db.select().from(weekItems);

  // ── Section A: Link Coverage ──────────────────────────
  console.log("═══════════════════════════════════════════");
  console.log("A. LINK COVERAGE");
  console.log("═══════════════════════════════════════════");

  const total = allWeekItems.length;
  const nullCount = allWeekItems.filter((w) => w.projectId === null).length;
  const linkedCount = total - nullCount;

  console.log(`Total week items: ${total}`);
  console.log(`  project_id = NULL: ${nullCount}`);
  console.log(`  project_id linked: ${linkedCount}`);
  console.log(`  Baseline was: 24 of 39 NULL\n`);

  // Per-client breakdown
  console.log("Per-client breakdown:");
  for (const slug of KNOWN_SLUGS) {
    const cid = slugToId.get(slug);
    if (!cid) {
      console.log(`  ${slug}: (client not found)`);
      continue;
    }
    const items = allWeekItems.filter((w) => w.clientId === cid);
    const linked = items.filter((w) => w.projectId !== null).length;
    const unlinked = items.filter((w) => w.projectId === null).length;
    console.log(`  ${slug}: ${items.length} total, ${linked} linked, ${unlinked} NULL`);
  }

  // Items with no client at all
  const noClient = allWeekItems.filter((w) => w.clientId === null);
  console.log(`  (no client): ${noClient.length} total, ${noClient.filter((w) => w.projectId !== null).length} linked, ${noClient.filter((w) => w.projectId === null).length} NULL`);

  // Per-category breakdown
  console.log("\nPer-category breakdown:");
  const categories = new Map<string, { total: number; linked: number; unlinked: number }>();
  for (const w of allWeekItems) {
    const cat = w.category ?? "(null)";
    const entry = categories.get(cat) ?? { total: 0, linked: 0, unlinked: 0 };
    entry.total++;
    if (w.projectId !== null) entry.linked++;
    else entry.unlinked++;
    categories.set(cat, entry);
  }
  for (const [cat, counts] of categories) {
    console.log(`  ${cat}: ${counts.total} total, ${counts.linked} linked, ${counts.unlinked} NULL`);
  }

  // ── Section B: Bonterra Projects ──────────────────────
  console.log("\n═══════════════════════════════════════════");
  console.log("B. BONTERRA PROJECTS");
  console.log("═══════════════════════════════════════════");

  const bonterraId = slugToId.get("bonterra");
  if (!bonterraId) {
    console.log("Bonterra client not found!");
  } else {
    const bonterraProjects = allProjects.filter((p) => p.clientId === bonterraId);
    if (bonterraProjects.length === 0) {
      console.log("No projects found for Bonterra.");
    } else {
      for (const p of bonterraProjects) {
        console.log(`  id: ${p.id}`);
        console.log(`  name: ${p.name}`);
        console.log(`  dueDate: ${p.dueDate ?? "(null)"}`);
        console.log(`  updatedAt: ${p.updatedAt}`);
        console.log(`  status: ${p.status ?? "(null)"}`);
        console.log("");
      }
    }

    // ── Section C: Bonterra Deadline Week Items ───────────
    console.log("═══════════════════════════════════════════");
    console.log("C. BONTERRA DEADLINE WEEK ITEMS");
    console.log("═══════════════════════════════════════════");

    // Query 1: by client_id = bonterra
    const byClient = allWeekItems.filter(
      (w) => w.clientId === bonterraId && w.category === "deadline"
    );

    // Query 2: by project_id IN (bonterra project ids)
    const bonterraProjectIds = new Set(bonterraProjects.map((p) => p.id));
    const byProject = allWeekItems.filter(
      (w) => w.projectId !== null && bonterraProjectIds.has(w.projectId) && w.category === "deadline"
    );

    console.log(`\nQuery 1 — by client_id = bonterra: ${byClient.length} items`);
    for (const w of byClient) {
      const projName = w.projectId ? (projectMap.get(w.projectId)?.name ?? "???") : "(no project)";
      console.log(`  id: ${w.id}`);
      console.log(`  title: ${w.title}`);
      console.log(`  date: ${w.date ?? "(null)"}`);
      console.log(`  category: ${w.category}`);
      console.log(`  projectId: ${w.projectId ?? "(null)"} → ${projName}`);
      console.log(`  updatedAt: ${w.updatedAt}`);
      console.log("");
    }

    console.log(`Query 2 — by project_id IN (bonterra projects): ${byProject.length} items`);
    for (const w of byProject) {
      const projName = w.projectId ? (projectMap.get(w.projectId)?.name ?? "???") : "(no project)";
      console.log(`  id: ${w.id}`);
      console.log(`  title: ${w.title}`);
      console.log(`  date: ${w.date ?? "(null)"}`);
      console.log(`  category: ${w.category}`);
      console.log(`  projectId: ${w.projectId ?? "(null)"} → ${projName}`);
      console.log(`  updatedAt: ${w.updatedAt}`);
      console.log("");
    }

    // Diff check
    const clientIds = new Set(byClient.map((w) => w.id));
    const projectIds = new Set(byProject.map((w) => w.id));
    const onlyInClient = byClient.filter((w) => !projectIds.has(w.id));
    const onlyInProject = byProject.filter((w) => !clientIds.has(w.id));
    if (onlyInClient.length === 0 && onlyInProject.length === 0) {
      console.log("✓ Both queries return the same set of items.");
    } else {
      console.log("⚠ MISMATCH between queries:");
      if (onlyInClient.length > 0) {
        console.log(`  In client query but not project query: ${onlyInClient.map((w) => w.id).join(", ")}`);
      }
      if (onlyInProject.length > 0) {
        console.log(`  In project query but not client query: ${onlyInProject.map((w) => w.id).join(", ")}`);
      }
    }
  }

  // ── Section D: "code handoff" + date = 2026-04-28 ─────
  console.log("\n═══════════════════════════════════════════");
  console.log("D. CODE HANDOFF + APRIL 28 ITEMS");
  console.log("═══════════════════════════════════════════");

  const codeHandoff = allWeekItems.filter(
    (w) => w.title.toLowerCase().includes("code handoff")
  );
  console.log(`\n"code handoff" matches: ${codeHandoff.length}`);
  for (const w of codeHandoff) {
    const projName = w.projectId ? (projectMap.get(w.projectId)?.name ?? "???") : "(no project)";
    const clientName = w.clientId ? (clientMap.get(w.clientId)?.name ?? "???") : "(no client)";
    console.log(`  id: ${w.id}`);
    console.log(`  title: ${w.title}`);
    console.log(`  date: ${w.date ?? "(null)"}`);
    console.log(`  category: ${w.category}`);
    console.log(`  clientId: ${w.clientId ?? "(null)"} → ${clientName}`);
    console.log(`  projectId: ${w.projectId ?? "(null)"} → ${projName}`);
    console.log(`  updatedAt: ${w.updatedAt}`);
    console.log("");
  }

  const april28 = allWeekItems.filter((w) => w.date === "2026-04-28");
  console.log(`Week items with date = 2026-04-28: ${april28.length}`);
  for (const w of april28) {
    const projName = w.projectId ? (projectMap.get(w.projectId)?.name ?? "???") : "(no project)";
    const clientName = w.clientId ? (clientMap.get(w.clientId)?.name ?? "???") : "(no client)";
    console.log(`  id: ${w.id}`);
    console.log(`  title: ${w.title}`);
    console.log(`  category: ${w.category}`);
    console.log(`  clientId: ${w.clientId ?? "(null)"} → ${clientName}`);
    console.log(`  projectId: ${w.projectId ?? "(null)"} → ${projName}`);
    console.log(`  updatedAt: ${w.updatedAt}`);
    console.log("");
  }

  // ── Section E: Updates History (Bonterra, Apr 8–10) ───
  console.log("═══════════════════════════════════════════");
  console.log("E. UPDATES HISTORY — BONTERRA, APR 8–10");
  console.log("═══════════════════════════════════════════");

  if (bonterraId) {
    const startDate = new Date("2026-04-08T00:00:00Z");
    const endDate = new Date("2026-04-10T23:59:59Z");

    const rows = await db
      .select()
      .from(updates)
      .where(
        and(
          eq(updates.clientId, bonterraId),
          gte(updates.createdAt, startDate),
          lte(updates.createdAt, endDate)
        )
      );

    // Sort by createdAt ascending
    rows.sort((a, b) => new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime());

    console.log(`\nFound ${rows.length} update(s) for Bonterra between Apr 8–10:\n`);
    for (const r of rows) {
      console.log(`  id: ${r.id}`);
      console.log(`  updatedBy: ${r.updatedBy ?? "(null)"}`);
      console.log(`  updateType: ${r.updateType ?? "(null)"}`);
      console.log(`  previousValue: ${r.previousValue ?? "(null)"}`);
      console.log(`  newValue: ${r.newValue ?? "(null)"}`);
      console.log(`  summary: ${r.summary ?? "(null)"}`);
      console.log(`  createdAt: ${r.createdAt}`);
      console.log("");
    }
  } else {
    console.log("Skipped — Bonterra client not found.");
  }

  console.log("═══════════════════════════════════════════");
  console.log("DONE — read-only diagnostic complete.");
  console.log("═══════════════════════════════════════════");
}

run().catch((err) => {
  console.error("Script failed:", err);
  process.exit(1);
});
