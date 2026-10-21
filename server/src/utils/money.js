/**
 * Decimal-safe monetary arithmetic utilities using integer-cents arithmetic.
 * Prevents IEEE 754 binary floating-point precision inaccuracies (e.g. 0.1 + 0.2 !== 0.3).
 */

const toCents = (val) => {
  const num = Number(val);
  if (!Number.isFinite(num)) {
    throw new Error("Invalid monetary amount");
  }
  return Math.round(num * 100);
};

const fromCents = (cents) => {
  return (cents / 100).toFixed(2);
};

const addMoney = (a, b) => {
  return fromCents(toCents(a) + toCents(b));
};

const subtractMoney = (a, b) => {
  return fromCents(toCents(a) - toCents(b));
};

const compareMoney = (a, b) => {
  return toCents(a) === toCents(b);
};

module.exports = {
  toCents,
  fromCents,
  addMoney,
  subtractMoney,
  compareMoney,
};
