import { useContext } from 'react'
import { useTranslation } from 'react-i18next'
import ContextProvider from 'frontend/state/ContextProvider'
import { SelectField } from '..'
import { MenuItem } from '@mui/material'

export const defaultThemes: Record<string, string> = {
  midnightMirage: 'Midnight Mirage',
  cyberSpaceOasis: 'Cyberspace Oasis',
  cyberSpaceOasisAlt: 'Cyberspace Oasis Classic',
  'high-contrast': 'High Contrast',
  'old-school': 'Old School Relic',
  dracula: 'Dracula',
  marine: 'Marine',
  'marine-classic': 'Marine Classic',
  zombie: 'Zombie',
  'zombie-classic': 'Zombie Classic',
  'nord-light': 'Nord Light',
  'nord-dark': 'Nord Dark',
  gruvbox_dark: 'Gruvbox Dark',
  sweet: 'Sweet'
}

export const ThemeSelector = () => {
  const { theme, setTheme } = useContext(ContextProvider)
  const { t } = useTranslation()

  return (
    <SelectField
      htmlId="theme_selector"
      label={t('setting.select_theme', 'Select Theme')}
      onChange={(event) => setTheme(event.target.value)}
      value={theme}
    >
      {Object.keys(defaultThemes).map((key) => (
        <MenuItem key={key} value={key}>
          {defaultThemes[key]}
        </MenuItem>
      ))}
    </SelectField>
  )
}
