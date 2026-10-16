import assert from "node:assert/strict";
import { test } from "node:test";
import {
  authenticateWithGoogle,
  createBiometricRegistrationChallenge,
  getOnboarding,
  registerBiometricCredential,
  sendPhoneVerificationCode,
  verifyFacialIdentity,
  verifyPhoneCode,
} from "./api.ts";

interface CapturedRequest {
  url: string;
  init: RequestInit;
}

async function captureRequest<T>(
  responseBody: object,
  status: number,
  action: () => Promise<T>,
): Promise<{ result: T; request: CapturedRequest }> {
  const originalFetch = globalThis.fetch;
  let request: CapturedRequest | undefined;
  globalThis.fetch = async (input, init) => {
    request = { url: String(input), init: init ?? {} };
    return new Response(JSON.stringify(responseBody), {
      status,
      headers: { "Content-Type": status >= 400 ? "application/problem+json" : "application/json" },
    });
  };

  try {
    const result = await action();
    assert.ok(request, "API request was not sent");
    return { result, request };
  } finally {
    globalThis.fetch = originalFetch;
  }
}

test("Google authentication follows the OpenAPI request and response contract", async () => {
  const body = {
    accessToken: "jwt-token",
    expiresIn: 900,
    tokenType: "Bearer",
    user: { id: "user-1", email: "user@example.test", name: "Test User", biometricRegistered: false },
    onboarding: {
      status: "BIOMETRIC_PENDING",
      nextAction: "REGISTER_BIOMETRIC",
      phoneNumberMasked: null,
    },
  };
  const { result, request } = await captureRequest(body, 200, () =>
    authenticateWithGoogle("mock-google-token-local-demo", "device-test"),
  );

  assert.equal(request.url, "/api/v1/auth/google");
  assert.equal(request.init.method, "POST");
  assert.deepEqual(JSON.parse(String(request.init.body)), {
    idToken: "mock-google-token-local-demo",
    deviceId: "device-test",
  });
  assert.equal(new Headers(request.init.headers).get("Authorization"), null);
  assert.equal(result.onboarding.nextAction, "REGISTER_BIOMETRIC");
});

test("all authenticated onboarding operations use their OpenAPI paths and bearer token", async () => {
  const token = "session-jwt";
  const onboarding = {
    status: "PHONE_PENDING" as const,
    nextAction: "ENTER_PHONE" as const,
    phoneNumberMasked: null,
  };
  const facialPending = {
    status: "FACIAL_VERIFICATION_PENDING" as const,
    nextAction: "VERIFY_FACIAL_IDENTITY" as const,
    phoneNumberMasked: null,
  };
  const challenge = {
    challengeId: "phone-challenge-1",
    phoneNumberMasked: "+51 999 *** 999",
    expiresAt: "2026-10-16T20:00:00Z",
    resendAvailableAt: "2026-10-16T19:59:00Z",
  };
  const cases: Array<{
    path: string;
    run: () => Promise<unknown>;
    method: string;
    body?: object;
  }> = [
    {
      path: "/api/v1/auth/biometric/registration-challenges",
      run: () => createBiometricRegistrationChallenge(token),
      method: "POST",
    },
    {
      path: "/api/v1/auth/biometric/registrations",
      run: () =>
        registerBiometricCredential(token, "credential-challenge-1", {
          id: "credential-1",
          type: "public-key",
        }),
      method: "POST",
      body: {
        challengeId: "credential-challenge-1",
        credential: { id: "credential-1", type: "public-key" },
      },
    },
    {
      path: "/api/v1/onboarding/facial-verifications",
      run: () => verifyFacialIdentity(token),
      method: "POST",
    },
    {
      path: "/api/v1/onboarding",
      run: () => getOnboarding(token),
      method: "GET",
    },
    {
      path: "/api/v1/onboarding/phone/challenges",
      run: () => sendPhoneVerificationCode(token, "+51999999999"),
      method: "POST",
      body: { phoneNumber: "+51999999999" },
    },
    {
      path: "/api/v1/onboarding/phone/verifications",
      run: () => verifyPhoneCode(token, "phone-challenge-1", "482913"),
      method: "POST",
      body: { challengeId: "phone-challenge-1", code: "482913" },
    },
  ];

  for (const { path, run, method, body } of cases) {
    const responseBody = path.includes("/phone/challenges")
      ? challenge
      : path.includes("/facial-verifications")
        ? { result: "APPROVED", onboarding }
        : path.includes("/biometric/registrations")
          ? { registered: true, onboarding: facialPending }
          : onboarding;
    const { request } = await captureRequest(responseBody, path.includes("/phone/challenges") ? 201 : 200, run);
    assert.equal(request.url, path);
    assert.equal(request.init.method, method);
    assert.equal(new Headers(request.init.headers).get("Authorization"), `Bearer ${token}`);
    if (body) assert.deepEqual(JSON.parse(String(request.init.body)), body);
  }
});

test("RFC 9457 problem details are surfaced to the caller", async () => {
  const problem = {
    type: "about:blank",
    title: "Invalid state",
    status: 409,
    code: "INVALID_STATE",
    detail: "Complete the passkey step first.",
  };
  const originalFetch = globalThis.fetch;
  globalThis.fetch = async () =>
    new Response(JSON.stringify(problem), {
      status: 409,
      headers: { "Content-Type": "application/problem+json" },
    });

  try {
    await assert.rejects(
      createBiometricRegistrationChallenge("expired-token"),
      (error: unknown) => {
        assert.equal(error instanceof Error ? error.message : "", problem.detail);
        assert.equal("status" in (error as object) ? (error as { status: number }).status : undefined, 409);
        return true;
      },
    );
  } finally {
    globalThis.fetch = originalFetch;
  }
});
