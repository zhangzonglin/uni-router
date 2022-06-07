const path = require('path')
const fs = require('fs-extra')
const zlib = require('zlib')
const terser = require('terser')
const rollup = require('rollup')
const {getBabelOutputPlugin} = require('@rollup/plugin-babel')
const package =require('../package.json')
const dateFormat = require("dateformat")

const version = process.env.VERSION || package.version

const resolve = (_path) => path.resolve(__dirname, '../', _path)

const OUT_FILE_NAME = 'index'
const EXPORT_NAME = `${package.exportName}`
const GLOBALS = package.lib && package.lib.globals
const EXTERNAL = package.lib && package.lib.external || []
if(GLOBALS){
  for(const key in GLOBALS){
    EXTERNAL.push(key)
  }
}

const banner = `/**
  * ${package.alias} v${version}
  * ${package.homepage}
  *
  * (c) 2022-present gowiny
  * @license MIT
  *
  * Date: ${dateFormat(new Date(),"UTC:yyyy-mm-dd'T'HH:MM:ss'Z'")}
  */`

const babelConfMap = {
  default:{},
  modern:{

  },
  esm_es5:{
    external:[/@babel\/runtime/],
    output:{
      plugins: [getBabelOutputPlugin({
        presets: ['@babel/preset-env'],
        plugins: [['@babel/plugin-transform-runtime', { useESModules: true }]]
      })]
    }
  },
  cjs:{
    external:[/@babel\/runtime/],
    output:{
      plugins: [getBabelOutputPlugin({
        presets: ['@babel/preset-env'],
        plugins: [['@babel/plugin-transform-runtime', { useESModules: false }]]
      })]
    }
  }
}


function genConfig(opts) {

  const conf = Object.assign({},
      babelConfMap.default,
      babelConfMap[opts.confName]
    )

  const output = Object.assign({},
    babelConfMap.default.output,
    conf.output,{
    banner,
    name: EXPORT_NAME,
    exports: 'named',
    globals: GLOBALS
  },{
    file:opts.file,
    format:opts.format
  })

  conf.output = output

  if(EXTERNAL && EXTERNAL.length > 0){
    let external = conf.external || []
    external = [...external,...EXTERNAL]
    conf.external = external
  }

  conf.input =  resolve('lib/index.js')
  return conf
}

const builds = [

  {
    file: resolve(`dist/${OUT_FILE_NAME}.global.js`),
    format: 'iife',
    confName:'modern',
    env: 'development',
  },
  {
    file: resolve(`dist/${OUT_FILE_NAME}.global.prod.js`),
    format: 'iife',
    confName:'modern',
    env: 'production',
    minify: true,
  },
  {
    file: resolve(`dist/${OUT_FILE_NAME}.cjs.js`),
    confName:'cjs',
    format: 'cjs',
    minify: true,
  },
  {
    file: resolve(`dist/${OUT_FILE_NAME}.esm.js`),
    confName:'modern',
    format: 'esm',
    minify: true,
  },
  {
    file: resolve(`dist/${OUT_FILE_NAME}.esm-browser.js`),
    format: 'esm',
    confName:'esm_es5',
    env: 'development',
  },
  {
    file: resolve(`dist/${OUT_FILE_NAME}.esm-browser.prod.js`),
    format: 'esm',
    confName:'esm_es5',
    env: 'production',
    minify: true,
  },
].map((options) => {
  return {
    config: genConfig(options),
    options,
  }
})

async function buildEntry(rollupConf, options) {

  const output = rollupConf.output
  const isMinify = options.minify
  const bundle = await rollup.rollup(rollupConf)
  const result = await bundle.generate(output)
  const { code } = result.output[0]
  if (isMinify) {
    const minified = await terser.minify(code, {
      output: {
        ascii_only: true,
      },
    })
    return write(output.file, minified.code, true)
  } else {
    return write(output.file, code)
  }
}



async function build(builds) {
  if (!fs.existsSync('dist')) {
    fs.mkdirSync('dist')
  }

  const total = builds.length
  for(let i=0;i<total;i++){
    const { config, options } = builds[i]
    try{
      await buildEntry(config, options)
    }catch(error){
      logError(error)
      throw error
    }
  }

  fs.copy('src/components','dist/components')
}

function write(dest, code, zip) {

  return new Promise((resolve, reject) => {
    function report(extra) {
      console.log(
        blue(path.relative(process.cwd(), dest)) +
          ' ' +
          getSize(code) +
          (extra || '')
      )
      resolve()
    }

    fs.writeFile(dest, code, (err) => {
      if (err) return reject(err)
      if (zip) {
        zlib.gzip(code, (err, zipped) => {
          if (err) return reject(err)
          report(' (gzipped: ' + getSize(zipped) + ')')
        })
      } else {
        report()
      }
    })
  })
}



function getSize(code) {
  return (code.length / 1024).toFixed(2) + 'kb'
}


function logError(e) {
  console.error(e)
}

function blue(str) {
  return '\x1b[1m\x1b[34m' + str + '\x1b[39m\x1b[22m'
}

build(builds)
