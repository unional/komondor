import { dirSync } from 'tmp'
import { findInstalledPlugins } from '.'
import { fixturePath } from '../util'

test('gets empty plugin list in empty folder', async () => {
  expect(await findInstalledPlugins(dirSync().name)).toEqual([])
})

test('find all installed plugins', async () => {
  const cwd = fixturePath('has-plugins')

  expect(await findInstalledPlugins(cwd)).toEqual([
    '@mocktomata/plugin-fixture-deep-link',
    '@mocktomata/plugin-fixture-dummy'
  ])
})
