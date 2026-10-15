export function formatMoney(value: string | null, currency = 'EUR'): string {
  if (value === null || value === '') return '—'
  return new Intl.NumberFormat('fr-FR', { style: 'currency', currency }).format(Number(value))
}

export function formatDate(value: string | null): string {
  if (!value) return '—'
  return new Intl.DateTimeFormat('fr-FR', { dateStyle: 'short', timeStyle: 'short' }).format(new Date(value))
}
