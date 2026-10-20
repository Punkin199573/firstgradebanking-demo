import "server-only";

import { isValidRoutingNumber } from "@/lib/routing-number";

export function getConfiguredAppRoutingNumber(): string | undefined {
  const routingNumber = process.env.APP_ROUTING_NUMBER?.trim();
  if (!routingNumber) return undefined;

  if (!isValidRoutingNumber(routingNumber)) {
    throw new Error("APP_ROUTING_NUMBER must be a valid 9-digit routing number.");
  }

  return routingNumber;
}
