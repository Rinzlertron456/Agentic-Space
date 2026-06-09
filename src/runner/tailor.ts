import { tailorResume } from "@/lib/pythonBridge";

if (process.argv.length < 3) {
  console.error("usage: npm run runner:tailor -- <job-id>");
  process.exit(2);
}

const result = tailorResume(process.argv[2]);
console.log(JSON.stringify(result, null, 2));
