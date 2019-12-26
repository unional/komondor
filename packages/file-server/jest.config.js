const base = require('../../jest.config.node-base')

module.exports = {
  ...base,
  displayName: 'file-server',
  moduleNameMapper: {
    '@mocktomata/(.*)': '<rootDir>/../$1/src'
  }
}
