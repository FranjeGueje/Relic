import { useContext } from 'react'
import GameContext from '../../GameContext'
import { useTranslation } from 'react-i18next'

const Description = () => {
  const { t } = useTranslation('gamepage')
  const { gameExtraInfo } = useContext(GameContext)

  const description =
    gameExtraInfo?.about?.shortDescription ||
    gameExtraInfo?.about?.description ||
    t('generic.noDescription', 'No description available')

  return <div className="summary">{description}</div>
}

export default Description
