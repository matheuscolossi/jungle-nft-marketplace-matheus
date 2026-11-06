const SCALE = 10n ** 18n;
/** Usa wei para preservar a precisão dos valores em ETH. */
export function toWei(value: string): bigint {
  if (!/^\d+(?:\.\d{1,18})?$/.test(value))
    throw new Error("Invalid ETH decimal");
  const [whole, fraction = ""] = value.split(".");
  return BigInt(whole) * SCALE + BigInt(fraction.padEnd(18, "0"));
}
export function fromWei(value: bigint): string {
  const sign = value < 0n ? "-" : "";
  const amount = value < 0n ? -value : value;
  const fraction = (amount % SCALE)
    .toString()
    .padStart(18, "0")
    .replace(/0+$/, "");
  return `${sign}${amount / SCALE}${fraction ? `.${fraction}` : ""}`;
}
export function addEth(...values: string[]): string {
  return fromWei(values.reduce((sum, value) => sum + toWei(value), 0n));
}
export function multiplyEth(value: string, quantity: number): string {
  if (!Number.isSafeInteger(quantity) || quantity < 0)
    throw new Error("Invalid quantity");
  return fromWei(toWei(value) * BigInt(quantity));
}
export function formatEth(value: string): string {
  return `${value} ETH`;
}
