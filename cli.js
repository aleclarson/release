#!/usr/bin/env node

let release = require('.')
let slurm = require('slurm')
let huey = require('huey')

let ver, pre = false
let args = slurm({
  P: () => pre = true,
  p: () => (ver = 'patch', true),
  m: () => (ver = 'minor', true),
  M: () => (ver = 'major', true),
  pre: 'P',
  patch: 'p',
  minor: 'm',
  major: 'M',
})

if (!ver) {
  ver = args[0]
  if (!ver) {
    if (pre) {
      ver = 'prerelease'
    } else {
      fatal('Please specify a version or release type')
    }
  }
} else if (pre) {
  ver = 'pre' + ver
}

try {
  release(process.cwd(), ver)
} catch(err) {
  if (err.code) {
    fatal(err.message)
  } else {
    console.log(huey.red(err.stack))
  }
}

function fatal(msg) {
  console.log(huey.red('Error: ') + msg)
  process.exit()
}
