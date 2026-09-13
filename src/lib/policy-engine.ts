/**
 * Policy Engine — OPA-style Declarative Rules
 * 
 * Evaluates a set of claims (from a Verifiable Credential) against
 * a declarative JSON policy attached to an asset or resource.
 * 
 * If swapped out later, this design maps 1:1 onto Open Policy Agent (OPA) / Rego,
 * but runs natively in TypeScript for this demo to avoid complex Docker setups.
 * 
 * @module
 */

export interface PolicyRule {
  /** The claim field to check (e.g., "clearanceLevel", "department") */
  field: string;
  /** The comparison operator */
  operator: 'equals' | 'contains' | 'gte' | 'lte' | 'in' | 'exists';
  /** The expected value */
  value: any;
  /** If true, failing this rule denies access. If false, it's advisory/soft. */
  required: boolean;
}

export interface Policy {
  id: string;
  name: string;
  description: string;
  rules: PolicyRule[];
  /** Default effect if all required rules pass */
  effect: 'allow' | 'deny';
  version: number;
}

export interface PolicyEvaluationResult {
  decision: 'allow' | 'deny';
  matchedRules: PolicyRule[];
  failedRules: PolicyRule[];
  reasoning: string;
}

/**
 * Evaluate claims against a policy.
 * 
 * @param claims The verified claims from the user's Verifiable Credential
 * @param policy The declarative policy protecting the resource
 * @returns The evaluation result including allow/deny decision and reasoning
 */
export function evaluatePolicy(
  claims: Record<string, any>,
  policy: Policy
): PolicyEvaluationResult {
  const matchedRules: PolicyRule[] = [];
  const failedRules: PolicyRule[] = [];

  for (const rule of policy.rules) {
    const claimValue = claims[rule.field];
    let matched = false;

    switch (rule.operator) {
      case 'exists':
        matched = claimValue !== undefined && claimValue !== null;
        break;
      case 'equals':
        matched = claimValue === rule.value;
        break;
      case 'contains':
        matched = typeof claimValue === 'string' && claimValue.includes(rule.value as string);
        break;
      case 'gte':
        matched = typeof claimValue === 'number' && claimValue >= (rule.value as number);
        break;
      case 'lte':
        matched = typeof claimValue === 'number' && claimValue <= (rule.value as number);
        break;
      case 'in':
        matched = Array.isArray(rule.value) && rule.value.includes(claimValue);
        break;
      default:
        matched = false; // Unknown operator = fail safe
    }

    if (matched) {
      matchedRules.push(rule);
    } else {
      failedRules.push(rule);
    }
  }

  // Check if any REQUIRED rules failed
  const failedRequired = failedRules.filter((r) => r.required);

  let decision: 'allow' | 'deny';
  let reasoning: string;

  if (failedRequired.length > 0) {
    decision = 'deny';
    const fields = failedRequired.map((r) => r.field).join(', ');
    reasoning = `Failed required policy checks on fields: ${fields}`;
  } else if (policy.effect === 'deny') {
    // If the policy is explicitly a blocklist/deny policy
    decision = 'deny';
    reasoning = `Policy base effect is DENY`;
  } else {
    decision = 'allow';
    reasoning = `All required policy checks passed (${matchedRules.length} rules matched)`;
  }

  return {
    decision,
    matchedRules,
    failedRules,
    reasoning,
  };
}
