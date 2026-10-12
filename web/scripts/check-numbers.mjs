// Fails when a measured number no longer matches the line it cites in context.md.
import { readFileSync } from 'node:fs'
import { fileURLToPath } from 'node:url'
import { numbers } from '../lib/numbers.ts'
import { checkNumbers } from '../lib/checkNumbers.ts'

const read = (file) => readFileSync(fileURLToPath(new URL(`../../${file}`, import.meta.url)), 'utf8')
const errors = checkNumbers(numbers, read)
if (errors.length) {
  console.error(errors.join('\n'))
  process.exit(1)
}
console.log(`check-numbers: ${numbers.length} numbers match their sources`)
