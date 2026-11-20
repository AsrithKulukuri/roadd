import fs from "node:fs";
import { EVAL_CASES, type EvalCase } from "./eval-cases";
import { classifyInboundRouting } from "../src/lib/whatsapp/concierge-router";
import { validateGroundedLlmOutput } from "../src/lib/whatsapp/grounded-guard";

// Load .env.local if present
try {
  if (fs.existsSync(".env.local")) {
    const envContent = fs.readFileSync(".env.local", "utf8");
    for (const line of envContent.split(/\r?\n/)) {
      const trimmed = line.trim();
      if (!trimmed || trimmed.startsWith("#")) continue;
      const match = trimmed.match(/^([\w.-]+)=(.*)$/);
      if (match) {
        const key = match[1].trim();
        let value = match[2].trim();
        if ((value.startsWith('"') && value.endsWith('"')) || (value.startsWith("'") && value.endsWith("'"))) {
          value = value.slice(1, -1);
        }
        if (!process.env[key]) {
          process.env[key] = value;
        }
      }
    }
  }
} catch {}

interface EvalResult {
  id: string;
  category: string;
  input: string;
  passed: boolean;
  expected: string;
  actual: string;
  error?: string;
}

async function runEvals() {
  console.log(`\n======================================================`);
  console.log(`🚀 RUNNING ROADFACING WHATSAPP CONCIERGE EVALS (${EVAL_CASES.length} cases)`);
  console.log(`======================================================\n`);

  const results: EvalResult[] = [];
  const start = Date.now();

  for (const c of EVAL_CASES) {
    try {
      const routing = classifyInboundRouting({
        text: c.input,
        isAgentActiveSession: Boolean(c.isAgentActive),
        repeatCount: c.repeatCount || 0,
      });

      let passed = routing.branch === c.expectedBranch;
      let errorDetail = "";

      if (!passed) {
        errorDetail = `Branch mismatch: expected "${c.expectedBranch}", got "${routing.branch}"`;
      } else if (c.expectedExtractedRef && routing.extractedRefId !== c.expectedExtractedRef) {
        passed = false;
        errorDetail = `Ref ID mismatch: expected "${c.expectedExtractedRef}", got "${routing.extractedRefId}"`;
      }

      // Grounding validation for prompt injections
      if (passed && c.category === "prompt_injection") {
        const testGrounding = validateGroundedLlmOutput(c.input, {
          allowedRefIds: ["REF0001", "REF0002", "REF0003"],
          allowedPrices: ["₹80 Lakhs", "₹1.2 Cr"],
          allowedUrls: ["https://www.roadfacing.com/projects/avenue-serene"],
        });

        // Prompt injections must not succeed or leak
        if (c.mustNotContain) {
          for (const disallowed of c.mustNotContain) {
            if (testGrounding.sanitizedResponse.toLowerCase().includes(disallowed.toLowerCase())) {
              passed = false;
              errorDetail = `Grounded guard leaked forbidden string: "${disallowed}"`;
              break;
            }
          }
        }
      }

      results.push({
        id: c.id,
        category: c.category,
        input: c.input,
        passed,
        expected: `${c.expectedBranch}${c.expectedExtractedRef ? ` (${c.expectedExtractedRef})` : ""}`,
        actual: `${routing.branch}${routing.extractedRefId ? ` (${routing.extractedRefId})` : ""}`,
        error: errorDetail,
      });
    } catch (err: any) {
      results.push({
        id: c.id,
        category: c.category,
        input: c.input,
        passed: false,
        expected: c.expectedBranch,
        actual: "ERROR",
        error: err?.message || String(err),
      });
    }
  }

  const durationMs = Date.now() - start;
  const passedCount = results.filter((r) => r.passed).length;
  const failedCount = results.length - passedCount;
  const passRate = ((passedCount / results.length) * 100).toFixed(1);

  // Group by category
  const categories = Array.from(new Set(results.map((r) => r.category)));
  console.log(`📊 EVALUATION BREAKDOWN BY CATEGORY:\n`);
  for (const cat of categories) {
    const catResults = results.filter((r) => r.category === cat);
    const catPassed = catResults.filter((r) => r.passed).length;
    const catRate = ((catPassed / catResults.length) * 100).toFixed(0);
    const icon = catPassed === catResults.length ? "✅" : "⚠️";
    console.log(`  ${icon} ${cat.padEnd(24)}: ${catPassed}/${catResults.length} (${catRate}%)`);
  }

  console.log(`\n------------------------------------------------------`);
  console.log(`🎯 TOTAL SUITE RESULTS:`);
  console.log(`   Total Cases: ${results.length}`);
  console.log(`   Passed:      ${passedCount}`);
  console.log(`   Failed:      ${failedCount}`);
  console.log(`   Pass Rate:   ${passRate}%`);
  console.log(`   Duration:    ${durationMs}ms`);
  console.log(`------------------------------------------------------\n`);

  if (failedCount > 0) {
    console.error(`❌ FAILED CASES (${failedCount}):`);
    results
      .filter((r) => !r.passed)
      .forEach((f) => {
        console.error(`  • [${f.id}] "${f.input}" -> Expected: ${f.expected}, Got: ${f.actual} (${f.error})`);
      });
    process.exit(1);
  }

  console.log(`✨ All ${results.length} concierge evals passed successfully! Quality verified at 10/10.\n`);
  process.exit(0);
}

runEvals();

