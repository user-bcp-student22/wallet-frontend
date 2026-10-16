interface GoogleCredentialResponse {
  credential?: string;
}

interface GooglePromptNotification {
  isNotDisplayed(): boolean;
  getNotDisplayedReason(): string;
}

interface GoogleIdentity {
  initialize(options: {
    client_id: string;
    callback: (response: GoogleCredentialResponse) => void;
  }): void;
  prompt(callback: (notification: GooglePromptNotification) => void): void;
}

declare global {
  interface Window {
    google?: {
      accounts: {
        id: GoogleIdentity;
      };
    };
  }
}

let googleScript: Promise<void> | undefined;

function loadGoogleIdentity(): Promise<void> {
  if (window.google?.accounts.id) {
    return Promise.resolve();
  }
  if (googleScript) {
    return googleScript;
  }

  googleScript = new Promise((resolve, reject) => {
    const script = document.createElement("script");
    script.src = "https://accounts.google.com/gsi/client";
    script.async = true;
    script.defer = true;
    script.onload = () => resolve();
    script.onerror = () => {
      googleScript = undefined;
      reject(new Error("No se pudo cargar el inicio de sesión de Google."));
    };
    document.head.appendChild(script);
  });

  return googleScript;
}

export async function requestGoogleIdToken(clientId: string): Promise<string> {
  await loadGoogleIdentity();
  const identity = window.google?.accounts.id;
  if (!identity) {
    throw new Error("El servicio de inicio de sesión de Google no está disponible.");
  }

  return new Promise((resolve, reject) => {
    let settled = false;
    const finish = (callback: () => void) => {
      if (settled) return;
      settled = true;
      window.clearTimeout(timeout);
      callback();
    };
    const timeout = window.setTimeout(
      () => finish(() => reject(new Error("No se recibió una respuesta de Google. Inténtalo nuevamente."))),
      120_000,
    );

    identity.initialize({
      client_id: clientId,
      callback: ({ credential }) => {
        if (!credential) {
          finish(() => reject(new Error("Google no devolvió un token de identidad.")));
          return;
        }
        finish(() => resolve(credential));
      },
    });
    identity.prompt((notification) => {
      if (notification.isNotDisplayed()) {
        finish(() =>
          reject(
            new Error(
              `Google no pudo mostrar la autenticación (${notification.getNotDisplayedReason()}).`,
            ),
          ),
        );
      }
    });
  });
}
