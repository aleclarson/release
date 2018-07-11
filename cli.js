#!/usr/bin/env node

let release = require('.')
let slurm = require('slurm')
let huey = require('huey')

slurm.error = fatal

let ver
let args = slurm({
  P: {type: 'boolean'},
  p: () => (ver = 'patch', true),
  m: () => (ver = 'minor', true),
  M: () => (ver = 'major', true),
  R: {type: 'boolean'},
  u: {type: 'boolean'},
  x: {list: true},
  h: true,
  help: true,
  pre: 'P',
  patch: 'p',
  minor: 'm',
  major: 'M',
  rebase: 'R',
  exclude: 'x',
  stash: 'u',
})

if (args._ == '--help' || args._ == '-h' || args._ == '') {
  const help = __dirname + '/help.md'
  console.log(require('fs').readFileSync(help, 'utf8'))
  process.exit()
}

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
    ignore: args.x,
    unclean: !!args.u,
  })
} catch(err) {
  if (err.code) {
    fatal(err.message)
  } else {
    console.log(huey.red(err.stack))
    process.exit(1)
  }
}

function fatal(msg) {
  console.log(huey.red('error: ') + msg)
  process.exit(1)
}
