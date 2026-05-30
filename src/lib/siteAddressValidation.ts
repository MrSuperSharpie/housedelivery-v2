const ERROR_MSG = 'Please include the city and province so Vero can identify the correct jurisdiction and inspector region.'

// Province tokens accepted (case-insensitive). Trailing dot allowed for "BC." and "B.C."
const PROVINCE_RE = /^(bc\.?|b\.c\.?|british\s+columbia)$/i

// Province at end of a space-only address (no commas), preceded by whitespace
const PROVINCE_SUFFIX_RE = /\s+(bc\.?|b\.c\.?|british\s+columbia)\s*$/i

function checkParts(street: string, city: string, province: string): boolean {
  return (
    /\d/.test(street) &&
    /[a-zA-Z]/.test(street) &&
    !!city &&
    /[a-zA-Z]/.test(city) &&
    PROVINCE_RE.test(province.trim())
  )
}

export function validateSiteAddressFormat(address: string): string | null {
  // Normalize: period+space → comma+space (e.g. "20015 Bypass. Langley, BC.")
  const normalized = address.trim().replace(/\.\s+/g, ', ')

  if (normalized.includes(',')) {
    // Comma path: address has commas — must satisfy 3-part comma-separated rule exactly.
    // No space-only fallback for comma-containing addresses (keeps "Poop, BC" rejected).
    const parts = normalized.split(',').map(p => p.trim())
    if (parts.length >= 3) {
      const [street, city, ...rest] = parts
      const province = rest.join(' ').trim()
      if (checkParts(street, city, province)) return null
    }
    return ERROR_MSG
  }

  // Space-only path: province at end, last word before province = city, rest = street.
  const suffixMatch = normalized.match(PROVINCE_SUFFIX_RE)
  if (suffixMatch) {
    const provinceStr = suffixMatch[1]
    const beforeProvince = normalized.slice(0, normalized.length - suffixMatch[0].length).trim()
    const lastSpace = beforeProvince.lastIndexOf(' ')
    if (lastSpace > 0) {
      const street = beforeProvince.slice(0, lastSpace).trim()
      const city = beforeProvince.slice(lastSpace + 1).trim()
      if (checkParts(street, city, provinceStr)) return null
    }
  }

  return ERROR_MSG
}
