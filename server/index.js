require('dotenv').config({ path: require('path').join(__dirname, '.env') });

const express = require('express');
const swaggerUi = require('swagger-ui-express');
const { execFile } = require('child_process');
const fs = require('fs/promises');
const path = require('path');

const db = require('./utils/db');
const { uploadFile, downloadFile } = require('./utils/s3');

const app = express();
const PORT = Number(process.env.PORT) || 3000;

const spec = require('./openapi.json');

app.use(express.json());

app.use('/api-docs', swaggerUi.serve, swaggerUi.setup(spec, {
  swaggerOptions: { docExpansion: 'list' },
}));

app.get('/', (req, res) => {
  res.json({ ok: true, message: 'Express server is running' });
});

app.get('/health', (req, res) => {
  res.status(200).send('OK');
});

app.get('/db-status', async (req, res) => {
  const schema = req.query.schema || null;
  const result = await db.ping(schema || undefined);
  res.json({ schema, ...result });
});

function runLiquibase(args, options = {}) {
  return new Promise((resolve, reject) => {
    const execOptions = { env: process.env, ...options };
    execFile('liquibase', args, execOptions, (err, stdout, stderr) => {
      if (err) {
        err.stdout = stdout;
        err.stderr = stderr;
        return reject(err);
      }
      resolve({ stdout, stderr });
    });
  });
}

app.post('/schema-dump', async (req, res) => {
  const { schema } = req.body || {};

  if (!schema) {
    return res.status(400).json({ ok: false, error: 'schema is required' });
  }

  const host = process.env.DB_HOST;
  const port = Number(process.env.DB_PORT) || 3306;
  const user = process.env.DB_USER;
  const password = process.env.DB_PASSWORD;

  if (!host || !user) {
    return res.status(500).json({ ok: false, error: 'DB_HOST and DB_USER must be configured' });
  }

  const ts = new Date().toISOString().replace(/[:.]/g, '-');
  const safeSchema = schema.replace(/[^a-zA-Z0-9_]/g, '_');
  const fileName = `dump-${safeSchema}-${ts}.yaml`;
  const tmpDir = path.join(__dirname, 'tmp');
  const outPath = path.join(tmpDir, fileName);

  const sourceUrl = `jdbc:mysql://${host}:${port}/${schema}`;

  try {
    await fs.mkdir(tmpDir, { recursive: true });

    await runLiquibase([
      'generate-changelog',
      `--changelog-file=${outPath}`,
      `--url=${sourceUrl}`,
      `--username=${user}`,
      `--password=${password}`,
      '--driver=com.mysql.cj.jdbc.Driver',
      '--overwrite-output-file=true',
    ]);

    const s3Key = await uploadFile(outPath, fileName);
    await fs.unlink(outPath).catch(() => {});

    return res.json({ ok: true, schema, s3Key });
  } catch (err) {
    await fs.unlink(outPath).catch(() => {});
    return res.status(500).json({
      ok: false,
      error: err.message,
      liquibaseStdout: err.stdout,
      liquibaseStderr: err.stderr,
    });
  }
});

app.post('/schema-restore', async (req, res) => {
  const { schema, s3Key } = req.body || {};

  if (!schema || !s3Key) {
    return res
      .status(400)
      .json({ ok: false, error: 'schema and s3Key are required' });
  }

  const host = process.env.DB_HOST;
  const port = Number(process.env.DB_PORT) || 3306;
  const user = process.env.DB_USER;
  const password = process.env.DB_PASSWORD;

  if (!host || !user) {
    return res
      .status(500)
      .json({ ok: false, error: 'DB_HOST and DB_USER must be configured' });
  }

  const ts = new Date().toISOString().replace(/[:.]/g, '-');
  const safeSchema = schema.replace(/[^a-zA-Z0-9_]/g, '_');
  const tmpDir = path.join(__dirname, 'tmp');
  const tmpFile = path.join(tmpDir, `restore-${safeSchema}-${ts}.yaml`);

  try {
    // 1) Create schema/database if it does not exist
    await db.query(`CREATE DATABASE IF NOT EXISTS \`${schema}\``);

    // 2) Ensure tmp dir exists and download changelog from S3
    await fs.mkdir(tmpDir, { recursive: true });
    await downloadFile(s3Key, tmpFile);

    const changelogFileName = path.basename(tmpFile);
    await fs.access(tmpFile); // ensure file exists before calling Liquibase

    const targetUrl = `jdbc:mysql://${host}:${port}/${schema}`;

    // 3) Apply changelog: run with cwd=tmpDir and relative changelog filename so Liquibase finds the file
    await runLiquibase(
      [
        'update',
        `--changelog-file=${changelogFileName}`,
        `--url=${targetUrl}`,
        `--username=${user}`,
        `--password=${password}`,
        '--driver=com.mysql.cj.jdbc.Driver',
      ],
      { cwd: tmpDir },
    );

    await fs.unlink(tmpFile).catch(() => {});

    return res.json({ ok: true, schema, s3Key });
  } catch (err) {
    await fs.unlink(tmpFile).catch(() => {});
    return res.status(500).json({
      ok: false,
      error: err.message,
      liquibaseStdout: err.stdout,
      liquibaseStderr: err.stderr,
    });
  }
});

const server = app.listen(PORT, '0.0.0.0', () => {
  console.log(`Server listening on port ${PORT}`);
  console.log(`Swagger UI: http://localhost:${PORT}/api-docs`);
});

process.on('SIGTERM', async () => {
  await db.close();
  server.close();
});
