export type OnboardingAction =
  | "REGISTER_BIOMETRIC"
  | "ENTER_PHONE"
  | "VERIFY_PHONE"
  | "OPEN_HOME";

export interface Onboarding {
  status: "BIOMETRIC_PENDING" | "PHONE_PENDING" | "PHONE_VERIFICATION_PENDING" | "COMPLETED";
  nextAction: OnboardingAction;
  phoneNumberMasked: string | null;
}

export interface AuthSession {
  accessToken: string;
  expiresIn: number;
  tokenType: "Bearer";
  user: {
    id: string;
    email: string;
    name: string | null;
    biometricRegistered: boolean;
  };
  onboarding: Onboarding;
}

export interface BiometricChallenge {
  challengeId: string;
  publicKey: Record<string, unknown>;
  expiresAt: string;
}

export interface PhoneChallenge {
  challengeId: string;
  phoneNumberMasked: string;
  expiresAt: string;
  resendAvailableAt: string;
}

interface Problem {
  title?: string;
  detail?: string;
  status?: number;
  code?: string;
}

const API_BASE_URL = (import.meta.env?.VITE_API_BASE_URL ?? "/api").replace(/\/+$/, "");

export class ApiError extends Error {
  readonly status: number;
  readonly code?: string;

  constructor(message: string, status: number, code?: string) {
    super(message);
    this.name = "ApiError";
    this.status = status;
    this.code = code;
  }
}

async function request<T>(
  path: string,
  options: {
    method: "GET" | "POST";
    accessToken?: string;
    body?: object;
  },
): Promise<T> {
  let response: Response;

  try {
    response = await fetch(`${API_BASE_URL}${path}`, {
      method: options.method,
      headers: {
        Accept: "application/json, application/problem+json",
        ...(options.body ? { "Content-Type": "application/json" } : {}),
        ...(options.accessToken ? { Authorization: `Bearer ${options.accessToken}` } : {}),
      },
      ...(options.body ? { body: JSON.stringify(options.body) } : {}),
    });
  } catch (error) {
    const detail = error instanceof Error ? error.message : "Error de red desconocido.";
    throw new ApiError(`No se pudo conectar con la API de Minka: ${detail}`, 0);
  }

  if (!response.ok) {
    let problem: Problem | undefined;
    try {
      problem = (await response.json()) as Problem;
    } catch {
      problem = undefined;
    }
    throw new ApiError(
      problem?.detail || problem?.title || `La API respondió con estado ${response.status}.`,
      response.status,
      problem?.code,
    );
  }

  return (await response.json()) as T;
}

export function authenticateWithGoogle(idToken: string, deviceId: string) {
  return request<AuthSession>("/v1/auth/google", {
    method: "POST",
    body: { idToken, deviceId },
  });
}

export function createBiometricRegistrationChallenge(accessToken: string) {
  return request<BiometricChallenge>("/v1/auth/biometric/registration-challenges", {
    method: "POST",
    accessToken,
  });
}

export function registerBiometricCredential(
  accessToken: string,
  challengeId: string,
  credential: Record<string, unknown>,
) {
  return request<{ registered: true; onboarding: Onboarding }>("/v1/auth/biometric/registrations", {
    method: "POST",
    accessToken,
    body: { challengeId, credential },
  });
}

export function getOnboarding(accessToken: string) {
  return request<Onboarding>("/v1/onboarding", {
    method: "GET",
    accessToken,
  });
}

export function sendPhoneVerificationCode(accessToken: string, phoneNumber: string) {
  return request<PhoneChallenge>("/v1/onboarding/phone/challenges", {
    method: "POST",
    accessToken,
    body: { phoneNumber },
  });
}

export function verifyPhoneCode(accessToken: string, challengeId: string, code: string) {
  return request<Onboarding>("/v1/onboarding/phone/verifications", {
    method: "POST",
    accessToken,
    body: { challengeId, code },
  });
}

function decodeBase64Url(value: unknown, field: string): ArrayBuffer {
  if (typeof value !== "string" || value.length === 0) {
    throw new Error(`La respuesta de la API no contiene ${field} válido.`);
  }
  const base64 = value.replace(/-/g, "+").replace(/_/g, "/");
  const binary = atob(base64.padEnd(Math.ceil(base64.length / 4) * 4, "="));
  const bytes = new Uint8Array(binary.length);
  for (let index = 0; index < binary.length; index += 1) {
    bytes[index] = binary.charCodeAt(index);
  }
  return bytes.buffer;
}

export async function createPasskey(publicKey: Record<string, unknown>): Promise<Record<string, unknown>> {
  if (!navigator.credentials?.create || !window.PublicKeyCredential) {
    throw new Error("Este dispositivo o navegador no admite el registro de passkeys.");
  }

  const user = publicKey.user;
  if (!user || typeof user !== "object" || !("id" in user)) {
    throw new Error("La respuesta de la API no contiene datos válidos para crear la passkey.");
  }

  const rp = publicKey.rp;
  if (!rp || typeof rp !== "object" || !("name" in rp) || typeof rp.name !== "string") {
    throw new Error("La respuesta de la API no contiene una relying party WebAuthn válida.");
  }
  if (!("name" in user) || typeof user.name !== "string"
      || !("displayName" in user) || typeof user.displayName !== "string") {
    throw new Error("La respuesta de la API no contiene datos válidos para el usuario WebAuthn.");
  }

  const rawCredentialParameters = publicKey.pubKeyCredParams;
  if (!Array.isArray(rawCredentialParameters)) {
    throw new Error("La respuesta de la API no contiene parámetros WebAuthn válidos.");
  }
  const credentialParameters = rawCredentialParameters.map((item) => {
    if (!item || typeof item !== "object" || !("alg" in item) || typeof item.alg !== "number") {
      throw new Error("La respuesta de la API contiene parámetros WebAuthn inválidos.");
    }
    return { type: "public-key" as const, alg: item.alg };
  });

  const excludeCredentials = Array.isArray(publicKey.excludeCredentials)
    ? publicKey.excludeCredentials.map((item) => {
        if (!item || typeof item !== "object" || !("id" in item)
            || !("type" in item) || item.type !== "public-key") {
          throw new Error("La respuesta de la API contiene una credencial WebAuthn inválida.");
        }
        return {
          type: "public-key" as const,
          id: decodeBase64Url(item.id, "excludeCredentials.id"),
        };
      })
    : undefined;

  const options: PublicKeyCredentialCreationOptions = {
    challenge: decodeBase64Url(publicKey.challenge, "challenge"),
    rp: {
      name: rp.name,
      ...("id" in rp && typeof rp.id === "string" ? { id: rp.id } : {}),
    },
    user: {
      name: user.name,
      displayName: user.displayName,
      ...("icon" in user && typeof user.icon === "string" ? { icon: user.icon } : {}),
      id: decodeBase64Url(user.id, "user.id"),
    },
    pubKeyCredParams: credentialParameters as PublicKeyCredentialParameters[],
    ...(excludeCredentials ? { excludeCredentials } : {}),
    ...(typeof publicKey.timeout === "number" ? { timeout: publicKey.timeout } : {}),
    ...(publicKey.authenticatorSelection && typeof publicKey.authenticatorSelection === "object"
      ? { authenticatorSelection: publicKey.authenticatorSelection as AuthenticatorSelectionCriteria }
      : {}),
    ...(publicKey.attestation === "none"
      || publicKey.attestation === "indirect"
      || publicKey.attestation === "direct"
      || publicKey.attestation === "enterprise"
      ? { attestation: publicKey.attestation }
      : {}),
  };

  const credential = await navigator.credentials.create({ publicKey: options });
  if (!(credential instanceof PublicKeyCredential) || !(credential.response instanceof AuthenticatorAttestationResponse)) {
    throw new Error("El autenticador no devolvió una credencial WebAuthn válida.");
  }

  const encode = (buffer: ArrayBuffer) =>
    btoa(String.fromCharCode(...new Uint8Array(buffer)))
      .replace(/\+/g, "-")
      .replace(/\//g, "_")
      .replace(/=+$/, "");

  return {
    id: credential.id,
    rawId: encode(credential.rawId),
    type: credential.type,
    authenticatorAttachment: credential.authenticatorAttachment,
    response: {
      clientDataJSON: encode(credential.response.clientDataJSON),
      attestationObject: encode(credential.response.attestationObject),
      transports: credential.response.getTransports(),
    },
    clientExtensionResults: credential.getClientExtensionResults(),
  };
}
