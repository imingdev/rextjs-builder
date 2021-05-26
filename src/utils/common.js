import fs from 'fs'

export const findPageFile = (filePath, extensions = [], defaultFilePath) => {
  for (let i = 0, length = extensions.length; i < length; i++) {
    const ext = extensions[i]
    const fullFilePath = `${filePath}.${ext}`
    if (fs.existsSync(fullFilePath)) return fullFilePath
  }

  return defaultFilePath
}