#!/bin/bash

set -e -u

NAME=`cat package.json | python -c "import json,sys;obj=json.load(sys.stdin);print obj['name']"`
DC_RUN_PARAMS="--service-ports"
DEV_IMAGE=dev

# Executables
DC=docker-compose
D=docker

# Exported docker name
D_NPM_IMAGE=bravissimolabs/generate-npm-authtoken

R="\x1B[1;31m"
G="\x1B[1;32m"
W="\x1B[0m"

function info {
  echo -e "${G}${1}${W}"
}

function error {
  echo -e "${R}${1}${W}"
}

function helptext {
  echo "Usage: ./go <command>"
  echo ""
  echo "Available commands are:"
  echo "    help              Show this help"
  echo "    exec              Execute any command inside the dev image"
  echo "    nuke              Destroy all your running containers"
  echo "    prepush           Run prepush checks (e.g. test, lint)"
  echo "    test              Run all tests"
  echo "    test:watch        Run tests in watch mode"
  echo "    install           Install dependencies"
  echo "    lint              Lint the repository"
  echo "    lint:fix          Lint in fix mode"
}

function cmd {
  shift
  info "Executing command in container"
  ${DC} run ${DEV_IMAGE} $@
}

function npm_run {
  eval ${DC} run -e NPM_CONFIG_LOGLEVEL=silent ${DEV_IMAGE} npm run $1
}

function pre_push {
  npm_run lint
  npm_run test
}

function precommit {
  npm_run test
}

# If we have a pre-commit hook and the pre-commit hook does not equal what we
# want it to equal for this project then back it up with a timestamped file
# name and create a new pre-commit hook.
function setup_hooks {
  if [ -f .git/hooks/pre-commit ]; then
    current_pre_commit_hook=$(cat .git/hooks/pre-commit)
    expected_pre_commit_hook=$'#!/bin/sh\n\n./go pre-commit'

    if [ "$current_pre_commit_hook" != "$expected_pre_commit_hook" ]; then
      mv .git/hooks/pre-commit .git/hooks/$(date '+%Y%m%d%H%M%S').pre-commit.old
    fi
  fi

  cat > .git/hooks/pre-commit <<EOS
#!/bin/sh

./go pre-commit
EOS
  chmod +x .git/hooks/pre-commit
}

function init {
  setup_hooks
  ${DC} run ${DEV_IMAGE} yarn install
  helptext
}

function nuke {
  read -p "🔥 💣 🔥 Are you sure you want to nuke all running containers? 🔥 💣 🔥 (y/n) " -n 1 -r
  if [[ $REPLY =~ ^[Yy]$ ]]
  then
    info "\n🔥 Stopping all running containers 🔥"
    ${DC} down
    info "\n🔥 Removing all associated images 🔥"
    [[ -n $(${D} images -q ${DEV_IMAGE}) ]] && ${D} rmi -f $(${D} images -q ${DEV_IMAGE})

    read -p "🔥 💣 🔥 Are you sure you want to remove your local node_modules for this project? 🔥 💣 🔥 (y/n) " -n 1 -r
    if [[ $REPLY =~ ^[Yy]$ ]]
    then
      info "\n🔥 Nuking your local node_modules 🔥"
      rm -rf node_modules dist
    fi
  fi
}

function _install {
  ${DC} run ${DEV_IMAGE} yarn install
}


[[ $@ ]] || { init; exit 0; }

case "${1}" in
  help) helptext
  ;;
  test) npm_run test
  ;;
  test:watch) npm_run test:watch
  ;;
  lint) npm_run lint
  ;;
  lint:fix) npm_run lint:fix
  ;;
  init) init
  ;;
  pre[-_]push|prepush) pre_push
  ;;
  pre[-_]commit) precommit
  ;;
  nuke) nuke
  ;;
  install) _install
  ;;
  exec) cmd $@
  ;;
  *)
    helptext
    exit 1
  ;;
esac
