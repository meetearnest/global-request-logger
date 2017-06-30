#!/usr/bin/env groovy

@Library('jenkins-pipeline-library') _

pipeline {
  agent {
    label 'generic'
  }

  options {
    // Kill after 30 minutes
    timeout (time: 30, unit: 'MINUTES')
    // Display colors and format better
    ansiColor colorMapName: 'XTerm'
  }

  environment {
    CI = "Jenkins"
    NPM_TOKEN = credentials("NPM_TOKEN")
    DOCKER_LOGIN = credentials("DOCKER_LOGIN")
  }

  stages {
    stage("Prepare Build Environment") {
      steps {
        parallel (
          "NPM:Verify": {
            withEnv([
              "NPMRC_FILE=${HOME}/.npmrc"
            ]) {
              sh "cp ${NPMRC_FILE} ."
              sh "npm --version"
              sh "npm whoami"
            }
          },
          "Docker:Verify": {
            sh "docker --version"
            sh "docker info"
            sh "docker-compose --version"
            sh "docker-compose down" // Ensure environment is pristine
          }
        )
      }
    }
    stage("Display ENV data") {
      steps {
        printEnvSorted ''
      }
    }
    stage("Run all unit tests") {
      steps {
        sh "./scripts/ci/isolated"
      }
    }
    stage("Publish latest version") {
      when {
        branch "master"
      }
      steps {
        sh "./scripts/ci/publish"
      }
    }
  }
  post {
    always {
      echo "Nuke all artifacts"
      cleanAll "dev"
    }
  }
}
