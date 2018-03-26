#!/usr/bin/env node

let release = require('.')
let slurm = require('slurm')
let huey = require('huey')

let ver
let args = slurm({
  P: true,
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
    if (args.P) {
      ver = 'prerelease'
    } else {
      fatal('Please specify a version or release type')
    }
  }
} else if (args.P) {
  ver = 'pre' + ver
}

try {
  release(process.cwd(), ver, {
    log: console.log,
  })
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
