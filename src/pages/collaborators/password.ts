/** No 0/O, 1/l/I: the password is read aloud or copied by hand to the new collaborator. */
const ALPHABET = 'abcdefghijkmnpqrstuvwxyzABCDEFGHJKLMNPQRSTUVWXYZ23456789'

/**
 * A temporary password for a new account: 14 characters drawn with
 * crypto.getRandomValues, without modulo bias, with at least one digit.
 * Keycloak makes the person choose their own at the first login.
 */
export function temporaryPassword(length = 14): string {
  for (;;) {
    const chars: string[] = []
    while (chars.length < length) {
      const [byte] = crypto.getRandomValues(new Uint8Array(1))
      // 56 lettres : on ecarte les octets au-dela du dernier multiple entier, sinon les premieres sortiraient plus souvent.
      if (byte < Math.floor(256 / ALPHABET.length) * ALPHABET.length) chars.push(ALPHABET[byte % ALPHABET.length])
    }
    const password = chars.join('')
    if (/\d/.test(password)) return password
  }
}

/**
 * The realm's policy, `length(8) and notEmail and notUsername` (the login is
 * the e-mail), plus the 128 characters of the API.
 */
export function passwordError(password: string, email: string): string | null {
  if (!password) return 'Ce champ est obligatoire.'
  if (password.length < 8) return '8 caractères au minimum.'
  if (password.length > 128) return '128 caractères au maximum.'
  if (email.trim() && password.toLowerCase() === email.trim().toLowerCase()) return 'Il ne doit pas reprendre l’adresse e-mail.'
  return null
}
