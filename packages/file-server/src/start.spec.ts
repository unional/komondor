import { FileRepository } from '@mocktomata/io-fs'
import t from 'assert'
import a from 'assertron'
import fs from 'fs'
import fetch from 'node-fetch'
import path from 'path'
import { dirSync } from 'tmp'
import { PromiseValue } from 'type-plus'
import { start } from '.'
import { btoa } from './base64'

test('if a port is specified and not available, will throw an error', async () => {
  const runningServer = await start({ port: 3710 })
  const e = await a.throws<Error & Record<string, any>>(start({ port: Number(runningServer.info.port) }))
  await runningServer.stop()
  expect(e.code).toBe('EADDRINUSE')
})

describe('server behavior', () => {
  let server: PromiseValue<ReturnType<typeof start>>
  beforeAll(async () => {
    const cwd = dirSync().name
    fs.writeFileSync(path.join(cwd, 'package.json'), JSON.stringify({ mocktomata: { overrideMode: 'live', filePathFilter: 'file', specNameFilter: 'spec' } }))
    const repository = new FileRepository({ cwd })
    await repository.writeSpec('exist', '', '{ "spec": "exist" }')
    console.info(`Starting server at 3456`)
    server = await start({ cwd, port: 3456 })
  })
  afterAll(() => {
    return server.stop()
  })

  function buildUrl(path: string) {
    return `http://localhost:${server.info.port}/mocktomata/${path}`
  }

  test('get mocktomata info', async () => {
    const response = await fetch(buildUrl('info'))
    const actual = await response.text()

    // eslint-disable-next-line @typescript-eslint/no-var-requires
    const pjson = require('../package.json')
    t.strictEqual(actual, JSON.stringify({
      name: 'mocktomata',
      version: pjson.version,
      url: `http://localhost:${server.info.port}`,
    }))
  })
  test('get config', async () => {
    const response = await fetch(buildUrl('config'))
    const actual = await response.json()
    expect(actual).toEqual({ overrideMode: 'live', filePathFilter: 'file', specNameFilter: 'spec' })
  })
  test('read not exist spec gets 404', async () => {
    const response = await fetch(buildUrl(`specs/${buildId('not exist')}`))

    expect(response.status).toBe(404)
  })
  test('read spec', async () => {
    const response = await fetch(buildUrl(`specs/${buildId('exist')}`))

    expect(response.status).toBe(200)
    expect(await response.text()).toEqual('{ "spec": "exist" }')
  })

  test('write spec', async () => {
    const id = buildId('abc')
    const response = await fetch(buildUrl(`specs/${id}`), { method: 'POST', body: '{ a: 1 }' })
    expect(response.status).toBe(204)

    const actual = await (await fetch(buildUrl(`specs/${id}`))).text()

    expect(actual).toEqual('{ a: 1 }')
  })
})

function buildId(specName: string, specRelativePath = '') {
  return btoa(JSON.stringify({ specName, specRelativePath }))
}
