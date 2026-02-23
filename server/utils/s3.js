const { S3Client, PutObjectCommand } = require('@aws-sdk/client-s3');
const fs = require('fs/promises');
const path = require('path');

const region = process.env.AWS_REGION;
const bucket = process.env.S3_BUCKET_NAME;
const prefix = process.env.S3_PREFIX || '';

const s3 = region ? new S3Client({ region }) : null;

async function uploadFile(localPath, key) {
  if (!s3 || !bucket) {
    throw new Error('S3 not configured: set AWS_REGION and S3_BUCKET_NAME in env');
  }
  const body = await fs.readFile(localPath);
  const objectKey = path.posix.join(prefix, key);

  await s3.send(
    new PutObjectCommand({
      Bucket: bucket,
      Key: objectKey,
      Body: body,
    }),
  );

  return objectKey;
}

module.exports = {
  uploadFile,
};

