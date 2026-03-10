# Railway Deployment Notes

Deploy this repository to Railway as two services only:

- backend service from `/backend`
- frontend service from `/frontend`

Do not deploy from repo root.

## Required Service Configuration

### Backend service

- Root Directory: `/backend`
- Builder: `Dockerfile`
- Dockerfile Path: `/backend/Dockerfile`

### Frontend service

- Root Directory: `/frontend`
- Builder: `Dockerfile`
- Dockerfile Path: `/frontend/Dockerfile`

## Variables

Set runtime variables in Railway Variables, not in repo docs.

Typical backend variables include:

- `DATABASE_URL`
- `NODE_ENV=production`
- JWT secrets
- mail and provider integration secrets as needed

Typical frontend variables include:

- `VITE_API_URL`

## Deploy Paths

Recommended:

```bash
git push origin master
```

Manual CLI deploys should target the correct service root, not repo root.

## Verification

After deployment:

```bash
curl https://your-backend-url.railway.app/health
curl https://your-frontend-url.railway.app/login
```

## Common Failure Mode

If Railway fails before build starts or reports no associated build:

1. Check the service root directory.
2. Check the Dockerfile path.
3. Make sure Railway is not trying to deploy from repo root.
