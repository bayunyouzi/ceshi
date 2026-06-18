"use client";
import React, { useState } from 'react';
import { X, Mail, Lock, Check, Loader2, KeyRound } from 'lucide-react';

interface AuthModalProps {
  isOpen: boolean;
  onClose: () => void;
  onLoginSuccess: (token: string, user: any) => void;
}

export default function AuthModal({ isOpen, onClose, onLoginSuccess }: AuthModalProps) {
  const [mode, setMode] = useState<'login' | 'register' | 'forgot-password'>('login');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [code, setCode] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [codeSent, setCodeSent] = useState(false);

  if (!isOpen) return null;

  const handleSendCode = async () => {
    if (!email) {
      setError("请输入邮箱地址");
      return;
    }
    setLoading(true);
    setError('');
    try {
      const res = await fetch('/api/auth/send-code', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error);
      setSuccess('验证码已发送！请查看控制台 (Simulated Email)');
      setCodeSent(true);
    } catch (err: any) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError('');
    setSuccess('');

    try {
      if (mode === 'login') {
        const res = await fetch('/api/auth/login', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ email, password }),
        });
        const data = await res.json();
        if (!res.ok) throw new Error(data.error);
        
        localStorage.setItem('auth_token', data.token);
        localStorage.setItem('user_info', JSON.stringify(data.user));
        onLoginSuccess(data.token, data.user);
        onClose();
      } else if (mode === 'register') {
        if (!codeSent) {
          setError("请先发送验证码");
          setLoading(false);
          return;
        }
        const res = await fetch('/api/auth/register', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ email, password, code }),
        });
        const data = await res.json();
        if (!res.ok) throw new Error(data.error);
        
        setSuccess('注册成功！正在自动登录...');
        // Auto login after register
        const loginRes = await fetch('/api/auth/login', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ email, password }),
        });
        const loginData = await loginRes.json();
        if (loginRes.ok) {
            localStorage.setItem('auth_token', loginData.token);
            localStorage.setItem('user_info', JSON.stringify(loginData.user));
            onLoginSuccess(loginData.token, loginData.user);
            setTimeout(onClose, 1500);
        } else {
            setMode('login');
        }
      } else if (mode === 'forgot-password') {
        if (!codeSent) {
          setError("请先发送验证码");
          setLoading(false);
          return;
        }
        const res = await fetch('/api/auth/reset-password', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ email, password, code }),
        });
        const data = await res.json();
        if (!res.ok) throw new Error(data.error);
        
        setSuccess('密码修改成功！请重新登录...');
        setTimeout(() => {
          setMode('login');
          setPassword('');
          setCode('');
          setSuccess('');
        }, 1500);
      }
    } catch (err: any) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4">
      <div className="w-full max-w-md bg-white/[0.02] backdrop-blur-3xl border border-white/10 rounded-3xl shadow-[0_8px_32px_0_rgba(0,0,0,0.37)] p-6 relative animate-in fade-in zoom-in-95 duration-200">
        <button 
          onClick={onClose}
          className="absolute right-4 top-4 text-gray-400 hover:text-white transition-colors"
        >
          <X className="w-5 h-5" />
        </button>

        <h2 className="text-2xl font-bold mb-6 text-center bg-clip-text text-transparent bg-gradient-to-r from-emerald-400 to-teal-500">
          {mode === 'login' ? '账号登录' : mode === 'register' ? '注册账号' : '找回密码'}
        </h2>

        {error && (
          <div className="mb-4 p-3 bg-red-900/20 border border-red-500/50 rounded-lg text-red-200 text-sm flex items-center gap-2">
            <X className="w-4 h-4" /> {error}
          </div>
        )}

        {success && (
          <div className="mb-4 p-3 bg-green-900/20 border border-green-500/50 rounded-lg text-green-200 text-sm flex items-center gap-2">
            <Check className="w-4 h-4" /> {success}
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="block text-sm text-gray-400 mb-1">邮箱地址</label>
            <div className="relative flex gap-2">
              <div className="relative flex-1">
                <Mail className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-500" />
                <input
                  type="email"
                  required
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  className="w-full bg-black/50 border border-white/10 rounded-lg pl-10 pr-4 py-2 text-sm focus:border-emerald-500 outline-none transition-colors"
                  placeholder="name@example.com"
                />
              </div>
              {mode !== 'login' && (
                <button
                  type="button"
                  onClick={handleSendCode}
                  disabled={loading || codeSent}
                  className="px-3 py-2 bg-white/10 hover:bg-white/20 border border-white/10 text-white text-xs rounded-lg transition-colors whitespace-nowrap disabled:opacity-50"
                >
                  {codeSent ? "已发送" : "获取验证码"}
                </button>
              )}
            </div>
          </div>

          {mode !== 'login' && (
            <div className="animate-in slide-in-from-top-2">
              <label className="block text-sm text-gray-400 mb-1">验证码</label>
              <div className="relative">
                <KeyRound className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-500" />
                <input
                  type="text"
                  required
                  value={code}
                  onChange={(e) => setCode(e.target.value)}
                  className="w-full bg-black/50 border border-white/10 rounded-lg pl-10 pr-4 py-2 text-sm focus:border-emerald-500 outline-none transition-colors"
                  placeholder="输入6位验证码"
                />
              </div>
            </div>
          )}

          <div>
            <div className="flex justify-between items-center mb-1">
              <label className="block text-sm text-gray-400">{mode === 'forgot-password' ? '新密码' : '密码'}</label>
              {mode === 'login' && (
                <button
                  type="button"
                  onClick={() => { setMode('forgot-password'); setCodeSent(false); }}
                  className="text-xs text-emerald-400 hover:text-emerald-300"
                >
                  忘记密码？
                </button>
              )}
            </div>
            <div className="relative">
              <Lock className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-500" />
              <input
                type="password"
                required
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                className="w-full bg-black/50 border border-white/10 rounded-lg pl-10 pr-4 py-2 text-sm focus:border-emerald-500 outline-none transition-colors"
                placeholder="••••••••"
                minLength={6}
              />
            </div>
          </div>

          <button
            type="submit"
            disabled={loading}
            className="w-full bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-500 hover:to-teal-500 text-white font-bold py-2 rounded-lg transition-all transform active:scale-95 disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2 shadow-lg shadow-black/50"
          >
            {loading && <Loader2 className="w-4 h-4 animate-spin" />}
            {mode === 'login' ? '登录' : mode === 'register' ? '立即注册' : '确认修改'}
          </button>
        </form>

        <div className="mt-4 text-center text-sm text-gray-400">
          {mode === 'login' ? (
            <>
              还没有账号？
              <button onClick={() => { setMode('register'); setCodeSent(false); }} className="text-emerald-400 hover:text-emerald-300 ml-1 font-medium">
                立即注册
              </button>
            </>
          ) : mode === 'register' ? (
            <>
              已有账号？
              <button onClick={() => { setMode('login'); setCodeSent(false); }} className="text-emerald-400 hover:text-emerald-300 ml-1 font-medium">
                直接登录
              </button>
            </>
          ) : (
            <button onClick={() => { setMode('login'); setCodeSent(false); }} className="text-emerald-400 hover:text-emerald-300 font-medium">
              返回登录
            </button>
          )}
        </div>
      </div>
    </div>
  );
}
