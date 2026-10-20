export function isValidRoutingNumber(value: string): boolean {
  if (!/^\d{9}$/.test(value) || value === "000000000") return false;

  const digits = value.split("").map(Number);
  const checksum =
    3 * (digits[0] + digits[3] + digits[6]) +
    7 * (digits[1] + digits[4] + digits[7]) +
    digits[2] +
    digits[5] +
    digits[8];

  return checksum % 10 === 0;
}
