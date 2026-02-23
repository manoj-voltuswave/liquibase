# Liquibase POC: MySQL Schema Dump, Diff, Apply with Overrides & Transaction Tracking

This POC shows how to use **Liquibase** (Docker free/community) with **MySQL** to:

1. **Create a schema dump** from an existing MySQL schema
2. **Create another schema** from that dump
3. **Get a diff** between reference and target and generate a changelog
4. **Apply the diff** with **value overrides** (e.g. different schema names, env-specific values)
5. **Track transaction data** (which changes ran, when, and locking)

---

## 1. What Is What?

### 1.1 Schema dump (Liquibase “snapshot” of your database)

- **What it is:** A representation of the *current state* of a database (tables, columns, keys, indexes, etc.), not the raw SQL dump.
- **In Liquibase you have two main options:**
  - **`generate-changelog`** – Connects to a live DB and produces a **changelog file** (XML/YAML/JSON/SQL) made of changesets that *recreate* that schema. This is your “dump” in Liquibase terms: a versioned, repeatable definition of the schema.
  - **`snapshot`** – Captures the current state (e.g. to JSON). Used for comparison; you can use **`snapshot-reference`** to save a reference snapshot and later run **`diff-changelog`** against it.
- **Why it matters for the POC:** The “dump” we use is the **changelog** produced by `generate-changelog` (and optionally snapshots for diffing). You store it in version control and use it to create or update other databases.

### 1.2 Creating another schema from that dump

- **What it is:** You have a second MySQL database (or schema) that should look like the first. You don’t copy bytes; you **apply** the same changelog to the new database.
- **How:**  
  - Ensure the **target database/schema exists** (Liquibase does not create the database/schema itself).  
  - Point Liquibase at the target with `--url`, `--username`, `--password` (and `--default-schema-name` if you use a schema other than the default).  
  - Run **`liquibase update`** with the changelog that describes the schema (the one you generated or the diff-changelog you produced).  
- Liquibase will create only the **tables and objects** that are not yet applied (using `DATABASECHANGELOG` to know what’s already run).

### 1.3 Using the dump to get a diff and apply it

- **What it is:** You have a **reference** (source of truth) and a **target** (e.g. another env or copy). You want a changelog that contains *only the differences* so the target can be updated to match the reference.
- **How:**  
  - **Option A – Two live databases:**  
    `diff-changelog --reference-url=... --reference-username=... --reference-password=... --url=... --username=... --password=... --changelog-file=diff.xml`  
    Liquibase compares reference DB to target DB and writes a new changelog (e.g. `diff.xml`) with changesets that would bring the target in line with the reference.  
  - **Option B – Snapshot as reference:**  
    Create a reference snapshot from the source DB (`snapshot-reference`), then run `diff-changelog` with `--reference-snapshot=path/to/snapshot.json` and `--url=...` (target). The diff is again written to a changelog file.  
- **Apply the diff:** Run **`liquibase update --changelog-file=diff.xml`** against the **target** database. Only the new changesets in that changelog are executed; existing ones are already recorded in `DATABASECHANGELOG`.

### 1.4 Overriding values when applying

- **What it is:** The same changelog might need different values per environment (e.g. schema name, table prefix, default data). You don’t want to maintain separate changelogs; you want one changelog with placeholders and **override** those at apply time.
- **How Liquibase does it:**  
  - **Property substitution:** In changelogs you use placeholders like `${schema.name}` or `${app.env}`.  
  - **Set values by (priority order):** CLI `-D` args → JVM system properties → environment variables → `liquibase.properties` → `<property>` in the changelog.  
  - **Example:**  
    `liquibase update -Dschema.name=staging -Dapp.env=STAGING`  
  - **Contexts/labels:** You can restrict which changesets run (e.g. only “staging”) and combine with properties to override only in certain contexts.  
- So “override some values” = define properties in the changelog and pass `-Dproperty=value` (and/or env/properties file) when running `update`.

### 1.5 Tracking transaction data of tables

- **What it is:** You need to know **which** changes ran, **when**, and **in what order**, and to avoid two Liquibase runs applying changes at the same time.
- **How Liquibase does it:**  
  - **`DATABASECHANGELOG`** – For each executed changeset Liquibase stores: id, author, filename, dateexecuted, orderexecuted, exectype, md5sum, description, contexts, labels, deployment_id, etc. This is your “transaction history” of applied changes.  
  - **`DATABASECHANGELOGLOCK`** – A single row used as a lock. While Liquibase is running it sets `LOCKED=1` and sets `LOCKEDBY`; when finished it sets `LOCKED=0`. So only one `update` runs at a time per database.  
- So “tracking transaction data” = use these two tables (and optionally query them or use `liquibase history` / `liquibase list-locks`).

---

## 2. How to achieve it (step-by-step)

| Step | Goal | Command / Action |
|------|------|------------------|
| 1 | Get a “dump” of source schema | `liquibase generate-changelog --changelog-file=changelog/schema-dump.xml --url=jdbc:mysql://host/source_db ...` (and optionally `snapshot-reference` for later diff) |
| 2 | Create target schema | Create DB/schema in MySQL (e.g. `CREATE DATABASE target_db;` or use a second schema). |
| 3 | Bootstrap target from dump | `liquibase update --changelog-file=changelog/schema-dump.xml --url=jdbc:mysql://host/target_db ...` (optionally with `-D` overrides if your dump uses properties). |
| 4 | Get diff (reference vs target) | `liquibase diff-changelog --reference-url=... --url=... --changelog-file=changelog/diff.xml ...` (or use `--reference-snapshot` if you use a snapshot). |
| 5 | Apply diff with overrides | `liquibase update --changelog-file=changelog/diff.xml -Dschema.name=target_schema -Dapp.env=staging ...` |
| 6 | Inspect transaction tracking | Query `DATABASECHANGELOG` and `DATABASECHANGELOGLOCK` in the target DB, or use `liquibase history` / `liquibase list-locks`. |

---

## 3. Docker free version for POC

- The **official** image at [Docker Hub – liquibase](https://hub.docker.com/_/liquibase) is **deprecated** as of Liquibase 5.0 (only patch updates). It’s still usable for a POC.
- **Recommended for new use:** Use **`liquibase/liquibase`** (Community) and add the MySQL driver yourself. As of 5.0, Community images don’t ship DB drivers by default; you add them via **LPM** (Liquibase Package Manager) in your Dockerfile, e.g. `RUN lpm add mysql --global`.
- This POC uses a **custom Dockerfile** based on a Liquibase image and adds the MySQL driver so `generate-changelog`, `diff-changelog`, and `update` all work against MySQL.

---

## 4. Project layout (POC)

- **`changelog/`** – Generated and hand-written changelogs (schema dump, diff, overridable properties).
- **`liquibase.properties`** – Default URL, user, password, changelog file (override per run or use env-specific files).
- **Scripts:**  
  - `scripts/01-generate-dump.sh` – Generate changelog from source DB.  
  - `scripts/02-apply-to-target.sh` – Apply dump (or main changelog) to target DB.  
  - `scripts/03-diff-changelog.sh` – Generate diff changelog (reference vs target).  
  - `scripts/04-apply-with-overrides.sh` – Apply a changelog with `-D` overrides.  
- **Docker:** `Dockerfile` (Liquibase + MySQL driver), `docker-compose.yml` (Liquibase only; MySQL is **RDS**, not a container).

---

## 5. Using RDS MySQL

This POC is set up for **AWS RDS MySQL**. There is no MySQL Docker image; all commands connect to your RDS instance.

1. **Create source and target databases on RDS** (if needed):
   - In RDS, create two databases (e.g. `source_db`, `target_db`) or use existing schemas.
   - Ensure the user in `LB_USERNAME` has privileges on both.

2. **Configure connection via `.env`:**
   ```bash
   cp .env.example .env
   # Edit .env: set LB_SOURCE_URL, LB_TARGET_URL, LB_USERNAME, LB_PASSWORD
   ```
   - **LB_SOURCE_URL** – JDBC URL for the **source** database (e.g. `jdbc:mysql://your-rds.region.rds.amazonaws.com:3306/source_db`).
   - **LB_TARGET_URL** – JDBC URL for the **target** database (e.g. `jdbc:mysql://your-rds.region.rds.amazonaws.com:3306/target_db`).
   - We use `LB_*` (not `LIQUIBASE_*`) so Liquibase 5.x does not treat them as reserved and cause errors.
   - Use the same RDS host/port if both DBs are on the same instance; only the database name differs.

3. **Network:** The machine running `docker compose run` (e.g. your laptop or CI) must be able to reach RDS (VPC, security group, or public access as appropriate).

---

## 6. Quick start (Docker + RDS)

```bash
# 1) Configure RDS connection (required)
cp .env.example .env
# Edit .env with your RDS endpoint, DB names, username, password

# 2) Build Liquibase image with MySQL driver
docker compose build liquibase

# On Linux, so the container can write generated files (e.g. schema-dump.xml) into ./changelog, run once:
# export HOST_UID=$(id -u) HOST_GID=$(id -g)
# (Bash's UID is read-only, so we use HOST_UID/HOST_GID.)

# 3) Seed source DB on RDS so we have something to dump
docker compose run --rm liquibase "liquibase update --changelog-file=changelog/master.xml --url=\$LB_SOURCE_URL --username=\$LB_USERNAME --password=\$LB_PASSWORD --driver=com.mysql.cj.jdbc.Driver"

# 4) Generate dump from source DB (RDS)
docker compose run --rm liquibase "sh ./scripts/01-generate-dump.sh"

# 5) Apply dump to target DB (RDS)
docker compose run --rm liquibase "sh ./scripts/02-apply-to-target.sh"

# 6) (Optional) Change source, then generate diff between source and target
docker compose run --rm liquibase "sh ./scripts/03-diff-changelog.sh"

# 7) Apply diff to target with overrides
docker compose run --rm liquibase "sh ./scripts/04-apply-with-overrides.sh"
# With custom overrides:
docker compose run --rm liquibase "sh ./scripts/04-apply-with-overrides.sh -Dconfig.default_env=prod -Dapp.schema=target_db"
```

---

## 7. Inspecting transaction tracking

After running `update`, you can inspect what Liquibase recorded (replace `target_db` with your target database name if different):

- **List applied changes:**  
  `docker compose run --rm liquibase "liquibase history --url=\$LB_TARGET_URL --username=\$LB_USERNAME --password=\$LB_PASSWORD --driver=com.mysql.cj.jdbc.Driver"`
- **Show lock status:**  
  `docker compose run --rm liquibase "liquibase list-locks --url=\$LB_TARGET_URL --username=\$LB_USERNAME --password=\$LB_PASSWORD --driver=com.mysql.cj.jdbc.Driver"`
- **Direct SQL (in RDS MySQL):**
  ```sql
  SELECT id, author, filename, dateexecuted, orderexecuted, exectype, description
  FROM target_db.DATABASECHANGELOG
  ORDER BY orderexecuted;

  SELECT * FROM target_db.DATABASECHANGELOGLOCK;
  ```

---

## 8. References

- [generate-changelog](https://docs.liquibase.com/commands/inspection/generate-changelog.html) – Create changelog from existing DB.  
- [diff-changelog](https://docs.liquibase.com/commands/inspection/diff-changelog.html) – Compare two DBs (or snapshot vs DB) and output a changelog.  
- [Property substitution](https://docs.liquibase.com/oss/user-guide-landing-page/what-is-property-substitution) – Override values with `-D`, env, or properties.  
- [DATABASECHANGELOG](https://docs.liquibase.com/oss/user-guide-landing-page/what-is-the-databasechangelog-table) – Tracks executed changesets.  
- [DATABASECHANGELOGLOCK](https://docs.liquibase.com/pro/user-guide-4-33/what-is-the-database-changelog-lock-table) – Lock table for safe concurrent runs.  
- [Liquibase Docker (Community 5.0)](https://docs.liquibase.com/community/integration-guide-5-0/what-support-does-liquibase-have-for-docker) – Docker support and custom image with LPM.  
- [Docker Hub – liquibase](https://hub.docker.com/_/liquibase) – Official image (deprecated for 5.0+).
