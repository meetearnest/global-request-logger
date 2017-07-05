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
            prepareNpmEnv ()
          },
          "Docker:Verify": {
            prepareDockerEnv ()
          }
        )
      }
    }
    stage("Display ENV data") {
      steps {
        printEnvSorted ()
      }
    }
    stage("Run all unit tests") {
      steps {
        sh "./scripts/ci/test"
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
