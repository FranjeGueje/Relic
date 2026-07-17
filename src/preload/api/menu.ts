import { makeHandlerInvoker, makeListenerCaller } from '../ipc'

export const removeShortcut = makeListenerCaller('removeShortcut')
export const addShortcut = makeListenerCaller('addShortcut')
export const moveInstall = makeHandlerInvoker('moveInstall')
export const changeInstallPath = makeHandlerInvoker('changeInstallPath')
export const shortcutsExists = makeHandlerInvoker('shortcutsExists')
