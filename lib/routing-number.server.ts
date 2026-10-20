import "server-only";

export function getConfiguredAppRoutingNumber(): string | undefined {
  const routingNumber = process.env.APP_ROUTING_NUMBER?.trim();
  if (!routingNumber) return undefined;

  if (!/^\d{9}$/.test(routingNumber)) {
    throw new Error("APP_ROUTING_NUMBER must contain exactly 9 digits.");
  }

  return routingNumber;
}
