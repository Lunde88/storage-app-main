/** Sanitises a VRN: strips non-alphanumerics and uppercases */
export function sanitiseRegNumber(input: string): string {
  return input.replace(/[^a-zA-Z0-9]/g, "").toUpperCase();
}

/** Checks VRN is valid (UK VRNs: 1–8 alphanumeric) */
export function isValidRegNumber(vrn: string): boolean {
  return /^[A-Z0-9]{1,8}$/.test(vrn);
}
