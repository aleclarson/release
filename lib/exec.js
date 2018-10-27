const cp = require('child_process')

function exec(cmd, args, cwd) {
  let res = cp.spawnSync(cmd, args, { cwd })
  let err = res.error
  if (!err) {
    let str = res.stderr.toString().trim()
    if (!str) str = res.stdout.toString().trim()
    if (res.status > 0) {
      err = new Error(str.replace(/^error:\s*/i, ''))
    } else {
      return str
    }
  }
  throw err
}

module.exports = exec
