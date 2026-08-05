'use client';
import { useState } from 'react';
import { signIn } from 'next-auth/react';
import Logo from '@/components/Logo';

export default function Login() {
  const [login, setLogin] = useState('');
  const [erro, setErro] = useState('');
  const [enviando, setEnviando] = useState(false);

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setErro('');
    setEnviando(true);
    try {
      const res = await signIn('credentials', { login, redirect: false });
      if (res?.error) setErro('Login inválido — use ao menos 3 caracteres (letras, números, ponto, hífen)');
      else window.location.href = '/';
    } finally {
      setEnviando(false);
    }
  }

  return (
    <div className="auth-wrap">
      <form className="auth-card" onSubmit={submit}>
        <span className="auth-logo"><Logo size={34} /></span>
        <h1>Minhas Finanças</h1>
        {erro && <p className="auth-error">{erro}</p>}
        <input
          type="text"
          placeholder="Seu login"
          value={login}
          onChange={e => setLogin(e.target.value)}
          autoComplete="username"
          autoFocus
          required
          minLength={3}
        />
        <button type="submit" disabled={enviando}>
          {enviando ? 'Aguarde…' : 'Entrar'}
        </button>
        <p style={{ marginTop: 12, fontSize: 12, textAlign: 'center', color: 'var(--text-3)' }}>
          Na primeira vez, sua conta é criada automaticamente.<br />
          O login é sua chave de acesso — guarde-o como um segredo.
        </p>
      </form>
    </div>
  );
}
