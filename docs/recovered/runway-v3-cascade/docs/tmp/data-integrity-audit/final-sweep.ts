import { createRunwayDb } from "../../../scripts/lib/run-script";
import { sql } from "drizzle-orm";
async function main() {
  const { db } = createRunwayDb();
  const convergixId = (await db.run(sql.raw(`select id from clients where slug = 'convergix'`))).rows[0] as unknown as {id: string};
  console.log(`# Convergix final sweep\n`);

  const pl = (await db.run(sql.raw(`select name, status, owner, estimated_value, waiting_on, notes from pipeline_items where client_id = '${convergixId.id}'`))).rows;
  console.log(`## Convergix pipeline items: ${pl.length}`);
  for (const r of pl as unknown as Record<string, unknown>[]) console.log(`  - ${r.name} [${r.status}] ${r.estimated_value ?? "∅"}`);

  const covered = [
    "272e7eef7f554c03947d9b103d5dee80", // AUTOMATE Booth
    "0157c4232d5c4db58333bb744",        // Big Win Template
    "51f39e5cdfbe446992aa155d6",        // Brand Guide v2
    "68a4ee3791b24d72abb5afc62",        // Certifications Page
    "65b2cac113a048f592867a71c",        // Corporate Collateral
    "135c5a61d5c343b1b5b39fe08",        // Events Page Updates
    "3d5215f4a3964f38a1b2afda0",        // Fanuc Award
    "0e4214c60728476db177f4de1",        // Industry Vertical Campaigns
    "4b5bf2f0805a44b1ad30d8a83",        // Life Sciences Brochure (completed)
    "0c208308ff48427092776c0da",        // New Capacity
    "7c8478dcc53542d0ba263db48",        // Organic Social Playbook (completed)
    "1923fc1a36524a9c810a73763",        // Rockwell Auto Co-Marketing
    "394f9e5e5b864c2eb2260f468",        // Rockwell PartnerNetwork Article
    "f391dff5ceaf45279a807ace9",        // Social Content 12/mo
    "c568d7a62cc4488cbe42bcf5e",        // Social Media Templates (completed)
    "c0935359406e40709a0790372",        // Texas Instruments Article
  ];
  const all = (await db.run(sql.raw(`select id, name, status from projects where client_id = '${convergixId.id}'`))).rows as unknown as Record<string,unknown>[];
  const missing = all.filter(p => !covered.includes(p.id as string));
  console.log(`\n## Convergix Projects NOT in covered list: ${missing.length}`);
  for (const m of missing) console.log(`  - ${m.name} [${m.status}] id=${m.id}`);

  const orphan = (await db.run(sql.raw(`select w.id, w.title, w.project_id from week_items w where w.client_id = '${convergixId.id}' and w.project_id not in (${all.map(p=>`'${p.id}'`).join(",")})`))).rows;
  console.log(`\n## Convergix week_items orphaned from a Project: ${orphan.length}`);
  for (const o of orphan as unknown as Record<string,unknown>[]) console.log(`  - ${o.title} project_id=${o.project_id}`);
}
main().catch(e => { console.error(e); process.exit(1); });
