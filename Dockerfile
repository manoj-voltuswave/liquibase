# POC: Liquibase with MySQL (free/community usage).
# As of Liquibase 5.0, DB drivers are not included by default; add via LPM.
# See: https://hub.docker.com/_/liquibase and Liquibase Docker docs.

FROM liquibase/liquibase:latest

USER root
# Add MySQL driver so generate-changelog, diff-changelog, and update work against MySQL
RUN lpm add mysql --global
USER liquibase

WORKDIR /liquibase
# Changelogs and scripts are mounted at runtime; default working dir for CLI
ENTRYPOINT ["/liquibase/liquibase"]
