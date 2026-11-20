import ArrowBackOutlined from '@mui/icons-material/ArrowBackOutlined'
import {
  Alert, Autocomplete, Box, Button, CircularProgress, Grid, MenuItem, Paper, Stack, TextField,
} from '@mui/material'
import { useCallback, useEffect, useRef, useState } from 'react'
import { Link as RouterLink, useBlocker, useNavigate, useParams } from 'react-router'
import { ApiError } from '../../api/client'
import { errorMessage } from '../../api/errors'
import { json, useApi } from '../../api/useApi'
import { useList } from '../../api/useList'
import { useLoad } from '../../api/useLoad'
import { ConfirmDialog } from '../../components/ConfirmDialog'
import { useNotify } from '../../components/Notifications'
import { PageHeader } from '../../components/PageHeader'
import { RichTextEditor } from '../../components/RichTextEditor'
import { formatPercent } from '../../lib/format'
import { slugify } from '../../lib/slugs'
import { monoFont } from '../../theme'
import { NotFoundPage } from '../NotFoundPage'
import { PATHS, type Brand, type Category, type Universe, type VatRate } from '../references/api'
import { categoryTree } from '../references/categoryTree'
import { PRODUCTS, productPath, type ProductDetail, type ProductStatus } from './api'
import { Panel, StatusPanel, VariantsPanel } from './ProductPanels'
import {
  emptyForm, formOf, hasProductErrors, LIMITS, requestOf, sameForm, translations, validate, type ProductForm,
} from './productForm'
import { SpecificationsField } from './SpecificationsField'

type References = { brands: Brand[]; categories: Category[]; universes: Universe[]; vatRates: VatRate[] }

/**
 * C16: the sheet of a product, at /products/nouveau to create one and at
 * /products/{id} to edit it. One route for both: after a creation, only the
 * product loads again, not the lists its fields pick from.
 */
export function ProductFormPage() {
  const { id = '' } = useParams()
  const creating = id === 'nouveau'
  const productId = /^\d{1,15}$/.test(id) ? Number(id) : null
  const api = useApi()

  const loadProduct = useCallback(
    () => (productId === null ? Promise.resolve(null) : api<ProductDetail>(productPath(productId))),
    [api, productId],
  )
  const product = useLoad(loadProduct)
  const brands = useList(useCallback(() => api<Brand[]>(PATHS.brands), [api]))
  const categories = useList(useCallback(() => api<Category[]>(PATHS.categories), [api]))
  const universes = useList(useCallback(() => api<Universe[]>(PATHS.universes), [api]))
  const vatRates = useList(useCallback(() => api<VatRate[]>(PATHS.vatRates), [api]))

  if (!creating && productId === null) return <NotFoundPage />

  const failure = [product, brands, categories, universes, vatRates].find((state) => state.error)?.error
  if (failure) {
    const gone = failure instanceof ApiError && failure.status === 404
    return (
      <Stack spacing={2} sx={{ alignItems: 'flex-start' }}>
        <BackToList />
        <Alert
          severity="error"
          action={!gone && (
            <Button color="inherit" size="small" onClick={() => [product, brands, categories, universes, vatRates].forEach((state) => void state.reload())}>
              Réessayer
            </Button>
          )}
        >
          {gone ? 'Ce produit n’existe pas, ou plus : il a peut-être été supprimé.' : errorMessage(failure, translations)}
        </Alert>
      </Stack>
    )
  }

  const references = brands.items && categories.items && universes.items && vatRates.items
    ? { brands: brands.items, categories: categories.items, universes: universes.items, vatRates: vatRates.items }
    : null
  if (product.loading || !references || (!creating && !product.data)) {
    return <Box sx={{ display: 'flex', justifyContent: 'center', py: 8 }}><CircularProgress aria-label="Chargement du produit" /></Box>
  }
  return <ProductEditor key={productId ?? 'nouveau'} initial={product.data} references={references} />
}

function BackToList() {
  return (
    <Button component={RouterLink} to="/products" color="secondary" startIcon={<ArrowBackOutlined />} sx={{ alignSelf: 'flex-start' }}>
      Produits
    </Button>
  )
}

function ProductEditor({ initial, references }: { initial: ProductDetail | null; references: References }) {
  const api = useApi()
  const notify = useNotify()
  const navigate = useNavigate()
  const defaultVat = references.vatRates.find((rate) => rate.defaultRate)?.id ?? null

  const [product, setProduct] = useState(initial)
  const [saved, setSaved] = useState<ProductForm>(() => (initial ? formOf(initial) : emptyForm(defaultVat)))
  const [form, setForm] = useState<ProductForm>(saved)
  const [submitted, setSubmitted] = useState(false)
  const [saving, setSaving] = useState(false)
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [deleting, setDeleting] = useState(false)
  const [deleteError, setDeleteError] = useState<string | null>(null)

  const editing = product !== null
  const dirty = !sameForm(form, saved)
  const errors = submitted ? validate(form, editing) : {}
  const set = useCallback(<K extends keyof ProductForm>(key: K, value: ProductForm[K]) => {
    setForm((current) => ({ ...current, [key]: value }))
  }, [])
  const setDescription = useCallback((html: string) => set('description', html), [set])

  // Apres un enregistrement ou une suppression, on quitte la page sans rien demander.
  const leaving = useRef(false)
  const blocker = useBlocker(({ currentLocation, nextLocation }) =>
    !leaving.current && dirty && currentLocation.pathname !== nextLocation.pathname)
  useEffect(() => {
    if (!dirty) return
    const warn = (event: BeforeUnloadEvent) => event.preventDefault()
    window.addEventListener('beforeunload', warn)
    return () => window.removeEventListener('beforeunload', warn)
  }, [dirty])

  async function save() {
    setSubmitted(true)
    if (hasProductErrors(validate(form, editing))) {
      setError('Le formulaire contient des erreurs : elles sont indiquées sous les champs concernés.')
      return
    }
    setSaving(true)
    setError(null)
    try {
      const body = requestOf(form)
      const result = product
        ? await api<ProductDetail>(productPath(product.id), json('PUT', body))
        : await api<ProductDetail>(PRODUCTS, json('POST', body))
      const next = formOf(result)
      setProduct(result)
      setSaved(next)
      setForm(next)
      setSubmitted(false)
      if (product) {
        notify('Produit enregistré.')
      } else {
        notify('Produit créé, en brouillon.')
        leaving.current = true
        navigate(`/products/${result.id}`, { replace: true })
      }
    } catch (e) {
      setError(errorMessage(e, translations))
    } finally {
      setSaving(false)
    }
  }

  async function changeStatus(status: ProductStatus) {
    if (!product) return
    setBusy(true)
    setError(null)
    try {
      const result = await api<ProductDetail>(`${productPath(product.id)}/status`, json('PUT', { status }))
      setProduct(result)
      notify(status === 'ARCHIVE' ? 'Produit archivé : il n’est plus en vente.' : 'Produit publié : il est en vente.')
    } catch (e) {
      setError(errorMessage(e, translations))
    } finally {
      setBusy(false)
    }
  }

  async function remove() {
    if (!product) return
    try {
      await api<void>(productPath(product.id), { method: 'DELETE' })
    } catch (e) {
      setDeleteError(errorMessage(e, translations))
      return
    }
    notify('Brouillon supprimé.')
    leaving.current = true
    navigate('/products')
  }

  const derivedSlug = slugify(form.title.trim())
  const rate = references.vatRates.find((vat) => String(vat.id) === form.vatRateId)?.rate ?? null
  const chosenUniverses = references.universes.filter((universe) => form.universeIds.includes(universe.id))

  return (
    <Box component="form" noValidate onSubmit={(event) => { event.preventDefault(); void save() }}>
      <BackToList />
      <PageHeader
        title={editing ? saved.title : 'Nouveau produit'}
        description={editing ? `Fiche ${saved.slug}` : 'La fiche générique : ce que toutes les variantes ont en commun.'}
        action={(
          <Button type="submit" variant="contained" loading={saving} disabled={editing && !dirty}>
            {editing ? 'Enregistrer' : 'Créer le produit'}
          </Button>
        )}
      />
      {error && <Alert severity="error" sx={{ mb: 3 }} onClose={() => setError(null)}>{error}</Alert>}

      {/* Deux colonnes seulement sur grand ecran : en dessous, les encadres de droite coupaient leurs listes. */}
      <Grid container spacing={3}>
        <Grid size={{ xs: 12, lg: 8 }}>
          <Stack spacing={3}>
            <Paper variant="outlined" sx={{ p: 2.5 }}>
              <Stack spacing={2.5}>
                <TextField
                  label="Titre"
                  required
                  value={form.title}
                  onChange={(event) => set('title', event.target.value)}
                  error={Boolean(errors.title)}
                  helperText={errors.title ?? 'Le nom du produit tel qu’il apparaît dans la boutique.'}
                  slotProps={{ htmlInput: { maxLength: LIMITS.title } }}
                />
                <TextField
                  label="Slug"
                  value={form.slug}
                  onChange={(event) => set('slug', event.target.value)}
                  error={Boolean(errors.slug)}
                  helperText={errors.slug ?? (editing
                    ? 'Il fait partie de l’adresse publique : le changer casse les liens déjà partagés.'
                    : derivedSlug ? `Laissé vide, il sera « ${derivedSlug} ».` : 'Laissé vide, il sera tiré du titre.')}
                  slotProps={{ htmlInput: { maxLength: 120, style: { fontFamily: monoFont } } }}
                />
                <RichTextEditor
                  label="Description"
                  value={saved.description}
                  onChange={setDescription}
                  error={Boolean(errors.description)}
                  helperText={errors.description ?? 'Affichée sur la fiche de la boutique. Gras, italique, intertitres, listes et liens.'}
                />
              </Stack>
            </Paper>
            <Paper variant="outlined" sx={{ p: 2.5 }}>
              <SpecificationsField
                rows={form.specifications}
                onChange={(rows) => set('specifications', rows)}
                categoryId={form.categoryId}
                errors={errors}
              />
            </Paper>
          </Stack>
        </Grid>

        <Grid size={{ xs: 12, lg: 4 }}>
          <Stack spacing={3}>
            <StatusPanel
              product={product}
              dirty={dirty}
              busy={busy}
              onStatus={(status) => void changeStatus(status)}
              onDelete={() => {
                setDeleteError(null)
                setDeleting(true)
              }}
            />
            <Panel title="Classement">
              <Stack spacing={2.5}>
                <TextField
                  select
                  label="Marque"
                  required
                  value={form.brandId}
                  onChange={(event) => set('brandId', event.target.value)}
                  error={Boolean(errors.brandId)}
                  helperText={errors.brandId}
                >
                  {references.brands.map((brand) => <MenuItem key={brand.id} value={String(brand.id)}>{brand.name}</MenuItem>)}
                </TextField>
                <TextField
                  select
                  label="Catégorie"
                  required
                  value={form.categoryId}
                  onChange={(event) => set('categoryId', event.target.value)}
                  error={Boolean(errors.categoryId)}
                  helperText={errors.categoryId}
                >
                  {categoryTree(references.categories).map((row) => (
                    <MenuItem key={row.category.id} value={String(row.category.id)}>{row.path.join(' › ')}</MenuItem>
                  ))}
                </TextField>
                <TextField
                  select
                  label="TVA"
                  required
                  value={form.vatRateId}
                  onChange={(event) => set('vatRateId', event.target.value)}
                  error={Boolean(errors.vatRateId)}
                  helperText={errors.vatRateId ?? 'S’applique à toutes les variantes.'}
                >
                  {references.vatRates.map((vat) => (
                    <MenuItem key={vat.id} value={String(vat.id)}>{vat.label} ({formatPercent(vat.rate)})</MenuItem>
                  ))}
                </TextField>
                <Autocomplete
                  multiple
                  options={references.universes}
                  value={chosenUniverses}
                  getOptionLabel={(universe) => universe.name}
                  isOptionEqualToValue={(option, value) => option.id === value.id}
                  onChange={(_, chosen) => set('universeIds', chosen.map((universe) => universe.id))}
                  renderInput={(params) => (
                    <TextField {...params} label="Univers" error={Boolean(errors.universeIds)} helperText={errors.universeIds ?? 'Facultatif : Gaming, Télétravail…'} />
                  )}
                />
              </Stack>
            </Panel>
            <VariantsPanel product={product} ratePercent={rate} />
          </Stack>
        </Grid>
      </Grid>

      <ConfirmDialog
        open={deleting}
        title="Supprimer le brouillon ?"
        confirmLabel="Supprimer"
        onConfirm={remove}
        onClose={() => setDeleting(false)}
        error={deleteError}
      >
        Le brouillon <strong>{saved.title}</strong> et ses variantes seront supprimés définitivement.
      </ConfirmDialog>
      <ConfirmDialog
        open={blocker.state === 'blocked'}
        title="Quitter sans enregistrer ?"
        confirmLabel="Quitter"
        onConfirm={async () => blocker.proceed?.()}
        onClose={() => blocker.reset?.()}
      >
        Les modifications de cette fiche seront perdues.
      </ConfirmDialog>
    </Box>
  )
}
