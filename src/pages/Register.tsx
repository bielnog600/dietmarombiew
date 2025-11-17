import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuthStore } from '../store/authStore';
import { useTranslation } from '../translations';

export default function Register() {
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const signUp = useAuthStore((state) => state.signUp);
  const navigate = useNavigate();
  const { t } = useTranslation();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setLoading(true);

    try {
      await signUp(email, password, name);
      navigate('/dashboard');
    } catch (err: any) {
      console.error('Registration error:', err);
      if (err.message === 'User already registered') {
        setError(t('userAlreadyExists'));
      } else {
        setError(t('registrationError'));
      }
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="max-w-md mx-auto mt-16">
      <div className="bg-[rgb(28,28,28)] p-8 rounded-lg shadow-xl border border-[#f8c045]/10">
        <div className="flex flex-col items-center mb-6">
          <img 
            src="https://storage.googleapis.com/glide-prod.appspot.com/uploads-v2/WFlh1WFWGtO11jwoHGnd/pub/1eaqdsHJVJbwEvSURATP.png" 
            alt="MarombiewApp Logo" 
            className="w-24 h-24 mb-4"
          />
          <h1 className="text-2xl font-bold text-[#f8c045]">{t('createAccount')}</h1>
        </div>

        {error && (
          <div className="bg-red-900/50 border border-red-600/20 text-red-100 px-4 py-3 rounded mb-4">
            {error}
          </div>
        )}

        <form onSubmit={handleSubmit}>
          <div className="mb-4">
            <label className="block text-gray-300 text-sm font-bold mb-2">
              {t('name')}
            </label>
            <input
              type="text"
              value={name}
              onChange={(e) => setName(e.target.value)}
              className="w-full p-2 bg-[rgb(23,23,23)] border border-[#f8c045]/20 rounded-lg focus:outline-none focus:ring-2 focus:ring-[#f8c045]/50 text-gray-100"
              required
            />
          </div>

          <div className="mb-4">
            <label className="block text-gray-300 text-sm font-bold mb-2">
              {t('email')}
            </label>
            <input
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              className="w-full p-2 bg-[rgb(23,23,23)] border border-[#f8c045]/20 rounded-lg focus:outline-none focus:ring-2 focus:ring-[#f8c045]/50 text-gray-100"
              required
            />
          </div>

          <div className="mb-6">
            <label className="block text-gray-300 text-sm font-bold mb-2">
              {t('password')}
            </label>
            <input
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              className="w-full p-2 bg-[rgb(23,23,23)] border border-[#f8c045]/20 rounded-lg focus:outline-none focus:ring-2 focus:ring-[#f8c045]/50 text-gray-100"
              required
            />
          </div>

          <button
            type="submit"
            disabled={loading}
            className={`w-full bg-[#f8c045] text-[rgb(23,23,23)] py-2 px-4 rounded-lg transition font-semibold ${
              loading ? 'opacity-50 cursor-not-allowed' : 'hover:bg-[#e6b041]'
            }`}
          >
            {loading ? t('creatingAccount') : t('createAccount')}
          </button>

          <p className="mt-4 text-center text-gray-400">
            {t('haveAccount')}{' '}
            <button
              type="button"
              onClick={() => navigate('/login')}
              className="text-[#f8c045] hover:underline"
            >
              {t('signIn')}
            </button>
          </p>
        </form>
      </div>
    </div>
  );
}