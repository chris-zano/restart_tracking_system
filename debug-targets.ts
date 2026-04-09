/**
 * Debug weekly targets structure
 */

import { parseWeeklyTargetFile } from "./src/parsers/weekly-targets-parser";

async function main() {
  const result = await parseWeeklyTargetFile("./weekly_targets/week_1.csv", 1);

  if (!result.success) {
    console.error("Failed:", result.error);
    return;
  }

  console.log("Week 1 Target:");
  console.log("KCs count:", result.data.kcs.length);
  console.log("Labs count:", result.data.labs.length);
  console.log("\nFirst 3 KCs:");
  result.data.kcs.slice(0, 3).forEach((kc, i) => {
    console.log(`  ${i + 1}. ${kc.name}`);
    console.log(`     canvasId: ${kc.canvasId}`);
    console.log(`     weeklyTargetId: ${kc.weeklyTargetId}`);
  });

  console.log("\nAll KC canvas IDs:");
  const canvasIds = result.data.kcs.map((kc) => kc.canvasId);
  console.log(canvasIds);

  console.log("\nUnique canvas IDs:");
  const uniqueIds = new Set(canvasIds);
  console.log([...uniqueIds]);
  console.log(`Count: ${uniqueIds.size}`);
}

main().catch(console.error);
