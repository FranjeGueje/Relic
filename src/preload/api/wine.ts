import { makeListenerCaller, makeHandlerInvoker } from '../ipc'

export const showItemInFolder = makeListenerCaller('showItemInFolder')

export const wine = {
  isValidVersion: makeHandlerInvoker('wine.isValidVersion')
}
