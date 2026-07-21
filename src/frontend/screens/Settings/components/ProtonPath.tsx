import { useTranslation } from 'react-i18next'
import useSetting from 'frontend/hooks/useSetting'
import { InfoBox, PathSelectionBox } from 'frontend/components/UI'
import { hasHelp } from 'frontend/hooks/hasHelp'

const ProtonPath = () => {
  const { t } = useTranslation()

  hasHelp(
    'protonPath',
    t('setting.proton-path'),
    <p>
      {t(
        'help.content.protonPath',
        'Path to the GE-Proton directory used by umu-launcher to create prefixes.'
      )}
    </p>
  )
  const [protonPath, setProtonPath] = useSetting('protonPath', '')

  return (
    <>
      <PathSelectionBox
        type="directory"
        onPathChange={setProtonPath}
        path={protonPath}
        pathDialogTitle={t('box.proton-path')}
        pathDialogDefaultPath={protonPath}
        label={t('setting.proton-path')}
        htmlId="proton_path"
        noDeleteButton
      />
      <InfoBox text={t('settings.advanced.details')}>
        <p>
          {t(
            'setting.proton-path-info',
            'Used to generate UMU prefixes and prepare Steam integrations.'
          )}
        </p>
      </InfoBox>
    </>
  )
}

export default ProtonPath
