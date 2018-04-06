#!/usr/bin/env node

let release = require('.')
let slurm = require('slurm')
let huey = require('huey')

let ver
let args = slurm({
  U: true,
  R: true,
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
    } else if (!args.R) {
      fatal('Please specify a version or release type')
    }
  }
} else if (args.P) {
  ver = 'pre' + ver
}

if (ver && args.R) {
  fatal('-R must be used alone')
}

try {
  release(process.cwd(), ver, {
    log: console.log,
    rebase: !!args.R,
    unclean: !!args.U,
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
