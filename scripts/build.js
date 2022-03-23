const path = require('path')
const fs = require('fs')
const zlib = require('zlib')
const uglify = require('uglify-es')
const rollup = require('rollup')
const {getBabelOutputPlugin} = require('@rollup/plugin-babel')
const package =require('../package.json')
const version = process.env.VERSION || package.version

const resolve = (_path) => path.resolve(__dirname, '../', _path)

const OUT_FILE_NAME = 'index'
const EXPORT_NAME = 'GowinyUniRouter'
const banner = `/**
  * ${package.alias} v${version}
  * (c) 2022-present gowiny
  * @license MIT
  */`


const babelOutputConfMap = {
  modern:{
  },
  iife:{
  },
  legacy:{

  }
}


function genConfig(opts) {
  const output = Object.assign({
    banner,
    name: EXPORT_NAME,
    exports: 'named',
    globals: {
      qs: 'qs',
      '@gowiny/js-utils':'GowinyUtils'
    }
  },babelOutputConfMap.defalut,babelOutputConfMap[opts.confName],{
    file:opts.file,
    format:opts.format
  })
  delete output.confName
  const config = {
    plugins: [
      getBabelOutputPlugin({
        allowAllFormats: true,
        presets: ['@babel/preset-env']
      })
    ],
    external: ['qs','@gowiny/js-utils'],
    input: resolve('lib/index.js'),
    output
  }
  return config
}

const builds = [

  {
    file: resolve(`dist/${OUT_FILE_NAME}.global.js`),
    format: 'iife',
    confName:'iife',
    env: 'development',
  },
  {
    file: resolve(`dist/${OUT_FILE_NAME}.global.prod.js`),
    format: 'iife',
    confName:'iife',
    env: 'production',
    minify: true,
  },
  {
    file: resolve(`dist/${OUT_FILE_NAME}.cjs.js`),
    format: 'cjs',
  },
  {
    file: resolve(`dist/${OUT_FILE_NAME}.esm.js`),
    format: 'esm',
  },
  {
    file: resolve(`dist/${OUT_FILE_NAME}.esm-browser.js`),
    format: 'esm',
    confName:'modern',
    env: 'development',
  },
  {
    file: resolve(`dist/${OUT_FILE_NAME}.esm-browser.prod.js`),
    format: 'esm',
    confName:'modern',
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
    const minifyResult = uglify.minify(code, {
      output: {
        preamble: output.banner,
        ascii_only: true,
      },
    })
    const minified = minifyResult.code
    return write(output.file, minified, true)
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
}



function write(dest, code, zip) {
  //console.log('---------------')
  //console.log('code',JSON.stringify(code))
  //console.log('---------------')

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
