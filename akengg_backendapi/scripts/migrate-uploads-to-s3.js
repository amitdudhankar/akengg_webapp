// scripts/migrate-uploads-to-s3.js
// ─────────────────────────────────────────────────────────────────────────
// Copy everything under src/public/uploads into the S3 bucket using the SAME
// keys the database already stores, so switching STORAGE_DRIVER=local -> s3
// needs no data migration: a row holding "services/172...-pump.jpg" keeps
// working because that exact object now exists in the bucket.
//
// Local files are NOT deleted — the local tree stays as a rollback path.
//
//   Dry run (default, lists what WOULD upload, touches nothing):
//     npm run migrate:s3
//
//   Actually upload:
//     npm run migrate:s3 -- --confirm
//
//   Also overwrite objects that already exist in the bucket:
//     npm run migrate:s3 -- --confirm --overwrite
// ─────────────────────────────────────────────────────────────────────────
const fs = require("fs");
const path = require("path");

require("dotenv").config({
  path: path.join(__dirname, "..", ".env"),
  quiet: true,
});

const {
  S3Client,
  PutObjectCommand,
  HeadObjectCommand,
} = require("@aws-sdk/client-s3");

const UPLOAD_ROOT = path.join(__dirname, "..", "src", "public", "uploads");

const args = process.argv.slice(2);
const CONFIRM = args.includes("--confirm");
const OVERWRITE = args.includes("--overwrite");

const CONTENT_TYPES = {
  ".pdf": "application/pdf",
  ".png": "image/png",
  ".jpg": "image/jpeg",
  ".jpeg": "image/jpeg",
  ".gif": "image/gif",
  ".webp": "image/webp",
  ".svg": "image/svg+xml",
  ".docx":
    "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
};

const contentTypeFor = (file) =>
  CONTENT_TYPES[path.extname(file).toLowerCase()] || "application/octet-stream";

const humanSize = (bytes) => {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / 1024 / 1024).toFixed(1)} MB`;
};

/** Recursively collect { key, absPath, size } for every file under a root. */
const collectFiles = (dir, baseDir = dir) => {
  if (!fs.existsSync(dir)) {
    return [];
  }

  return fs.readdirSync(dir, { withFileTypes: true }).flatMap((entry) => {
    const absPath = path.join(dir, entry.name);

    if (entry.isDirectory()) {
      return collectFiles(absPath, baseDir);
    }
    // .gitkeep placeholders exist only to keep empty dirs in git.
    if (entry.name === ".gitkeep") {
      return [];
    }

    return [
      {
        // Storage keys always use forward slashes, regardless of platform.
        key: path.relative(baseDir, absPath).split(path.sep).join("/"),
        absPath,
        size: fs.statSync(absPath).size,
      },
    ];
  });
};

const objectExists = async (client, bucket, key) => {
  try {
    await client.send(new HeadObjectCommand({ Bucket: bucket, Key: key }));
    return true;
  } catch (error) {
    if (error.name === "NotFound" || error.$metadata?.httpStatusCode === 404) {
      return false;
    }
    throw error;
  }
};

(async () => {
  const bucket = process.env.AWS_S3_BUCKET;
  const region = process.env.AWS_REGION;

  if (!bucket || !region) {
    console.error("AWS_S3_BUCKET and AWS_REGION must be set in .env");
    process.exit(1);
  }

  const files = collectFiles(UPLOAD_ROOT);

  if (!files.length) {
    console.log(`Nothing to migrate — ${UPLOAD_ROOT} is empty.`);
    process.exit(0);
  }

  const totalBytes = files.reduce((sum, f) => sum + f.size, 0);
  console.log(
    `\n${files.length} file(s), ${humanSize(totalBytes)} under src/public/uploads`
  );
  console.log(`Target: s3://${bucket} (${region})`);
  console.log(
    CONFIRM
      ? `Mode:   UPLOAD${OVERWRITE ? " (overwriting existing objects)" : " (skipping objects that already exist)"}\n`
      : "Mode:   DRY RUN — nothing will be uploaded. Re-run with --confirm to apply.\n"
  );

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

  let uploaded = 0;
  let skipped = 0;
  let failed = 0;

  for (const file of files) {
    if (!CONFIRM) {
      console.log(`  would upload  ${file.key}  (${humanSize(file.size)})`);
      continue;
    }

    try {
      if (!OVERWRITE && (await objectExists(client, bucket, file.key))) {
        console.log(`  skip (exists) ${file.key}`);
        skipped += 1;
        continue;
      }

      await client.send(
        new PutObjectCommand({
          Bucket: bucket,
          Key: file.key,
          Body: fs.createReadStream(file.absPath),
          ContentLength: file.size,
          ContentType: contentTypeFor(file.absPath),
        })
      );

      console.log(`  uploaded      ${file.key}  (${humanSize(file.size)})`);
      uploaded += 1;
    } catch (error) {
      console.error(`  FAILED        ${file.key}: ${error.message}`);
      failed += 1;
    }
  }

  if (!CONFIRM) {
    console.log(
      `\nDry run complete. Re-run with --confirm to upload these ${files.length} file(s).\n`
    );
    process.exit(0);
  }

  console.log(
    `\nDone. uploaded: ${uploaded}, skipped: ${skipped}, failed: ${failed}`
  );
  if (failed === 0) {
    console.log("Next: set STORAGE_DRIVER=s3 in .env and restart the API.\n");
  }
  process.exit(failed === 0 ? 0 : 1);
})();
