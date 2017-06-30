set -euo pipefail
IFS=$'\n\t'

function prep_for_ci {
  : ${JENKINS_HOME?These scripts are meant to be run in CI}
  CI="JenkinsCI"
}

prep_for_ci
