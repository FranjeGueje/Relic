import { makeListenerCaller, makeHandlerInvoker } from '../ipc'

export const isRuntimeInstalled = makeHandlerInvoker('isRuntimeInstalled')
export const downloadRuntime = makeHandlerInvoker('downloadRuntime')
export const showItemInFolder = makeListenerCaller('showItemInFolder')

export const wine = {
  isValidVersion: makeHandlerInvoker('wine.isValidVersion')
}
