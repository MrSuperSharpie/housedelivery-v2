const ERROR_MSG = 'Please include the city and province so Vero can identify the correct jurisdiction and inspector region.'

export function validateSiteAddressFormat(address: string): string | null {
  const parts = address.trim().split(',').map(p => p.trim())
  if (parts.length < 3) return ERROR_MSG

  const [street, city, ...rest] = parts
  const province = rest.join(',').trim()

  // Street must contain at least one digit and one alpha character
  if (!/\d/.test(street) || !/[a-zA-Z]/.test(street)) return ERROR_MSG

  // City must be non-empty and contain at least one alpha character
  if (!city || !/[a-zA-Z]/.test(city)) return ERROR_MSG

  // Province must be BC, B.C., or British Columbia (case-insensitive)
  if (!/^(bc|b\.c\.|british\s+columbia)$/i.test(province)) return ERROR_MSG

  return null
}
