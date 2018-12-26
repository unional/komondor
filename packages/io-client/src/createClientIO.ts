import fetch from 'cross-fetch';
import { IOClientOptions, SpecRecord } from './interfaces';
import { getServerInfo } from './getServerInfo';
import 'systemjs/dist/system'

export async function createClientIO(options?: IOClientOptions) {
  const info = await getServerInfo(options)
  return {
    async readSpec(id: string) {
      const response = await this._deps.fetch(createSpecURL(info.url, id))
      return response.json()
    },
    async writeSpec(id: string, record: SpecRecord) {
      const response = await this._deps.fetch(createSpecURL(info.url, id), { method: 'POST', body: JSON.stringify(record) })
      return response.ok
    },
    async readScenario(id: string) {
      const response = await this._deps.fetch(createScenarioURL(info.url, id))
      return response.json()
    },
    async writeScenario(id: string, record: any) {
      const response = await this._deps.fetch(createScenarioURL(info.url, id), { method: 'POST', body: JSON.stringify(record) })
      return response.ok
    },
    async loadConfig() {
      const response = await this._deps.fetch(createConfigURL(info.url))
      return response.json()
    },
    async loadPlugin(name: string) {
      const url = `${info.url}/komondor/plugins/${name}`
      const response = await this._deps.fetch(url)
      console.info('plugin is available from server', await response.text())
      // TODO: SystemJS timeout here.
      // return System.import(url)
    },
    _deps: { fetch }
  }
}

function createSpecURL(url: string, id: string) {
  return `${url}/komondor/spec/${id}`
}
function createScenarioURL(url: string, id: string) {
  return `${url}/komondor/scenario/${id}`
}

function createConfigURL(url: string) {
  return `${url}/komondor/config`
}