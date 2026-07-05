const fs = require('fs');
const readline = require('readline');

const logPath = 'C:\\Users\\rajat\\.gemini\\antigravity-ide\\brain\\21bf11e9-b371-41ff-aa44-7b087d54d2a8\\.system_generated\\logs\\transcript_full.jsonl';

async function main() {
  const fileStream = fs.createReadStream(logPath);
  const rl = readline.createInterface({
    input: fileStream,
    crlfDelay: Infinity
  });

  for await (const line of rl) {
    try {
      const obj = JSON.parse(line);
      // Look for the browser subagent step containing console logs
      if (line.includes('capture_browser_console_logs') && obj.content) {
        console.log(`=== Found console logs in step index: ${obj.step_index} ===`);
        console.log(obj.content);
      }
    } catch (e) {
      // ignore
    }
  }
}

main();
