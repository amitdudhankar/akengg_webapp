# Making website image prefixes public

Uploads live in one bucket, but they are not all equally sensitive:

| Prefix       | Who should read it | How the API serves it |
| ------------ | ------------------ | --------------------- |
| `documents/` | Only signed-in staff | Presigned URL, expires after `S3_SIGNED_URL_TTL` |
| `seller/`    | Only signed-in staff | Presigned URL |
| `blogs/`     | The whole internet | Plain public URL |
| `services/`  | The whole internet | Plain public URL |
| `projects/`  | The whole internet | Plain public URL |
| `team/`      | The whole internet | Plain public URL |

`src/utils/storage.js` decides per key: prefixes listed in `S3_PUBLIC_FOLDERS`
get a plain `ASSET_BASE_URL` link, everything else gets presigned.

## Why website images must NOT be presigned

A presigned URL carries an expiry (default one hour). For an invoice that is
exactly right. For an image on a public page it breaks things that are easy to
miss:

- **Social previews die.** An `og:image` shared to WhatsApp/LinkedIn 404s once
  the signature lapses.
- **Search engines can't index images.** Crawlers revisit later and get 403.
- **Nothing caches.** The query string changes on every page load, so browsers
  and CDNs re-download the full image every time.

## Apply the policy FIRST

Order matters. If `S3_PUBLIC_FOLDERS` is set before the bucket allows public
reads, those URLs return 403 and images disappear from the site.

### 1. Allow public policies on the bucket

S3 → your bucket → **Permissions** → **Block public access (bucket settings)** →
Edit. Uncheck:

- Block public access to buckets and objects granted through *new* public bucket policies
- Block public and cross-account access to buckets and objects through *any* public bucket policies

Leave both **ACL** options checked — this setup grants access by policy, never
by object ACL (which is also why `createUploader` sets no ACL).

### 2. Attach the bucket policy

Permissions → **Bucket policy** → Edit → paste `docs/s3-bucket-policy.json`.

It grants `s3:GetObject` to `*` on **only** those four prefixes. `documents/*`
is not listed, so invoices stay private and keep requiring a signature.

### 3. Set the env var and restart

```
S3_PUBLIC_FOLDERS=blogs,services,projects,team
```

```bash
pm2 restart backend
```

### 4. Verify

```bash
# a blogs/ key -> plain URL, HTTP 200 with no signature
curl -sI "https://<bucket>.s3.ap-south-1.amazonaws.com/blogs/<some-key>.png" | head -1

# a documents/ key -> still 403 without a signature
curl -sI "https://<bucket>.s3.ap-south-1.amazonaws.com/documents/<some-doc>.pdf" | head -1
```

Or hit the API and confirm the shape of what it returns:

```bash
curl -s https://api.akengg.in/api/v1/blogs | grep -o 'X-Amz-Signature' | wc -l   # expect 0
```

## Optional: CloudFront

Serving straight from S3 works, but a CDN in front gives edge caching and a
tidier hostname. Point a distribution at the bucket and set:

```
ASSET_BASE_URL=https://cdn.akengg.in
```

`storage.assetUrl()` uses it for public keys automatically; presigned keys are
unaffected and continue to be signed against the bucket directly.
