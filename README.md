# Wallet frontend

## API integration

The onboarding client in `src/api.ts` follows the contract at
`../wallet-backend-api/openapi.yaml`: Google authentication, passkey challenge
and registration, onboarding status, SMS challenge, and SMS verification.
Authenticated requests use the returned bearer token. RFC 9457 API errors are
shown in the current onboarding screen; credentials and SMS codes are not
hard-coded.

For local development, the Vite `/api` proxy targets
`http://localhost:8080`. Override it with `WALLET_API_PROXY_TARGET`, or set
`VITE_API_BASE_URL` to an API origin when building for another environment.
Real Google sign-in requires `VITE_GOOGLE_CLIENT_ID`. Without it, the
development-only “Probar con backend local” button uses the backend's mock
Google identity provider; it is not a production login.

Run the frontend from this directory:

```sh
npm run dev
npm test
npm run build
```

The backend project is nested at `../wallet-backend-api`. The checked-in
backend currently implements `POST /v1/auth/google`; the passkey, onboarding,
and SMS endpoints in the OpenAPI contract are not implemented there yet.
Those actions therefore return the backend's HTTP error until the corresponding
backend endpoints are delivered.
