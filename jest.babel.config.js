const defData =  require('./jest.default.config')
const babelJestConfig = {
  transform: {
    '^.+\\.[t|j]sx?$': ['babel-jest', { configFile: './test/babel.config.js' }],
  },
}
console.log('开始 babel 测试')
module.exports = {
  ...defData,
  ...babelJestConfig
}
