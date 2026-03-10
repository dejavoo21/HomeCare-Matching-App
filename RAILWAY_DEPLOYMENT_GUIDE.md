# Railway Deployment Guide

This project should run on Railway as two application services plus Postgres:

- `HomeCare-Matching-App` -> backend service from `/backend`
- `beneficial-solace` -> frontend service from `/frontend`
- `Postgres` -> database

There is no supported root-level application deploy path.

## Source of Truth

- [railway.json](./railway.json) defines the two service roots
- [backend/Dockerfile](./backend/Dockerfile) is the backend image
- [frontend/Dockerfile](./frontend/Dockerfile) is the frontend image

## Railway Service Settings

### Backend

- Service: `HomeCare-Matching-App`
- Root Directory: `/backend`
- Builder: `Dockerfile`
- Dockerfile Path: `/backend/Dockerfile`

### Frontend

- Service: `beneficial-solace`
- Root Directory: `/frontend`
- Builder: `Dockerfile`
- Dockerfile Path: `/frontend/Dockerfile`

## Verification

After deploy:

1. Confirm backend health:
   - `GET /health` returns `200`
2. Confirm frontend loads:
   - `/login` returns `200`
3. Confirm the frontend is pointed at the correct production API URL.

## Troubleshooting

If a deploy fails before build starts:

1. Open the Railway service settings.
2. Confirm the service is pointed at the correct root directory.
3. Confirm Dockerfile mode is explicit and the Dockerfile path is set.
4. Re-deploy the service after saving settings.

If a backend Docker build fails on `bcrypt` or another native module:

1. Confirm Railway is using [backend/Dockerfile](./backend/Dockerfile)
2. Confirm the image includes the build tools required by `node-gyp`

## Security Note

Do not store real production secrets in repo documentation. Configure runtime secrets in Railway Variables only.
