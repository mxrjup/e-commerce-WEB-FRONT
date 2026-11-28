import { TableCell, TextField } from '@mui/material'
import { useMemo } from 'react'
import { useApi } from '../../api/useApi'
import { check, maxLength, optional, optionalUrl } from '../../lib/validation'
import { PATHS, resource, type Brand, type BrandRequest } from './api'
import { MonoCell, NameCell, TextCell } from './cells'
import { NamedFields } from './NamedFields'
import { emptyNamedForm, namedFormOf, slugToSend, validateNamed, type NamedForm } from './namedForm'
import { ReferenceTab, type FieldsProps, type ReferenceConfig } from './ReferenceTab'
import { Thumbnail } from './Thumbnail'

type BrandForm = NamedForm & { logoUrl: string }

function BrandFields({ form, errors, set, editing }: FieldsProps<Brand, BrandForm>) {
  return (
    <>
      <NamedFields form={form} errors={errors} set={set} editing={editing !== null} />
      <TextField
        label="Adresse du logo"
        value={form.logoUrl}
        onChange={(event) => set('logoUrl', event.target.value)}
        error={Boolean(errors.logoUrl)}
        helperText={errors.logoUrl ?? 'Facultatif. Une image accessible en ligne, en https.'}
        type="url"
        slotProps={{ htmlInput: { maxLength: 500 } }}
      />
    </>
  )
}

export function BrandsTab() {
  const api = useApi()
  const config = useMemo<ReferenceConfig<Brand, BrandForm, BrandRequest>>(() => {
    const brands = resource<Brand, BrandRequest>(api, PATHS.brands)
    return {
      words: {
        table: 'Marques',
        count: (n) => (n > 1 ? `${n} marques` : `${n} marque`),
        empty: 'Aucune marque pour l’instant.',
        add: 'Ajouter une marque',
        createTitle: 'Nouvelle marque',
        created: 'Marque créée.',
        updated: 'Marque enregistrée.',
        deleted: 'Marque supprimée.',
        deleteTitle: 'Supprimer la marque ?',
      },
      load: brands.list,
      create: brands.create,
      update: brands.update,
      remove: brands.remove,
      name: (brand) => brand.name,
      search: (brand, query) => brand.name.toLowerCase().includes(query) || brand.slug.includes(query),
      head: (
        <>
          <TableCell>Marque</TableCell>
          <TableCell>Slug</TableCell>
          <TableCell>Description</TableCell>
        </>
      ),
      columns: 3,
      cells: (brand) => (
        <>
          <NameCell leading={<Thumbnail src={brand.logoUrl} name={brand.name} />}>{brand.name}</NameCell>
          <MonoCell>{brand.slug}</MonoCell>
          <TextCell text={brand.description} />
        </>
      ),
      emptyForm: () => ({ ...emptyNamedForm, logoUrl: '' }),
      formOf: (brand) => ({ ...namedFormOf(brand), logoUrl: brand.logoUrl ?? '' }),
      validate: (form, editing, items) => ({
        ...validateNamed(form, editing, items, true),
        logoUrl: check(form.logoUrl, maxLength(500), optionalUrl) ?? undefined,
      }),
      request: (form) => ({
        name: form.name.trim(),
        slug: slugToSend(form),
        description: optional(form.description),
        logoUrl: optional(form.logoUrl),
      }),
      Fields: BrandFields,
      deleteText: (brand) => <>La marque <strong>{brand.name}</strong> sera supprimée définitivement.</>,
      inUse: (brand) => `« ${brand.name} » est encore la marque de produits du catalogue : changez leur marque avant de la supprimer.`,
    }
  }, [api])

  return <ReferenceTab config={config} />
}
