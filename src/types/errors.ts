// Typed repository errors (docs/CODING_STANDARDS.md "Error Handling").
// UI layers catch these by name/instanceof and render specific UI
// (paywall modal, inline validation message) instead of a generic fallback.

export class ValidationError extends Error {
  constructor(message: string) {
    super(message);
    this.name = 'ValidationError';
  }
}

export class NotFoundError extends Error {
  constructor(entity: string, id: string) {
    super(`${entity} not found: ${id}`);
    this.name = 'NotFoundError';
  }
}

/**
 * Thrown when a free-tier limit is hit (docs/MONETIZATION.md). `reason`
 * identifies which limit, so the UI can show the right contextual paywall
 * copy (docs/USER_FLOWS.md Flow 5) rather than a generic upsell.
 */
export class PaywallRequiredError extends Error {
  readonly reason:
    | 'multi_currency'
    | 'subscription_limit'
    | 'historical_reports'
    | 'custom_category'
    | 'export';

  constructor(reason: PaywallRequiredError['reason'], message: string) {
    super(message);
    this.name = 'PaywallRequiredError';
    this.reason = reason;
  }
}
