# ── Stage 1: resolve & cache dependencies ────────────────────────────────────
FROM eclipse-temurin:21-jdk-alpine AS deps

WORKDIR /app

# Copy wrapper first so Gradle itself is cached as a layer
COPY gradlew ./
COPY gradle/wrapper ./gradle/wrapper
RUN chmod +x gradlew

# Resolve dependencies in a separate layer so source changes don't invalidate them
COPY build.gradle settings.gradle ./
RUN ./gradlew dependencies --no-daemon --quiet 2>&1 | tail -1 || true

# ── Stage 2: build fat JAR ────────────────────────────────────────────────────
FROM deps AS builder

COPY src ./src
RUN ./gradlew bootJar --no-daemon -x test

# ── Stage 3: production runner ────────────────────────────────────────────────
FROM eclipse-temurin:21-jre-alpine AS runner

WORKDIR /app

# Non-root user for security
RUN addgroup --system --gid 1001 spring \
 && adduser  --system --uid 1001 --ingroup spring spring

COPY --from=builder --chown=spring:spring \
    /app/build/libs/restart-0.0.1-SNAPSHOT.jar app.jar

USER spring

EXPOSE 8080

# JAVA_OPTS can be overridden at runtime: -e JAVA_OPTS="-Xmx512m"
ENV JAVA_OPTS=""

ENTRYPOINT ["sh", "-c", "java $JAVA_OPTS -jar app.jar"]
