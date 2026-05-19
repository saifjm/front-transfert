pipeline {
    agent any
     tools {
            nodejs 'node'
        }
    stages {
        stage('git checkout') {
            steps {
                git branch: 'bna',
                    url: 'https://github.com/Societe-le-Monde-Informatique-SMI/SWF-FE.git',
                    credentialsId: '4a1707e9-45e7-4a7e-8a38-1b468b8b594f'
                echo 'checkout stage'
            }
        }

          stage('Build') {
                      steps {
                          sh 'npm install --force'
                          sh 'npm run build -- --output-path=dist/adminlte'
                      }
                  }

        stage('Build Docker') {
            steps {
                sh 'docker build -t swift876/swift-maven:FrontBna3.9 .'
            }
        }

        stage('Docker Login') {
            steps {
                withCredentials([usernamePassword(credentialsId: 'my-dockerhub-creds', usernameVariable: 'DOCKERHUB_USERNAME', passwordVariable: 'DOCKERHUB_PASSWORD')]) {
                    sh "docker login -u ${DOCKERHUB_USERNAME} -p ${DOCKERHUB_PASSWORD}"
                }
            }
        }

        stage('Docker Push') {
            steps {
                sh 'docker push swift876/swift-maven:FrontBna3.9'
            }
        }
    }
}
