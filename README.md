# Collection Downloader

A web application for browsing RO-Crate collections hierarchically, selecting files with quality tier filtering, and requesting zip downloads via email.

## Features

- **Hierarchical Browser:** Navigate Collections → Items → Files with expand/collapse
- **Quality Tier Selection:** Choose between archival (WAV, MKV/MXF) and compressed (MP3) formats
- **File Size Tracking:** View sizes at file, item, and collection levels with running totals
- **Background Export:** Selected files are zipped and uploaded to S3, with download link emailed

## Tech Stack

- **Frontend:** React 19, TanStack Router, TanStack Query, Tailwind CSS, shadcn/ui
- **Backend:** TanStack Start (SSR React framework with server functions)
- **State Management:** Jotai (atomic state management)
- **Infrastructure:** AWS S3 (zip storage), AWS SES (email)

## Prerequisites

- Node.js 22+
- pnpm
- AWS account with S3 and SES configured
- OIDC provider for authentication

## Setup

1. **Install dependencies:**

   ```bash
   pnpm install
   ```

2. **Configure environment:**

   ```bash
   cp .env.example .env
   ```

   Edit `.env` with your configuration:

   ```bash
   # RO-Crate API
   ROCRATE_API_BASE_URL=https://your-api.example.com

   # OIDC Authentication
   OIDC_ISSUER=https://your-idp.example.com
   OIDC_CLIENT_ID=your-client-id
   OIDC_CLIENT_SECRET=your-client-secret
   OIDC_REDIRECT_URI=http://localhost:3000/auth/callback

   # Session
   SESSION_SECRET=your-secret-at-least-32-characters

   # AWS
   AWS_REGION=ap-southeast-2
   S3_BUCKET=your-bucket
   EMAIL_FROM=noreply@example.com
   ```

3. **Run development servers:**

   ```bash
   pnpm dev
   ```

## Scripts

| Command | Description |
|---------|-------------|
| `pnpm dev` | Run frontend + backend concurrently |
| `pnpm build` | Build for production |
| `pnpm start` | Start production server |

## Architecture

```
┌─────────────┐     ┌─────────────────┐     ┌─────────────┐
│   Browser   │────▶│ TanStack Start  │────▶│ RO-Crate API│
└─────────────┘     │  (Server Funcs) │     └─────────────┘
                    └────────┬────────┘
                             │
              ┌──────────────┼──────────────┐
              ▼              ▼              ▼
       ┌─────────────┐ ┌─────────────┐ ┌─────────────┐
       │   AWS SES   │ │   Export    │ │   AWS S3    │
       │   (email)   │ │  Processor  │ │   (zips)    │
       └─────────────┘ └─────────────┘ └─────────────┘
```

1. User browses collections and selects files in the React frontend
2. Server functions fetch data from RO-Crate API with user's access token
3. Export request triggers in-process background job
4. Processor downloads files, creates zip, uploads to S3
5. Email with presigned download link sent via SES

## Project Structure

```
src/
├── routes/           # TanStack Start file-based routes
├── components/       # React components (ui/, browser/, layout/, common/)
├── hooks/            # TanStack Query hooks
├── lib/              # Utilities
├── store/            # Jotai state management
├── server/           # Server-only code (functions/, services/)
├── shared/           # Shared types/schemas
└── worker/           # Export job processor (runs in-process)
```

## AWS Setup

### S3 Bucket

Create a bucket for storing zip files. Configure lifecycle rules to auto-delete files after 24-48 hours.

### SES

Verify your sender email address or domain. Ensure you're out of the SES sandbox for production use.

## Deployment

1. Build the application:

   ```bash
   pnpm build
   ```

2. Start the server:

   ```bash
   pnpm start
   ```

Export jobs run in-process within the server, so no separate worker is needed.

For production, consider:

- Using a process manager (PM2, systemd)
- Setting up health checks

## Docker

The application is published as a Docker image to GitHub Container Registry.

### Image Details

- **Registry:** `ghcr.io/paradisec/arocapi-downloader`
- **Tags:** Version numbers (e.g., `1.0.1`) and `latest`
- **Platforms:** `linux/amd64`, `linux/arm64`
- **Port:** `7000`

### Environment Variables

#### Required

| Variable | Description | Format |
|----------|-------------|--------|
| `ROCRATE_API_BASE_URL` | RO-Crate API endpoint | URL |
| `OIDC_ISSUER` | OIDC provider issuer URL | URL |
| `OIDC_CLIENT_ID` | OIDC client identifier | String |
| `OIDC_CLIENT_SECRET` | OIDC client secret | String |
| `OIDC_REDIRECT_URI` | OIDC callback URL | URL |
| `SESSION_SECRET` | Session encryption key | String (min 32 chars) |
| `S3_BUCKET` | S3 bucket for zip files | String |
| `EMAIL_FROM` | Sender email address | Email |

#### Optional

| Variable | Default | Description |
|----------|---------|-------------|
| `NODE_ENV` | `development` | Environment mode (`development`, `production`, `test`) |
| `PORT` | `7000` | Server port |
| `BASE_PATH` | *(root)* | Subpath to serve the app under, e.g. `/downloader` |
| `OIDC_SCOPES` | `public openid profile email` | OIDC scopes to request |
| `AWS_REGION` | `ap-southeast-2` | AWS region |

#### AWS Credentials

AWS credentials can be provided via environment variables or IAM role:

- `AWS_ACCESS_KEY_ID`
- `AWS_SECRET_ACCESS_KEY`

When running on AWS infrastructure (EC2, ECS, Lambda), prefer using IAM roles instead of explicit credentials.

### Usage Examples

**Using an environment file:**

```bash
docker run -d \
  --name arocapi-downloader \
  -p 7000:7000 \
  --env-file .env \
  ghcr.io/paradisec/arocapi-downloader:latest
```

**With inline environment variables:**

```bash
docker run -d \
  --name arocapi-downloader \
  -p 7000:7000 \
  -e ROCRATE_API_BASE_URL=https://api.example.com \
  -e OIDC_ISSUER=https://idp.example.com \
  -e OIDC_CLIENT_ID=your-client-id \
  -e OIDC_CLIENT_SECRET=your-client-secret \
  -e OIDC_REDIRECT_URI=https://app.example.com/api/auth/callback \
  -e SESSION_SECRET=your-secret-at-least-32-characters \
  -e S3_BUCKET=your-bucket \
  -e EMAIL_FROM=noreply@example.com \
  -e AWS_REGION=ap-southeast-2 \
  -e AWS_ACCESS_KEY_ID=your-access-key \
  -e AWS_SECRET_ACCESS_KEY=your-secret-key \
  ghcr.io/paradisec/arocapi-downloader:latest
```

**Docker Compose:**

```yaml
services:
  arocapi-downloader:
    image: ghcr.io/paradisec/arocapi-downloader:latest
    ports:
      - '7000:7000'
    environment:
      - NODE_ENV=production
      - ROCRATE_API_BASE_URL=https://api.example.com
      - OIDC_ISSUER=https://idp.example.com
      - OIDC_CLIENT_ID=${OIDC_CLIENT_ID}
      - OIDC_CLIENT_SECRET=${OIDC_CLIENT_SECRET}
      - OIDC_REDIRECT_URI=https://app.example.com/api/auth/callback
      - SESSION_SECRET=${SESSION_SECRET}
      - S3_BUCKET=${S3_BUCKET}
      - EMAIL_FROM=noreply@example.com
      - AWS_REGION=ap-southeast-2
      - AWS_ACCESS_KEY_ID=${AWS_ACCESS_KEY_ID}
      - AWS_SECRET_ACCESS_KEY=${AWS_SECRET_ACCESS_KEY}
    restart: unless-stopped
```

### Serving Under a Subpath

Set `BASE_PATH` to mount the application somewhere other than the domain root:

```yaml
    environment:
      - BASE_PATH=/downloader
      - OIDC_REDIRECT_URI=https://app.example.com/downloader/api/auth/callback
```

Notes:

- The reverse proxy must pass the prefix through unchanged (no path rewriting), e.g. nginx `proxy_pass http://arocapi-downloader:7000;` with no trailing path.
- `OIDC_REDIRECT_URI` must include the subpath, and the updated URI must be registered with your OIDC provider.
- Nested subpaths such as `/apps/downloader` are supported. Changing `BASE_PATH` requires recreating the container (`docker compose up -d` does this automatically).

### Health Check

The container includes a built-in health check. The application responds on port `7000` at `BASE_PATH` (the root path `/` by default). You can verify the container is running with:

```bash
curl http://localhost:7000/
```

## Licence

ISC
