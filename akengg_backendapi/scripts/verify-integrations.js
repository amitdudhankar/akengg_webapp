// scripts/verify-integrations.js — connectivity check for Brevo SMTP + S3.
// Read-only: authenticates to the SMTP relay WITHOUT sending mail, and lists
// the bucket WITHOUT writing anything.
//   Run:  npm run verify:integrations
const path = require("path");

require("dotenv").config({
  path: path.join(__dirname, "..", ".env"),
  quiet: true,
});

const mailer = require("../src/utils/mailer");

const ok = (msg) => console.log(`  OK    ${msg}`);
const bad = (msg) => console.log(`  FAIL  ${msg}`);
const skip = (msg) => console.log(`  SKIP  ${msg}`);

(async () => {
  let failures = 0;

  console.log("\n── Brevo SMTP relay ──");
  if (!mailer.isConfigured()) {
    skip("SMTP_HOST / SMTP_USER / SMTP_PASSWORD not all set");
  } else {
    try {
      await mailer.verifyConnection();
      ok(`authenticated to ${process.env.SMTP_HOST}:${process.env.SMTP_PORT || 587}`);
    } catch (error) {
      failures += 1;
      bad(`SMTP: ${error.message}`);
    }
  }

  console.log("\n── AWS S3 ──");
  const bucket = process.env.AWS_S3_BUCKET;
  const region = process.env.AWS_REGION;
  if (!bucket || !region) {
    skip("AWS_S3_BUCKET / AWS_REGION not set");
  } else {
    try {
      const { S3Client, HeadBucketCommand, ListObjectsV2Command } = require("@aws-sdk/client-s3");
      const client = new S3Client({
        region,
        ...(process.env.AWS_ACCESS_KEY_ID && process.env.AWS_SECRET_ACCESS_KEY
          ? {
              credentials: {
                accessKeyId: process.env.AWS_ACCESS_KEY_ID,
                secretAccessKey: process.env.AWS_SECRET_ACCESS_KEY,
              },
            }
          : {}),
      });

      await client.send(new HeadBucketCommand({ Bucket: bucket }));
      ok(`bucket "${bucket}" reachable in ${region}`);

      const listed = await client.send(
        new ListObjectsV2Command({ Bucket: bucket, MaxKeys: 5 })
      );
      ok(`s3:ListBucket granted (${listed.KeyCount || 0} object(s) at the root)`);
      (listed.Contents || []).forEach((o) => console.log(`          - ${o.Key}`));
    } catch (error) {
      failures += 1;
      bad(`S3: ${error.name || ""} ${error.message}`);
    }
  }

  console.log(
    `\n${failures === 0 ? "All configured integrations reachable." : `${failures} check(s) failed.`}\n`
  );
  process.exit(failures === 0 ? 0 : 1);
})();
