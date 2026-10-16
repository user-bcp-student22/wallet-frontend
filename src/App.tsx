import { useEffect, useRef, useState } from "react";
import {
  ApiError,
  authenticateWithGoogle,
  createBiometricRegistrationChallenge,
  createPasskey,
  getOnboarding,
  registerBiometricCredential,
  sendPhoneVerificationCode,
  verifyFacialIdentity,
  verifyPhoneCode,
  type AuthSession,
  type Onboarding,
  type PhoneChallenge,
} from "./api";
import { requestGoogleIdToken } from "./googleIdentity";

type Step = "access" | "biometric" | "phone" | "code" | "success" | "home";
type BiometricAction = "register" | "facial";
type IconName =
  | "arrow"
  | "back"
  | "check"
  | "face"
  | "google"
  | "help"
  | "lock"
  | "pay"
  | "phone"
  | "shield"
  | "wallet";

const onboardingSteps = [
  { id: "access", label: "Acceso" },
  { id: "biometric", label: "Biometría" },
  { id: "phone", label: "Celular" },
] as const;

const stepNumber: Record<Step, number> = {
  access: 0,
  biometric: 1,
  phone: 2,
  code: 2,
  success: 3,
  home: 3,
};

function Icon({ name, size = 20 }: { name: IconName; size?: number }) {
  const common = {
    width: size,
    height: size,
    viewBox: "0 0 24 24",
    fill: "none",
    xmlns: "http://www.w3.org/2000/svg",
    "aria-hidden": true,
  };

  if (name === "google") {
    return (
      <svg {...common} viewBox="0 0 24 24">
        <path fill="#4285F4" d="M21.6 12.23c0-.71-.06-1.4-.18-2.07H12v3.91h5.38a4.6 4.6 0 0 1-2 3.02v2.54h3.24c1.9-1.75 2.98-4.32 2.98-7.4Z" />
        <path fill="#34A853" d="M12 22c2.7 0 4.98-.9 6.63-2.43l-3.25-2.53c-.9.6-2.05.96-3.38.96-2.61 0-4.82-1.76-5.61-4.13H3.04v2.6A10 10 0 0 0 12 22Z" />
        <path fill="#FBBC05" d="M6.39 13.87A6 6 0 0 1 6.07 12c0-.65.11-1.28.32-1.87v-2.6H3.04A10 10 0 0 0 2 12c0 1.61.39 3.14 1.04 4.47l3.35-2.6Z" />
        <path fill="#EA4335" d="M12 6c1.47 0 2.79.51 3.82 1.5l2.88-2.87A9.65 9.65 0 0 0 12 2a10 10 0 0 0-8.96 5.53l3.35 2.6C7.18 7.76 9.39 6 12 6Z" />
      </svg>
    );
  }

  const paths: Record<Exclude<IconName, "google">, React.ReactNode> = {
    arrow: <path d="m9 18 6-6-6-6" />,
    back: <path d="m15 18-6-6 6-6" />,
    check: <path d="m5 12 4 4L19 6" />,
    face: (
      <>
        <path d="M8 3H5a2 2 0 0 0-2 2v3M16 3h3a2 2 0 0 1 2 2v3M8 21H5a2 2 0 0 1-2-2v-3M16 21h3a2 2 0 0 0 2-2v-3" />
        <path d="M9 10h.01M15 10h.01M9 15c1.6 1.2 4.4 1.2 6 0" />
      </>
    ),
    help: (
      <>
        <circle cx="12" cy="12" r="9" />
        <path d="M9.8 9a2.3 2.3 0 1 1 3.3 2.1c-.8.4-1.1.9-1.1 1.6M12 16.5h.01" />
      </>
    ),
    lock: (
      <>
        <rect x="5" y="10" width="14" height="11" rx="3" />
        <path d="M8 10V7a4 4 0 0 1 8 0v3M12 14v3" />
      </>
    ),
    pay: (
      <>
        <rect x="3" y="5" width="18" height="14" rx="3" />
        <path d="M3 10h18M7 15h3" />
      </>
    ),
    phone: (
      <>
        <rect x="6" y="2" width="12" height="20" rx="3" />
        <path d="M10 18h4" />
      </>
    ),
    shield: (
      <>
        <path d="M12 2 20 5v6c0 5-3.4 8.5-8 11-4.6-2.5-8-6-8-11V5l8-3Z" />
        <path d="m9 12 2 2 4-4" />
      </>
    ),
    wallet: (
      <>
        <path d="M4 6.5A2.5 2.5 0 0 1 6.5 4H18a2 2 0 0 1 2 2v14H6a3 3 0 0 1-3-3V7" />
        <path d="M3 8h17M15 12h6v5h-6a2.5 2.5 0 0 1 0-5Z" />
      </>
    ),
  };

  return (
    <svg {...common} stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
      {paths[name as Exclude<IconName, "google">]}
    </svg>
  );
}

function track(event: string, properties: Record<string, unknown> = {}) {
  const entry = {
    event,
    timestamp: new Date().toISOString(),
    market: "PE",
    cohort: "mvp",
    acquisitionChannel: "organic",
    acquisitionSpendPen: 0,
    ...properties,
  };
  const history = JSON.parse(localStorage.getItem("minka_analytics") || "[]");
  localStorage.setItem("minka_analytics", JSON.stringify([...history, entry]));
  window.dispatchEvent(new CustomEvent("wallet-analytics", { detail: entry }));
}

function Button({
  children,
  icon,
  onClick,
  disabled = false,
  variant = "primary",
  type = "button",
}: {
  children: React.ReactNode;
  icon?: IconName;
  onClick?: () => void;
  disabled?: boolean;
  variant?: "primary" | "secondary" | "ghost";
  type?: "button" | "submit";
}) {
  return (
    <button
      className={`button button-${variant}${icon === "google" ? " button-google" : ""}${icon === "face" ? " button-biometric" : ""}`}
      disabled={disabled}
      onClick={onClick}
      type={type}
    >
      {icon && <Icon name={icon} size={21} />}
      <span>{children}</span>
      {variant === "primary" && !icon && <Icon name="arrow" size={20} />}
    </button>
  );
}

function Brand() {
  return (
    <div className="brand" aria-label="Minka">
      <span className="brand-mark"><Icon name="wallet" size={18} /></span>
      <span>Minka</span>
    </div>
  );
}

function Header({ onBack, help = true }: { onBack?: () => void; help?: boolean }) {
  return (
    <header className="topbar">
      {onBack ? (
        <button className="icon-button" onClick={onBack} aria-label="Volver">
          <Icon name="back" />
        </button>
      ) : (
        <Brand />
      )}
      {help && (
        <button className="help-button" type="button">
          <Icon name="help" size={18} />
          <span>Ayuda</span>
        </button>
      )}
    </header>
  );
}

function Progress({ current }: { current: number }) {
  const totalSteps = onboardingSteps.length;
  return (
    <section className="progress-section" aria-label={`Paso ${Math.min(current + 1, totalSteps)} de ${totalSteps}`}>
      <div className="progress-heading">
        <span>Configura tu cuenta</span>
        <span>{Math.min(current + 1, totalSteps)} de {totalSteps}</span>
      </div>
      <div className="progress-track">
        {onboardingSteps.map((item, index) => (
          <div className="progress-item" key={item.id}>
            <span className={`progress-line ${index <= current ? "is-active" : ""}`} />
            <span className={index === current ? "progress-label is-current" : "progress-label"}>
              {index < current ? <Icon name="check" size={13} /> : null}
              {item.label}
            </span>
          </div>
        ))}
      </div>
    </section>
  );
}

function ScreenShell({
  step,
  onBack,
  children,
}: {
  step: Step;
  onBack?: () => void;
  children: React.ReactNode;
}) {
  return (
    <main className="app-shell">
      <Header onBack={onBack} />
      <Progress current={stepNumber[step]} />
      <div className="content">{children}</div>
      <footer className="trust-footer">
        <Icon name="shield" size={16} />
        <span>Tus datos están protegidos y cifrados</span>
      </footer>
    </main>
  );
}

function Intro({
  onGoogleLogin,
  onLocalLogin,
  googleConfigured,
  busy,
  error,
}: {
  onGoogleLogin: () => void;
  onLocalLogin: () => void;
  googleConfigured: boolean;
  busy: boolean;
  error: string;
}) {
  return (
    <ScreenShell step="access">
      <section className="hero-copy">
        <span className="eyebrow">Lista en menos de 3 minutos</span>
        <h1>Tu plata, lista para moverse</h1>
        <p>Crea tu wallet y paga al instante, sin papeleos ni complicaciones.</p>
      </section>

      <div className="wallet-visual" aria-hidden="true">
        <div className="orbit orbit-one" />
        <div className="orbit orbit-two" />
        <div className="wallet-card">
          <span className="card-brand">minka</span>
          <span className="contactless">)))</span>
          <span className="card-balance">S/ 0.00</span>
          <span className="card-caption">Tu nueva wallet</span>
        </div>
        <span className="floating-check"><Icon name="check" size={20} /></span>
      </div>

      <section className="action-stack">
        <Button
          variant="primary"
          icon="google"
          onClick={onGoogleLogin}
          disabled={!googleConfigured || busy}
        >
          {busy ? "Conectando..." : "Continuar con Google"}
        </Button>
        {import.meta.env.DEV && (
          <Button variant="secondary" onClick={onLocalLogin} disabled={busy}>
            Probar con backend local
          </Button>
        )}
      </section>
      {!googleConfigured && !import.meta.env.DEV && (
        <p className="field-hint">El inicio con Google no está configurado para este entorno.</p>
      )}
      {import.meta.env.DEV && !googleConfigured && (
        <p className="field-hint">Modo de desarrollo: el botón de prueba usa el proveedor mock del backend.</p>
      )}
      {error && <p className="error-message" role="alert"><span>!</span>{error}</p>}
      <p className="legal-copy">
        Al continuar, aceptas nuestros <button>Términos</button> y <button>Política de privacidad</button>.
      </p>
    </ScreenShell>
  );
}

function BiometricStep({
  onRegister,
  onBack,
  busy,
  error,
  action,
  localMode,
}: {
  onRegister: () => void;
  onBack: () => void;
  busy: boolean;
  error: string;
  action: BiometricAction;
  localMode: boolean;
}) {
  return (
    <ScreenShell step="biometric" onBack={onBack}>
      <section className="step-heading">
        <span className="step-icon"><Icon name="face" size={24} /></span>
        <h1>Autenticación biométrica</h1>
        <p>
          {action === "register"
            ? "Confirma con el autenticador seguro de este dispositivo para proteger tu cuenta."
            : "Confirma para continuar. Esta verificación no captura datos biométricos ni valida tu identidad real."}
        </p>
      </section>
      <div className="action-stack">
        <Button variant="primary" icon="face" onClick={onRegister} disabled={busy}>
          {busy
            ? action === "register" ? "Esperando al dispositivo..." : "Verificando..."
            : action === "register" ? "Autenticar con biometría" : "Continuar"}
        </Button>
      </div>
      <p className="field-hint">
        {localMode
          ? "Esta vista local permite avanzar, pero no registra una passkey ni confirma tu identidad."
          : "Tu dispositivo puede solicitar rostro, huella o su método local de desbloqueo. La biometría no se envía a Minka."}
      </p>
      {error && <p className="error-message" role="alert"><span>!</span>{error}</p>}
    </ScreenShell>
  );
}

function PhoneStep({
  onNext,
  onBack,
  busy,
  error: apiError,
}: {
  onNext: (phone: string) => void;
  onBack: () => void;
  busy: boolean;
  error: string;
}) {
  const [phone, setPhone] = useState("");
  const [error, setError] = useState("");

  const submit = (event: React.FormEvent) => {
    event.preventDefault();
    if (phone.length !== 9 || !phone.startsWith("9")) {
      setError("Ingresa un celular válido de 9 dígitos que empiece con 9.");
      return;
    }
    onNext(phone);
  };

  return (
    <ScreenShell step="phone" onBack={onBack}>
      <section className="step-heading">
        <span className="step-icon"><Icon name="phone" size={24} /></span>
        <h1>Verifica tu celular</h1>
        <p>Te enviaremos un código por SMS para confirmar que este número es tuyo.</p>
      </section>
      <form className="step-form" onSubmit={submit} noValidate>
        <label htmlFor="phone">Número de celular</label>
        <div className={`phone-field ${error ? "field-error" : ""}`}>
          <span className="country-prefix">
            <span className="flag-pe" aria-hidden="true"><i /><i /><i /></span>
            +51
          </span>
          <input
            id="phone"
            autoFocus
            type="tel"
            inputMode="numeric"
            autoComplete="tel-national"
            placeholder="999 999 999"
            value={phone.replace(/(\d{3})(?=\d)/g, "$1 ")}
            onChange={(event) => {
              setPhone(event.target.value.replace(/\D/g, "").slice(0, 9));
              setError("");
            }}
            aria-describedby={error ? "phone-error" : "phone-hint"}
            aria-invalid={Boolean(error)}
          />
        </div>
        {error ? (
          <p className="error-message" id="phone-error" role="alert">
            <span>!</span>{error}
          </p>
        ) : (
          <p className="field-hint" id="phone-hint">Usaremos este número para proteger tu cuenta.</p>
        )}
        {apiError && <p className="error-message" role="alert"><span>!</span>{apiError}</p>}
        <div className="form-spacer" />
        <Button type="submit" disabled={busy}>{busy ? "Enviando..." : "Enviar código"}</Button>
      </form>
    </ScreenShell>
  );
}

function CodeStep({
  challenge,
  onNext,
  onResend,
  onBack,
  busy,
  error: apiError,
}: {
  challenge: PhoneChallenge;
  onNext: (code: string) => void;
  onResend: () => void;
  onBack: () => void;
  busy: boolean;
  error: string;
}) {
  const [digits, setDigits] = useState(["", "", "", "", "", ""]);
  const [error, setError] = useState("");
  const [seconds, setSeconds] = useState(() =>
    Math.max(0, Math.ceil((new Date(challenge.resendAvailableAt).getTime() - Date.now()) / 1000)),
  );
  const inputs = useRef<Array<HTMLInputElement | null>>([]);

  useEffect(() => {
    setSeconds(Math.max(0, Math.ceil((new Date(challenge.resendAvailableAt).getTime() - Date.now()) / 1000)));
    setDigits(["", "", "", "", "", ""]);
  }, [challenge]);

  useEffect(() => {
    if (seconds <= 0) return;
    const timer = window.setTimeout(() => setSeconds(seconds - 1), 1000);
    return () => window.clearTimeout(timer);
  }, [seconds]);

  const updateDigit = (value: string, index: number) => {
    const number = value.replace(/\D/g, "").slice(-1);
    const next = [...digits];
    next[index] = number;
    setDigits(next);
    setError("");
    if (number && index < 5) inputs.current[index + 1]?.focus();
  };

  const verify = (event: React.FormEvent) => {
    event.preventDefault();
    const code = digits.join("");
    if (code.length !== 6) {
      setError("Completa los 6 dígitos del código que recibiste.");
      return;
    }
    onNext(code);
  };

  return (
    <ScreenShell step="code" onBack={onBack}>
      <section className="step-heading">
        <span className="step-icon message-icon"><Icon name="shield" size={24} /></span>
        <h1>Revisa tus mensajes</h1>
        <p>Ingresa el código de 6 dígitos que enviamos al <strong>{challenge.phoneNumberMasked}</strong>.</p>
      </section>
      <form className="step-form" onSubmit={verify}>
        <label htmlFor="digit-0">Código de verificación</label>
        <div className="code-grid">
          {digits.map((digit, index) => (
            <input
              key={index}
              id={`digit-${index}`}
              ref={(node) => { inputs.current[index] = node; }}
              value={digit}
              inputMode="numeric"
              autoComplete={index === 0 ? "one-time-code" : "off"}
              onChange={(event) => updateDigit(event.target.value, index)}
              onKeyDown={(event) => {
                if (event.key === "Backspace" && !digits[index] && index > 0) inputs.current[index - 1]?.focus();
              }}
              aria-label={`Dígito ${index + 1}`}
              className={error ? "field-error" : ""}
            />
          ))}
        </div>
        {error && <p className="error-message" role="alert"><span>!</span>{error}</p>}
        {apiError && <p className="error-message" role="alert"><span>!</span>{apiError}</p>}
        <div className="resend-row">
          <span>¿No recibiste el código?</span>
          {seconds > 0 ? (
            <strong>Reenviar en 0:{String(seconds).padStart(2, "0")}</strong>
          ) : (
            <button type="button" onClick={onResend} disabled={busy}>Reenviar código</button>
          )}
        </div>
        <div className="form-spacer" />
        <Button type="submit" disabled={busy}>{busy ? "Verificando..." : "Verificar celular"}</Button>
      </form>
    </ScreenShell>
  );
}

function Success({ onNext, name }: { onNext: () => void; name: string }) {
  useEffect(() => {
    track("onboarding_flow_closed", { outcome: "success" });
  }, []);

  return (
    <main className="app-shell success-screen">
      <Header help={false} />
      <section className="success-content">
        <div className="success-badge">
          <span><Icon name="check" size={42} /></span>
        </div>
        <span className="status-pill"><i /> Registro completado</span>
        <h1>¡Todo listo{name ? `, ${name}` : ""}!</h1>
        <p>Tu identidad y celular fueron verificados correctamente.</p>
      </section>
      <div className="success-action">
        <Button onClick={onNext}>Ir a mi wallet</Button>
        <p><Icon name="lock" size={14} /> Tu cuenta está protegida</p>
      </div>
    </main>
  );
}

function Home({ name }: { name: string }) {
  return (
    <main className="app-shell home-screen">
      <header className="home-header">
        <Brand />
        <button className="avatar" aria-label="Abrir perfil">{name.slice(0, 1).toUpperCase() || "M"}</button>
      </header>
      <section className="welcome-row">
        <div><span>Bienvenido/a,</span><h1>{name || "a Minka"}</h1></div>
        <span className="active-badge"><i /> Registro completo</span>
      </section>
      <p className="field-hint">Vista de demostración: el contrato actual no expone saldo ni movimientos.</p>
      <section className="balance-card">
        <div className="balance-top"><span>Saldo disponible</span><Icon name="shield" size={18} /></div>
        <strong>S/ 0.00</strong>
        <span>Cuenta principal · PEN</span>
      </section>
      <section className="quick-actions">
        <button><span><Icon name="pay" size={23} /></span><strong>Pagar</strong><small>Con QR o celular</small></button>
        <button><span><Icon name="arrow" size={23} /></span><strong>Transferir</strong><small>Al instante</small></button>
      </section>
      <section className="empty-activity">
        <div className="section-title"><h2>Actividad reciente</h2><button>Ver todo</button></div>
        <div className="empty-icon"><Icon name="wallet" size={25} /></div>
        <strong>Aún no hay movimientos</strong>
        <p>Tus pagos y transferencias aparecerán aquí.</p>
      </section>
      <nav className="bottom-nav" aria-label="Navegación principal">
        <button className="is-active"><Icon name="wallet" size={21} /><span>Inicio</span></button>
        <button><Icon name="pay" size={21} /><span>Movimientos</span></button>
        <button><Icon name="help" size={21} /><span>Ayuda</span></button>
      </nav>
    </main>
  );
}

export default function App() {
  const [step, setStep] = useState<Step>("access");
  const [phone, setPhone] = useState("");
  const [challenge, setChallenge] = useState<PhoneChallenge | null>(null);
  const [accessToken, setAccessToken] = useState(() => sessionStorage.getItem("minka_access_token") ?? "");
  const [accountName, setAccountName] = useState("");
  const [busy, setBusy] = useState(false);
  const [apiError, setApiError] = useState("");
  const [localDemo, setLocalDemo] = useState(false);
  const [biometricAction, setBiometricAction] = useState<BiometricAction>("register");
  const googleClientId = import.meta.env.VITE_GOOGLE_CLIENT_ID as string | undefined;

  const showNextStep = (onboarding: Onboarding, localMode = localDemo) => {
    switch (onboarding.nextAction) {
      case "REGISTER_BIOMETRIC":
        setBiometricAction("register");
        setStep("biometric");
        break;
      case "VERIFY_FACIAL_IDENTITY":
        setBiometricAction("facial");
        setStep("biometric");
        break;
      case "ENTER_PHONE":
        setStep("phone");
        break;
      case "VERIFY_PHONE":
        setStep("phone");
        break;
      case "OPEN_HOME":
        if (onboarding.status !== "COMPLETED") {
          setApiError("La API indicó OPEN_HOME sin completar el registro.");
          setStep("access");
          return;
        }
        track("onboarding_completed", { status: onboarding.status });
        setStep("success");
        break;
    }
  };

  useEffect(() => {
    if (!accessToken) return;
    let active = true;
    setBusy(true);
    getOnboarding(accessToken)
      .then((onboarding) => {
        if (active) showNextStep(onboarding);
      })
      .catch((error: unknown) => {
        if (!active) return;
        if (error instanceof ApiError && error.status === 401) {
          sessionStorage.removeItem("minka_access_token");
          setAccessToken("");
        }
        setApiError(error instanceof Error ? error.message : "No se pudo restaurar la sesión.");
      })
      .finally(() => {
        if (active) setBusy(false);
      });
    return () => {
      active = false;
    };
  }, []);

  const handleAuthentication = async (idToken: string, useLocalDemo = false) => {
    setLocalDemo(useLocalDemo);
    setBusy(true);
    setApiError("");
    try {
      const session = await authenticateWithGoogle(idToken, getDeviceId());
      saveSession(session);
      applySession(session, useLocalDemo);
      track("onboarding_started", { method: googleClientId ? "google" : "local_mock" });
    } catch (error) {
      setApiError(error instanceof Error ? error.message : "No se pudo iniciar sesión.");
    } finally {
      setBusy(false);
    }
  };

  const handleGoogleLogin = async () => {
    if (!googleClientId) {
      setApiError("Configura VITE_GOOGLE_CLIENT_ID para usar el inicio real con Google.");
      return;
    }
    setBusy(true);
    setApiError("");
    try {
      const idToken = await requestGoogleIdToken(googleClientId);
      await handleAuthentication(idToken, false);
    } catch (error) {
      setApiError(error instanceof Error ? error.message : "No se pudo iniciar sesión con Google.");
      setBusy(false);
    }
  };

  const handleRegisterPasskey = async () => {
    if (localDemo) {
      setApiError("");
      setStep("phone");
      return;
    }
    setBusy(true);
    setApiError("");
    try {
      const biometricChallenge = await createBiometricRegistrationChallenge(accessToken);
      const credential = await createPasskey(biometricChallenge.publicKey);
      const result = await registerBiometricCredential(
        accessToken,
        biometricChallenge.challengeId,
        credential,
      );
      track("onboarding_step_completed", { step: "passkey_registered" });
      if (result.onboarding.nextAction === "VERIFY_FACIAL_IDENTITY") {
        const facialResult = await verifyFacialIdentity(accessToken);
        track("onboarding_step_completed", {
          step: "facial_verification",
          result: facialResult.result,
        });
        if (facialResult.result === "NOT_APPROVED") {
          setApiError("La verificación no fue aprobada. Puedes volver a intentarlo.");
        }
        showNextStep(facialResult.onboarding);
      } else {
        showNextStep(result.onboarding);
      }
    } catch (error) {
      handleSessionError(error);
    } finally {
      setBusy(false);
    }
  };

  const handleSendCode = async (value: string) => {
    setBusy(true);
    setApiError("");
    try {
      const phoneChallenge = await sendPhoneVerificationCode(accessToken, `+51${value}`);
      setPhone(value);
      setChallenge(phoneChallenge);
      setStep("code");
      track("onboarding_step_completed", { step: "phone_entered" });
    } catch (error) {
      handleSessionError(error);
    } finally {
      setBusy(false);
    }
  };

  const handleResendCode = async () => {
    setBusy(true);
    setApiError("");
    try {
      setChallenge(await sendPhoneVerificationCode(accessToken, `+51${phone}`));
    } catch (error) {
      handleSessionError(error);
    } finally {
      setBusy(false);
    }
  };

  const handleVerifyCode = async (code: string) => {
    if (!challenge) {
      setApiError("No hay un desafío SMS activo. Solicita un código nuevo.");
      setStep("phone");
      return;
    }
    setBusy(true);
    setApiError("");
    try {
      const onboarding = await verifyPhoneCode(accessToken, challenge.challengeId, code);
      track("onboarding_step_completed", { step: "phone_verified" });
      showNextStep(onboarding);
    } catch (error) {
      handleSessionError(error);
    } finally {
      setBusy(false);
    }
  };

  const applySession = (session: AuthSession, localMode = false) => {
    setAccessToken(session.accessToken);
    setAccountName(session.user.name ?? "");
    showNextStep(session.onboarding, localMode);
  };

  const handleSessionError = (error: unknown) => {
    if (error && typeof error === "object" && "status" in error && error.status === 401) {
      sessionStorage.removeItem("minka_access_token");
      setAccessToken("");
      setStep("access");
    }
    setApiError(error instanceof Error ? error.message : "La solicitud a la API falló.");
  };

  return (
    <div className="page-frame">
      {step === "access" && (
        <Intro
          onGoogleLogin={handleGoogleLogin}
          onLocalLogin={() => void handleAuthentication("mock-google-token-local-demo", true)}
          googleConfigured={Boolean(googleClientId)}
          busy={busy}
          error={apiError}
        />
      )}
      {step === "biometric" && (
        <BiometricStep
          onBack={() => setStep("access")}
          onRegister={handleRegisterPasskey}
          busy={busy}
          error={apiError}
          action={biometricAction}
          localMode={localDemo}
        />
      )}
      {step === "phone" && (
        <PhoneStep
          onBack={() => setStep("access")}
          onNext={(value) => void handleSendCode(value)}
          busy={busy}
          error={apiError}
        />
      )}
      {step === "code" && challenge && (
        <CodeStep
          challenge={challenge}
          onBack={() => setStep("phone")}
          onNext={(code) => void handleVerifyCode(code)}
          onResend={() => void handleResendCode()}
          busy={busy}
          error={apiError}
        />
      )}
      {step === "success" && <Success name={accountName} onNext={() => setStep("home")} />}
      {step === "home" && <Home name={accountName} />}
    </div>
  );
}

function getDeviceId(): string {
  const existing = localStorage.getItem("minka_device_id");
  if (existing) return existing;
  const deviceId = crypto.randomUUID();
  localStorage.setItem("minka_device_id", deviceId);
  return deviceId;
}

function saveSession(session: AuthSession) {
  sessionStorage.setItem("minka_access_token", session.accessToken);
}
