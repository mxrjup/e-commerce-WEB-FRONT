import '@testing-library/jest-dom/vitest'
import { cleanup, configure } from '@testing-library/react'
import { afterEach } from 'vitest'

// Les findBy* attendent 3 s au lieu d'1 : une page chargee a part (la fiche produit et son editeur)
// met plus d'une seconde a arriver la premiere fois sur une machine chargee.
configure({ asyncUtilTimeout: 3000 })

afterEach(() => {
  cleanup()
})
