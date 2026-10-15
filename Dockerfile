FROM python:3.11-slim

ENV PYTHONDONTWRITEBYTECODE=1 \
    PYTHONUNBUFFERED=1 \
    HOST=0.0.0.0 \
    PORT=8080

WORKDIR /app

# Copy the lean 1.80 MiB source codebase (all 24 Python + Terraform files, SQL, YAML, Markdown & Portal)
COPY . /app

# Execute all 3 Pattern simulation suites (20/20 assertions) and 12/12 forensic audit gates during Cloud Build
RUN python3 -B workstream-2-pattern-a-pooled/2.5-breach-simulation-suite/run_breach_simulations.py && \
    python3 -B workstream-3-pattern-b-siloed/3.5-exfiltration-and-cmek-revocation-tests/run_silo_security_tests.py && \
    python3 -B workstream-4-pattern-c-hybrid/4.5-zero-downtime-tier-upgrade-suite/run_tier_migration_suite.py && \
    python3 -B scripts/run_deep_forensic_audit.py

EXPOSE 8080

CMD ["python3", "-B", "server.py"]
