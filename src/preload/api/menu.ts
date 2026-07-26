import { makeHandlerInvoker } from '../ipc'

export const moveInstall = makeHandlerInvoker('moveInstall')
export const changeInstallPath = makeHandlerInvoker('changeInstallPath')
