import { login, signup } from "./actions";

export default async function LoginPage({
  searchParams,
}: {
  searchParams: Promise<{ error?: string; message?: string }>;
}) {
  const { error, message } = await searchParams;

  return (
    <div style={{ maxWidth: 520, margin: "70px auto" }}>
      <div className="eyebrow">HUNT account</div>
      <h1>Il tuo radar personale.</h1>
      <p className="lead">
        Accedi per avere opportunità, CV, dossier e candidature costruiti sul tuo profilo.
      </p>

      <form className="card stack" style={{ marginTop: 24 }}>
        <label>
          <div className="fieldTitle">Email</div>
          <input className="input" type="email" name="email" required autoComplete="email" />
        </label>
        <label>
          <div className="fieldTitle">Password</div>
          <input className="input" type="password" name="password" required minLength={8} autoComplete="current-password" />
        </label>

        {error ? <p className="formError">{error}</p> : null}
        {message ? <p className="formSuccess">{message}</p> : null}

        <div className="actions">
          <button className="btn primary" formAction={login}>Accedi</button>
          <button className="btn" formAction={signup}>Crea account</button>
        </div>
      </form>

      <p className="source" style={{ marginTop: 14 }}>
        La beta userà email verificata. Nessun CV viene salvato nel repository pubblico.
      </p>
    </div>
  );
}
