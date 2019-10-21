import path from 'path'
import fs from 'fs'

export function gitRootDir(cwd: string) {
  const parts = cwd.split(path.sep)
  const sepLength = path.sep.length
  while (parts.length) {
    if (fs.existsSync(path.join(cwd, '.git'))) {
      return cwd
    }

    const part = parts.pop()!
    cwd = cwd.slice(0, -(part.length + sepLength))
  }
}
