/**
 * Script to run some checks against translations
 *
 * run with `pnpm lint-translations`
 *
 * It can flag:
 * - empty strings
 * - translations in language file that are not present in `en` file
 * - translations that add content between indexed content-less tags
 *   like `<1></1>` in `en` file but with content in the translation
 * - translations missing content-less tags that are present in `en`
 *   file, like a translation missing a `<2></2>` tag
 * - keys that are a string in one file and an object in the other
 *
 * It shows a list with the different results of the checks, language
 * and keys compared.
 */

import { readdirSync, readFileSync } from 'fs'
import { join } from 'path'

// there are many extra keys in translation files without a matching
// key in the english file
//
// this is not really a problem so these messages are ignored by default
const printExtraTransations = false

const localesPath = './public/locales'

// Read a file as JSON
function readFile(fileName: string, language: string) {
  try {
    return JSON.parse(
      readFileSync(join(localesPath, language, fileName + '.json')).toString()
    )
  } catch (error) {
    console.log(error)
    return null
  }
}

// Read the 3 files for a given language
function readFiles(language: string) {
  return {
    gamepage: readFile('gamepage', language),
    login: readFile('login', language),
    translation: readFile('translation', language)
  }
}

const enFiles = readFiles('en')
let processingLanguage = ''
let processingFile = ''

// Run checks in string from translation against original in english file
function checkStringValueAgainstEnglish(
  trValue: string,
  enValue: string,
  parent?: string
) {
  if (trValue === '') {
    console.log(
      `Empty translation for ${processingLanguage}.${processingFile}.${parent}`
    )
    return
  }

  const i18nTags = enValue.match(/<(\d+)><\/\1>/)
  if (i18nTags) {
    // check content-less tags like `<1></1>`
    const invalidTags: string[] = []
    const matches = [...enValue.matchAll(/<(\d+)><\/\1>/g)]
    matches.forEach((ma) => {
      const str = ma[0]
      if (!trValue.includes(str)) {
        invalidTags.push(str)
      }
    })

    if (invalidTags.length) {
      console.log(
        `Missing content in translation, <X></X> tags not matching original for ${processingLanguage}.${processingFile}.${parent}.\nExpected ${enValue}\nGot: ${trValue}\n\n`
      )
    }
  }
}

// Recursive function traversing objects
function checkValueAgainstEnglish(
  trValue: string | object,
  enValue: string | object,
  parent?: string
) {
  if (typeof enValue === 'undefined') {
    if (printExtraTransations) {
      console.log(
        `Extra translation not present in english for ${processingLanguage}.${processingFile}.${parent}`
      )
    }
    return
  }

  if (typeof trValue === 'string' && typeof enValue === 'string') {
    checkStringValueAgainstEnglish(trValue, enValue, parent)
    return
  }

  // A key cannot be a string in one file and an object in the other: i18next
  // would resolve it as a leaf in one language and as a namespace in another.
  // Reporting it beats crashing while trying to compare the two.
  if (typeof trValue !== typeof enValue) {
    const describe = (value: unknown) =>
      typeof value === 'string' ? 'a string' : 'an object'
    console.log(
      `Type mismatch for ${processingLanguage}.${processingFile}.${parent}: english has ${describe(enValue)}, translation has ${describe(trValue)}`
    )
    return
  }

  for (const key in trValue) {
    checkValueAgainstEnglish(trValue[key], enValue[key], `${parent}.${key}`)
  }
}

// entry point to check a single translation file
function checkFileAgainstEnglish(translations: object) {
  for (const key in translations) {
    checkValueAgainstEnglish(
      translations[key],
      enFiles[processingFile][key],
      key
    )
  }
}

// entry point to check a single language
function checkLanguage(language: string) {
  const langFiles = readFiles(language)

  for (const file in langFiles) {
    const content = langFiles[file]
    if (!content) continue

    processingFile = file
    checkFileAgainstEnglish(content)
  }
}

// loop through all translations and compare to english
readdirSync(localesPath).forEach((dir) => {
  if (dir === 'en') return

  processingLanguage = dir
  checkLanguage(dir)
})
