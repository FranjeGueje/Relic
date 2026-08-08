import { LogPrefix, logWarning } from 'backend/logger'
import { dialog } from 'electron'
import { ButtonOptions, DialogType } from 'common/types'
import { getMainWindow } from '../main_window'
import { sendFrontendMessage } from '../ipc'

function showDialogBoxModalAuto(props: {
  event?: Electron.IpcMainInvokeEvent
  title: string
  message: string
  type: DialogType
  buttons?: Array<ButtonOptions>
}) {
  if (props.event) {
    props.event.sender.send(
      'showDialog',
      props.title,
      props.message,
      props.type,
      props.buttons
    )
  } else {
    try {
      sendFrontendMessage(
        'showDialog',
        props.title,
        props.message,
        props.type,
        props.buttons
      )
    } catch (error) {
      logWarning(['showDialogBoxModalAuto:', error], LogPrefix.Backend)

      const window = getMainWindow()

      switch (props.type) {
        case 'ERROR':
          dialog.showErrorBox(props.title, props.message)
          break
        default:
          if (!window) {
            break
          }
          dialog.showMessageBox(window, {
            title: props.title,
            message: props.message,
            buttons: props.buttons?.map((button) => button.text) || []
          })
          break
      }
    }
  }
}

/**
 * Ask the user a question and resolve to the index of the button they picked.
 *
 * Unlike `showDialogBoxModalAuto`, this cannot be a fire-and-forget frontend
 * event: the caller blocks on the answer. Inverting it to the frontend needs a
 * request/response channel, so for now it stays a native dialog — but it lives
 * here so that Electron's `dialog` is confined to this module.
 */
async function askQuestion(props: {
  title: string
  message: string
  buttons: string[]
}): Promise<number> {
  const window = getMainWindow()
  const options: Electron.MessageBoxOptions = {
    type: 'question',
    title: props.title,
    message: props.message,
    buttons: props.buttons
  }

  const { response } = window
    ? await dialog.showMessageBox(window, options)
    : await dialog.showMessageBox(options)

  return response
}

export { showDialogBoxModalAuto, askQuestion }
