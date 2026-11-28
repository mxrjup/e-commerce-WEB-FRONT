import { decimalPlaces, parseDecimal } from '../../lib/format'
import { check, email, maxLength, optional, optionalUrl, required, type Check } from '../../lib/validation'

/**
 * The shop settings (U05) of user-service: GET and PUT
 * /api/admin/store-settings, admins only. A PUT replaces everything.
 */
export type StoreSettings = {
  storeName: string
  contactEmail: string
  contactPhone: string | null
  supportHours: string | null
  postalAddress: string | null
  companyName: string
  siret: string | null
  vatNumber: string | null
  legalNotice: string | null
  termsUrl: string | null
  privacyPolicyUrl: string | null
  standardShippingFee: number
  expressShippingFee: number
  freeShippingThreshold: number
  minimumOrderAmount: number
  currency: string
  updatedAt: string | null
}

export type SettingsRequest = Omit<StoreSettings, 'updatedAt'>
export type SettingsKey = keyof SettingsRequest
export type SettingsForm = Record<SettingsKey, string>

type Kind = 'text' | 'long' | 'email' | 'url' | 'money' | 'currency' | 'siret'

export type Field = { key: SettingsKey; label: string; kind: Kind; required?: boolean; help?: string; max?: number }

/** An amount of numeric(10,2): never negative, two decimals, under a hundred million. */
const money: Check = (value) => {
  const amount = parseDecimal(value)
  if (amount === null) return 'Un montant, par exemple 4,99.'
  if (decimalPlaces(value) > 2) return 'Deux décimales au maximum.'
  if (amount >= 1e8) return 'Montant trop grand.'
  return null
}

const currency: Check = (value) => (/^[A-Za-z]{3}$/.test(value.trim()) ? null : 'Un code ISO de trois lettres, par exemple EUR.')

const siret: Check = (value) =>
  !value.trim() || /^\d{14}$/.test(value.replace(/\s/g, '')) ? null : '14 chiffres.'

/** The form, in sections. The text columns are varchar(255); SIRET and VAT number 32. */
export const SECTIONS: { title: string; description: string; fields: Field[] }[] = [
  {
    title: 'Boutique et contact',
    description: 'Ce que voient les clients : le nom de la boutique, et comment la joindre.',
    fields: [
      { key: 'storeName', label: 'Nom de la boutique', kind: 'text', required: true },
      { key: 'contactEmail', label: 'E-mail de contact', kind: 'email', required: true },
      { key: 'contactPhone', label: 'Téléphone', kind: 'text', max: 255 },
      { key: 'supportHours', label: 'Horaires du service client', kind: 'text', help: 'Par exemple « Du lundi au vendredi, 9 h – 18 h ».' },
      { key: 'postalAddress', label: 'Adresse postale', kind: 'long' },
    ],
  },
  {
    title: 'Informations légales',
    description: 'Les mentions obligatoires, reprises sur les factures et les pages légales.',
    fields: [
      { key: 'companyName', label: 'Raison sociale', kind: 'text', required: true },
      { key: 'siret', label: 'SIRET', kind: 'siret', max: 32 },
      { key: 'vatNumber', label: 'N° de TVA intracommunautaire', kind: 'text', max: 32 },
      { key: 'termsUrl', label: 'Adresse des CGV', kind: 'url' },
      { key: 'privacyPolicyUrl', label: 'Adresse de la politique de confidentialité', kind: 'url' },
      { key: 'legalNotice', label: 'Mentions légales', kind: 'long', max: 100_000 },
    ],
  },
  {
    title: 'Livraison et commande',
    description: 'Les frais de port et les montants qui s’appliquent au panier.',
    fields: [
      { key: 'standardShippingFee', label: 'Livraison standard', kind: 'money', required: true },
      { key: 'expressShippingFee', label: 'Livraison express', kind: 'money', required: true },
      { key: 'freeShippingThreshold', label: 'Livraison standard offerte dès', kind: 'money', required: true },
      { key: 'minimumOrderAmount', label: 'Montant minimum de commande', kind: 'money', required: true },
      { key: 'currency', label: 'Devise', kind: 'currency', required: true, help: 'Code ISO 4217, par exemple EUR.' },
    ],
  },
]

const FIELDS = SECTIONS.flatMap((section) => section.fields)

export function validate(form: SettingsForm): Partial<Record<SettingsKey, string>> {
  const errors: Partial<Record<SettingsKey, string>> = {}
  for (const field of FIELDS) {
    const checks: Check[] = [...(field.required ? [required] : []), maxLength(field.max ?? 255)]
    if (field.kind === 'email') checks.push(email)
    if (field.kind === 'url') checks.push(optionalUrl)
    if (field.kind === 'siret') checks.push(siret)
    if (field.kind === 'money') checks.push(money)
    if (field.kind === 'currency') checks.push(currency)
    const error = check(form[field.key], ...checks)
    if (error) errors[field.key] = error
  }
  return errors
}

/** Amounts are typed the French way: 4.99 shows as « 4,99 ». */
export function formOf(settings: StoreSettings): SettingsForm {
  const form = {} as SettingsForm
  for (const field of FIELDS) {
    const value = settings[field.key]
    form[field.key] = value === null || value === undefined ? ''
      : field.kind === 'money' ? (value as number).toFixed(2).replace('.', ',')
        : String(value)
  }
  return form
}

export function requestOf(form: SettingsForm): SettingsRequest {
  const text = (key: SettingsKey) => optional(form[key])
  const amount = (key: SettingsKey) => parseDecimal(form[key]) ?? 0
  return {
    storeName: form.storeName.trim(),
    contactEmail: form.contactEmail.trim(),
    contactPhone: text('contactPhone'),
    supportHours: text('supportHours'),
    postalAddress: text('postalAddress'),
    companyName: form.companyName.trim(),
    siret: optional(form.siret.replace(/\s/g, '')),
    vatNumber: optional(form.vatNumber.replace(/\s/g, '').toUpperCase()),
    legalNotice: text('legalNotice'),
    termsUrl: text('termsUrl'),
    privacyPolicyUrl: text('privacyPolicyUrl'),
    standardShippingFee: amount('standardShippingFee'),
    expressShippingFee: amount('expressShippingFee'),
    freeShippingThreshold: amount('freeShippingThreshold'),
    minimumOrderAmount: amount('minimumOrderAmount'),
    currency: form.currency.trim().toUpperCase(),
  }
}
