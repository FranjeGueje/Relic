const dialog = jest.requireActual('../dialog')

dialog.showDialogBoxModalAuto = jest.fn()
dialog.askQuestion = jest.fn()

module.exports = dialog
export {}
