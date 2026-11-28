import { Box, CircularProgress } from '@mui/material'
import { lazy, Suspense } from 'react'

const ProductFormPage = lazy(() => import('./ProductFormPage').then((module) => ({ default: module.ProductFormPage })))

/**
 * The product sheet carries the rich text editor (TipTap and ProseMirror,
 * about 500 kB): it is downloaded the first time a sheet opens, not with
 * the rest of the back-office.
 */
export function LazyProductFormPage() {
  return (
    <Suspense fallback={<Box sx={{ display: 'flex', justifyContent: 'center', py: 8 }}><CircularProgress aria-label="Chargement du produit" /></Box>}>
      <ProductFormPage />
    </Suspense>
  )
}
