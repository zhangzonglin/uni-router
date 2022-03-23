const defData =  require('./jest.default.config')
const tsJestConfig = {
  preset: 'ts-jest',
  globals: {
    'ts-jest': {
      tsconfig: 'test/tsconfig.json',
    },
  },
}
console.log('开始 ts 测试')
module.exports = {
  ...defData,
  ...tsJestConfig
}
