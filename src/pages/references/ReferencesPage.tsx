import { Box, Tab, Tabs } from '@mui/material'
import { useSearchParams } from 'react-router'
import { PageHeader } from '../../components/PageHeader'
import { AttributesTab } from './AttributesTab'
import { BrandsTab } from './BrandsTab'
import { CategoriesTab } from './CategoriesTab'
import { UniversesTab } from './UniversesTab'
import { VatRatesTab } from './VatRatesTab'

const TABS = [
  { key: 'marques', label: 'Marques', panel: <BrandsTab /> },
  { key: 'categories', label: 'Catégories', panel: <CategoriesTab /> },
  { key: 'univers', label: 'Univers', panel: <UniversesTab /> },
  { key: 'tva', label: 'TVA', panel: <VatRatesTab /> },
  { key: 'attributs', label: 'Attributs', panel: <AttributesTab /> },
] as const

/**
 * C19: the reference lists the product form picks from. The open tab is in
 * the address (?onglet=tva), so a link or a reload lands on the same one.
 */
export function ReferencesPage() {
  const [params, setParams] = useSearchParams()
  const current = TABS.find((tab) => tab.key === params.get('onglet')) ?? TABS[0]

  return (
    <>
      <PageHeader
        title="Référentiels"
        description="Les marques, catégories, univers, taux de TVA et attributs proposés dans les fiches produit."
      />
      <Box sx={{ borderBottom: 1, borderColor: 'divider', mb: 3 }}>
        <Tabs
          value={current.key}
          onChange={(_, key: string) => setParams({ onglet: key }, { replace: true })}
          variant="scrollable"
          allowScrollButtonsMobile
          aria-label="Référentiels"
        >
          {TABS.map((tab) => (
            <Tab key={tab.key} value={tab.key} label={tab.label} id={`onglet-${tab.key}`} aria-controls={`panneau-${tab.key}`} />
          ))}
        </Tabs>
      </Box>
      <Box role="tabpanel" id={`panneau-${current.key}`} aria-labelledby={`onglet-${current.key}`}>
        {current.panel}
      </Box>
    </>
  )
}
