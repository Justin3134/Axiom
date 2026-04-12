import { clsx, type ClassValue } from "clsx"
import { twMerge } from "tailwind-merge"

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs))
}

// Patterns that indicate a coding/runtime execution failure rather than a
// scientific result (inconclusive/negative finding from the AI analyzer).
const EXECUTION_ERROR_PATTERNS = [
  /experiment failed to execute/i,
  /ModuleNotFoundError/i,
  /ImportError/i,
  /library not (found|installed)/i,
  /No module named/i,
  /not available in sandbox/i,
  /unresolvable syntax error/i,
  /generated code has/i,
  /Python3 not available/i,
  /sandbox.*failed/i,
  /Traceback \(most recent/i,
  /SyntaxError:/i,
  /NameError:/i,
  /AttributeError:/i,
  /TypeError:/i,
  /ValueError:/i,
  /RuntimeError:/i,
  /OSError:/i,
  /FileNotFoundError:/i,
  /PermissionError:/i,
  /TimeoutError:/i,
  /ConnectionError:/i,
  /^ERROR:/m,
  /Agent failed:/i,
]

/**
 * Returns true when a hypothesis failure was caused by a coding/runtime
 * execution error rather than a genuine scientific negative result.
 * When raw_output is absent the experiment never ran — always execution failure.
 */
export function isExecutionFailure(
  failureReason: string | null,
  rawOutput: string | null
): boolean {
  if (!failureReason && rawOutput === null) return true
  if (!failureReason) return false
  // No raw output means the agent crashed before execution
  if (rawOutput === null || rawOutput === "") return true
  return EXECUTION_ERROR_PATTERNS.some((re) => re.test(failureReason))
}
