# Utilise une image de base avec JDK
FROM eclipse-temurin:17-jdk-jammy

# Définir le répertoire de travail
WORKDIR /app

# Copier le fichier .war dans l'image
COPY target/workflow-0.0.1-SNAPSHOT.jar /app/app.jar

# Expose le port utilisé par l'application
EXPOSE 8843

# Commande pour exécuter l'application
ENTRYPOINT ["java", "-jar", "/app/app.jar"]
