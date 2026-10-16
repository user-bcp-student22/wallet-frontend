import { useEffect, useRef, useState } from "react";

type Step = "access" | "phone" | "code" | "pin" | "success" | "home";
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
  { id: "phone", label: "Celular" },
  { id: "pin", label: "PIN" },
] as const;

const stepNumber: Record<Step, number> = {
  access: 0,
  phone: 1,
  code: 1,
  pin: 2,
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
    <button className={`button button-${variant}`} disabled={disabled} onClick={onClick} type={type}>
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
  return (
    <section className="progress-section" aria-label={`Paso ${Math.min(current + 1, 3)} de 3`}>
      <div className="progress-heading">
        <span>Configura tu cuenta</span>
        <span>{Math.min(current + 1, 3)} de 3</span>
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

function Intro({ onContinue }: { onContinue: () => void }) {
  const [scanning, setScanning] = useState(false);

  const biometric = () => {
    setScanning(true);
    window.setTimeout(() => {
      track("onboarding_started", { method: "face_id" });
      onContinue();
    }, 900);
  };

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
          variant="secondary"
          icon="google"
          onClick={() => {
            track("onboarding_started", { method: "google" });
            onContinue();
          }}
        >
          Continuar con Google
        </Button>
        <Button variant="primary" icon="face" onClick={biometric} disabled={scanning}>
          {scanning ? "Verificando rostro..." : "Ingresar con reconocimiento facial"}
        </Button>
      </section>
      <p className="legal-copy">
        Al continuar, aceptas nuestros <button>Términos</button> y <button>Política de privacidad</button>.
      </p>
    </ScreenShell>
  );
}

function PhoneStep({ onNext, onBack }: { onNext: (phone: string) => void; onBack: () => void }) {
  const [phone, setPhone] = useState("");
  const [error, setError] = useState("");

  const submit = (event: React.FormEvent) => {
    event.preventDefault();
    if (phone.length !== 9 || !phone.startsWith("9")) {
      setError("Ingresa un celular válido de 9 dígitos que empiece con 9.");
      return;
    }
    track("onboarding_step_completed", { step: "phone_entered" });
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
        <div className="form-spacer" />
        <Button type="submit">Enviar código</Button>
      </form>
    </ScreenShell>
  );
}

function CodeStep({ phone, onNext, onBack }: { phone: string; onNext: () => void; onBack: () => void }) {
  const [digits, setDigits] = useState(["", "", "", "", "", ""]);
  const [error, setError] = useState("");
  const [seconds, setSeconds] = useState(38);
  const inputs = useRef<Array<HTMLInputElement | null>>([]);

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
    if (code !== "482913") {
      setError("Ese código no coincide. Revísalo o solicita uno nuevo.");
      return;
    }
    track("onboarding_step_completed", { step: "phone_verified" });
    onNext();
  };

  const masked = `${phone.slice(0, 3)} *** ${phone.slice(-3)}`;

  return (
    <ScreenShell step="code" onBack={onBack}>
      <section className="step-heading">
        <span className="step-icon message-icon"><Icon name="shield" size={24} /></span>
        <h1>Revisa tus mensajes</h1>
        <p>Ingresa el código de 6 dígitos que enviamos al <strong>+51 {masked}</strong>.</p>
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
        <div className="resend-row">
          <span>¿No recibiste el código?</span>
          {seconds > 0 ? (
            <strong>Reenviar en 0:{String(seconds).padStart(2, "0")}</strong>
          ) : (
            <button type="button" onClick={() => { setSeconds(38); setError(""); }}>Reenviar código</button>
          )}
        </div>
        <p className="demo-note">Para esta demo, usa el código <strong>482913</strong></p>
        <div className="form-spacer" />
        <Button type="submit">Verificar celular</Button>
      </form>
    </ScreenShell>
  );
}

function PinStep({ onNext, onBack }: { onNext: () => void; onBack: () => void }) {
  const [pin, setPin] = useState("");
  const [confirming, setConfirming] = useState(false);
  const [firstPin, setFirstPin] = useState("");
  const [error, setError] = useState("");

  const add = (digit: string) => {
    if (pin.length < 6) {
      setPin(`${pin}${digit}`);
      setError("");
    }
  };

  const proceed = () => {
    if (pin.length !== 6) {
      setError("Tu PIN debe tener exactamente 6 dígitos.");
      return;
    }
    if (/^(\d)\1{5}$/.test(pin) || pin === "123456" || pin === "654321") {
      setError("Elige un PIN menos predecible. Evita secuencias o números repetidos.");
      return;
    }
    if (!confirming) {
      setFirstPin(pin);
      setPin("");
      setConfirming(true);
      return;
    }
    if (pin !== firstPin) {
      setError("Los PIN no coinciden. Vuelve a intentarlo.");
      setPin("");
      return;
    }
    track("onboarding_step_completed", { step: "pin_created" });
    track("onboarding_completed", { status: "wallet_active", durationTargetSeconds: 180 });
    onNext();
  };

  return (
    <ScreenShell step="pin" onBack={onBack}>
      <section className="step-heading compact">
        <span className="step-icon"><Icon name="lock" size={24} /></span>
        <h1>{confirming ? "Confirma tu PIN" : "Crea tu PIN"}</h1>
        <p>{confirming ? "Ingresa nuevamente los 6 dígitos." : "Lo usarás para autorizar tus pagos de forma segura."}</p>
      </section>
      <div className="pin-dots" aria-label={`${pin.length} de 6 dígitos ingresados`}>
        {Array.from({ length: 6 }).map((_, index) => <span key={index} className={index < pin.length ? "is-filled" : ""} />)}
      </div>
      {error && <p className="error-message pin-error" role="alert"><span>!</span>{error}</p>}
      <div className="number-pad" role="group" aria-label="Teclado numérico">
        {["1", "2", "3", "4", "5", "6", "7", "8", "9"].map((number) => (
          <button key={number} onClick={() => add(number)}>{number}</button>
        ))}
        <span />
        <button onClick={() => add("0")}>0</button>
        <button className="delete-key" onClick={() => setPin(pin.slice(0, -1))} aria-label="Borrar dígito">⌫</button>
      </div>
      <Button onClick={proceed}>{confirming ? "Activar mi wallet" : "Continuar"}</Button>
    </ScreenShell>
  );
}

function Success({ onNext }: { onNext: () => void }) {
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
        <span className="status-pill"><i /> Wallet activa</span>
        <h1>¡Todo listo, Valeria!</h1>
        <p>Tu wallet ya está activa. Puedes empezar a pagar y transferir al instante.</p>
        <div className="limit-card">
          <span className="limit-icon"><Icon name="shield" size={22} /></span>
          <div><span>Tu límite diario</span><strong>S/ 1,500.00</strong></div>
          <button aria-label="Más información"><Icon name="help" size={18} /></button>
        </div>
      </section>
      <div className="success-action">
        <Button onClick={onNext}>Ir a mi wallet</Button>
        <p><Icon name="lock" size={14} /> Tu cuenta está protegida</p>
      </div>
    </main>
  );
}

function Home() {
  return (
    <main className="app-shell home-screen">
      <header className="home-header">
        <Brand />
        <button className="avatar" aria-label="Abrir perfil">VR</button>
      </header>
      <section className="welcome-row">
        <div><span>Buenas tardes,</span><h1>Valeria</h1></div>
        <span className="active-badge"><i /> Activa</span>
      </section>
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

  return (
    <div className="page-frame">
      {step === "access" && <Intro onContinue={() => setStep("phone")} />}
      {step === "phone" && <PhoneStep onBack={() => setStep("access")} onNext={(value) => { setPhone(value); setStep("code"); }} />}
      {step === "code" && <CodeStep phone={phone} onBack={() => setStep("phone")} onNext={() => setStep("pin")} />}
      {step === "pin" && <PinStep onBack={() => setStep("code")} onNext={() => setStep("success")} />}
      {step === "success" && <Success onNext={() => setStep("home")} />}
      {step === "home" && <Home />}
    </div>
  );
}
