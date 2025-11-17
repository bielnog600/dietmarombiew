import React, { useState, useRef } from 'react';
import { supabase } from '../lib/supabase';
import { useAuthStore } from '../store/authStore';
import { useTranslation } from '../translations';
import { ACTIVITY_LEVELS } from '../lib/calories';
import { Camera } from 'lucide-react';

export default function Settings() {
  const user = useAuthStore((state) => state.user);
  const refreshUserData = useAuthStore((state) => state.refreshUserData);
  const { t } = useTranslation();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [uploadingPhoto, setUploadingPhoto] = useState(false);
  const [formData, setFormData] = useState({
    name: user?.name || '',
    email: user?.email || '',
    currentPassword: '',
    newPassword: '',
    confirmPassword: '',
    weight: user?.weight || '',
    height: user?.height || '',
    age: user?.age || '',
    gender: user?.gender || '',
    activity_level: user?.activity_level || '',
    lean_mass: user?.lean_mass || '',
    fat_mass: user?.fat_mass || ''
  });

  const handlePhotoUpload = async (file: File) => {
    try {
      setUploadingPhoto(true);
      setError('');

      // Upload photo to storage
      const timestamp = new Date().getTime();
      const fileExt = file.name.split('.').pop();
      const fileName = `${user?.id}/${timestamp}.${fileExt}`;
      
      const { error: uploadError } = await supabase.storage
        .from('profile-photos')
        .upload(fileName, file, {
          cacheControl: '3600',
          upsert: true
        });

      if (uploadError) throw uploadError;

      // Get public URL
      const { data: { publicUrl } } = supabase.storage
        .from('profile-photos')
        .getPublicUrl(fileName);

      // Update user profile with new photo URL
      const { error: updateError } = await supabase
        .from('users')
        .update({ photo_url: publicUrl })
        .eq('id', user?.id);

      if (updateError) throw updateError;

      await refreshUserData();
      setSuccess(t('photoUpdated'));
    } catch (err) {
      console.error('Error uploading photo:', err);
      setError(t('errorUploadingPhoto'));
    } finally {
      setUploadingPhoto(false);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError('');
    setSuccess('');

    try {
      // Update user profile data
      const updates = {
        name: formData.name,
        weight: formData.weight ? Number(formData.weight) : null,
        height: formData.height ? Number(formData.height) : null,
        age: formData.age ? Number(formData.age) : null,
        gender: formData.gender || null,
        activity_level: formData.activity_level || null,
        lean_mass: formData.lean_mass ? Number(formData.lean_mass) : null,
        fat_mass: formData.fat_mass ? Number(formData.fat_mass) : null
      };

      const { error: updateError } = await supabase
        .from('users')
        .update(updates)
        .eq('id', user?.id);

      if (updateError) throw updateError;

      // Handle password change if requested
      if (formData.currentPassword && formData.newPassword) {
        if (formData.newPassword !== formData.confirmPassword) {
          throw new Error(t('passwordsDoNotMatch'));
        }

        const { error: passwordError } = await supabase.auth.updateUser({
          password: formData.newPassword
        });

        if (passwordError) throw passwordError;
      }

      // Refresh user data
      await refreshUserData();
      setSuccess(t('profileUpdated'));

      // Clear sensitive form fields
      setFormData(prev => ({
        ...prev,
        currentPassword: '',
        newPassword: '',
        confirmPassword: ''
      }));
    } catch (err: any) {
      console.error('Error updating profile:', err);
      setError(err.message || t('errorUpdatingProfile'));
    } finally {
      setLoading(false);
    }
  };

  const handleSignOut = () => {
    useAuthStore.getState().signOut();
  };

  return (
    <div className="max-w-2xl mx-auto">
      <form onSubmit={handleSubmit} className="space-y-6">
        {error && (
          <div className="bg-red-900/50 border border-red-600/20 text-red-100 p-4 rounded-lg">
            {error}
          </div>
        )}

        {success && (
          <div className="bg-green-900/50 border border-green-600/20 text-green-100 p-4 rounded-lg">
            {success}
          </div>
        )}

        {/* Profile Photo */}
        <div className="bg-[rgb(28,28,28)] p-6 rounded-lg border border-[#f8c045]/20">
          <h3 className="text-xl font-semibold text-[#f8c045] mb-4">{t('profilePhoto')}</h3>
          <div className="flex items-center space-x-6">
            <div className="relative">
              <div className="w-24 h-24 rounded-full border-4 border-[#f8c045] overflow-hidden">
                {user?.photo_url ? (
                  <img 
                    src={user.photo_url} 
                    alt="Profile"
                    className="w-full h-full object-cover"
                  />
                ) : (
                  <div className="w-full h-full bg-[rgb(23,23,23)] flex items-center justify-center">
                    <Camera className="text-gray-400 w-8 h-8" />
                  </div>
                )}
              </div>
              <input
                type="file"
                ref={fileInputRef}
                className="hidden"
                accept="image/*"
                onChange={(e) => {
                  const file = e.target.files?.[0];
                  if (file) handlePhotoUpload(file);
                }}
              />
              {uploadingPhoto && (
                <div className="absolute inset-0 bg-black/50 rounded-full flex items-center justify-center">
                  <div className="animate-spin rounded-full h-8 w-8 border-t-2 border-b-2 border-[#f8c045]"></div>
                </div>
              )}
            </div>
            <button
              type="button"
              onClick={() => fileInputRef.current?.click()}
              disabled={uploadingPhoto}
              className="bg-[#f8c045] text-[rgb(23,23,23)] px-4 py-2 rounded-lg hover:bg-[#e6b041] transition font-semibold disabled:opacity-50"
            >
              {uploadingPhoto ? t('uploading') : t('updatePhoto')}
            </button>
          </div>
        </div>

        {/* Basic Info */}
        <div className="bg-[rgb(28,28,28)] p-6 rounded-lg border border-[#f8c045]/20">
          <h3 className="text-xl font-semibold text-[#f8c045] mb-4">{t('profile')}</h3>
          
          <div className="space-y-4">
            <div>
              <label className="block text-gray-300 text-sm font-bold mb-2">
                {t('name')}
              </label>
              <input
                type="text"
                value={formData.name}
                onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                className="w-full bg-[rgb(23,23,23)] text-gray-300 p-2 rounded-lg border border-[#f8c045]/20 focus:outline-none focus:ring-2 focus:ring-[#f8c045]/50"
                required
              />
            </div>

            <div>
              <label className="block text-gray-300 text-sm font-bold mb-2">
                {t('email')}
              </label>
              <input
                type="email"
                value={formData.email}
                disabled
                className="w-full bg-[rgb(23,23,23)] text-gray-400 p-2 rounded-lg border border-[#f8c045]/20 cursor-not-allowed"
              />
            </div>
          </div>
        </div>

        <div className="bg-[rgb(28,28,28)] p-6 rounded-lg border border-[#f8c045]/20">
          <h3 className="text-xl font-semibold text-[#f8c045] mb-4">{t('physicalData')}</h3>
          
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 mb-4">
            <div>
              <label className="block text-gray-300 text-sm font-bold mb-2">
                {t('gender')}
              </label>
              <select
                value={formData.gender}
                onChange={(e) => setFormData({ ...formData, gender: e.target.value })}
                className="w-full bg-[rgb(23,23,23)] text-gray-300 p-2 rounded-lg border border-[#f8c045]/20 focus:outline-none focus:ring-2 focus:ring-[#f8c045]/50"
              >
                <option value="">{t('selectGender')}</option>
                <option value="male">{t('male')}</option>
                <option value="female">{t('female')}</option>
              </select>
            </div>

            <div>
              <label className="block text-gray-300 text-sm font-bold mb-2">
                {t('activityLevel')}
              </label>
              <select
                value={formData.activity_level}
                onChange={(e) => setFormData({ ...formData, activity_level: e.target.value })}
                className="w-full bg-[rgb(23,23,23)] text-gray-300 p-2 rounded-lg border border-[#f8c045]/20 focus:outline-none focus:ring-2 focus:ring-[#f8c045]/50"
              >
                <option value="">{t('selectActivityLevel')}</option>
                {Object.entries(ACTIVITY_LEVELS).map(([key, level]) => (
                  <option key={key} value={key}>
                    {level.label} - {level.description}
                  </option>
                ))}
              </select>
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="block text-gray-300 text-sm font-bold mb-2">
                {t('weightKg')}
              </label>
              <input
                type="number"
                value={formData.weight}
                onChange={(e) => setFormData({ ...formData, weight: e.target.value })}
                className="w-full bg-[rgb(23,23,23)] text-gray-300 p-2 rounded-lg border border-[#f8c045]/20 focus:outline-none focus:ring-2 focus:ring-[#f8c045]/50"
                min="30"
                max="200"
                step="0.1"
              />
            </div>

            <div>
              <label className="block text-gray-300 text-sm font-bold mb-2">
                {t('heightCm')}
              </label>
              <input
                type="number"
                value={formData.height}
                onChange={(e) => setFormData({ ...formData, height: e.target.value })}
                className="w-full bg-[rgb(23,23,23)] text-gray-300 p-2 rounded-lg border border-[#f8c045]/20 focus:outline-none focus:ring-2 focus:ring-[#f8c045]/50"
                min="100"
                max="250"
              />
            </div>

            <div>
              <label className="block text-gray-300 text-sm font-bold mb-2">
                {t('age')}
              </label>
              <input
                type="number"
                value={formData.age}
                onChange={(e) => setFormData({ ...formData, age: e.target.value })}
                className="w-full bg-[rgb(23,23,23)] text-gray-300 p-2 rounded-lg border border-[#f8c045]/20 focus:outline-none focus:ring-2 focus:ring-[#f8c045]/50"
                min="14"
                max="100"
              />
            </div>

            <div>
              <label className="block text-gray-300 text-sm font-bold mb-2">
                {t('leanMass')}
              </label>
              <input
                type="number"
                value={formData.lean_mass}
                onChange={(e) => setFormData({ ...formData, lean_mass: e.target.value })}
                className="w-full bg-[rgb(23,23,23)] text-gray-300 p-2 rounded-lg border border-[#f8c045]/20 focus:outline-none focus:ring-2 focus:ring-[#f8c045]/50"
                min="20"
                max="150"
                step="0.1"
              />
            </div>

            <div>
              <label className="block text-gray-300 text-sm font-bold mb-2">
                {t('fatMass')}
              </label>
              <input
                type="number"
                value={formData.fat_mass}
                onChange={(e) => setFormData({ ...formData, fat_mass: e.target.value })}
                className="w-full bg-[rgb(23,23,23)] text-gray-300 p-2 rounded-lg border border-[#f8c045]/20 focus:outline-none focus:ring-2 focus:ring-[#f8c045]/50"
                min="2"
                max="100"
                step="0.1"
              />
            </div>
          </div>
        </div>

        <div className="bg-[rgb(28,28,28)] p-6 rounded-lg border border-[#f8c045]/20">
          <h3 className="text-xl font-semibold text-[#f8c045] mb-4">{t('changePassword')}</h3>
          
          <div className="space-y-4">
            <div>
              <label className="block text-gray-300 text-sm font-bold mb-2">
                {t('currentPassword')}
              </label>
              <input
                type="password"
                value={formData.currentPassword}
                onChange={(e) => setFormData({ ...formData, currentPassword: e.target.value })}
                className="w-full bg-[rgb(23,23,23)] text-gray-300 p-2 rounded-lg border border-[#f8c045]/20 focus:outline-none focus:ring-2 focus:ring-[#f8c045]/50"
              />
            </div>

            <div>
              <label className="block text-gray-300 text-sm font-bold mb-2">
                {t('newPassword')}
              </label>
              <input
                type="password"
                value={formData.newPassword}
                onChange={(e) => setFormData({ ...formData, newPassword: e.target.value })}
                className="w-full bg-[rgb(23,23,23)] text-gray-300 p-2 rounded-lg border border-[#f8c045]/20 focus:outline-none focus:ring-2 focus:ring-[#f8c045]/50"
                minLength={6}
              />
            </div>

            <div>
              <label className="block text-gray-300 text-sm font-bold mb-2">
                {t('confirmNewPassword')}
              </label>
              <input
                type="password"
                value={formData.confirmPassword}
                onChange={(e) => setFormData({ ...formData, confirmPassword: e.target.value })}
                className="w-full bg-[rgb(23,23,23)] text-gray-300 p-2 rounded-lg border border-[#f8c045]/20 focus:outline-none focus:ring-2 focus:ring-[#f8c045]/50"
                minLength={6}
              />
            </div>
          </div>
        </div>

        <div className="flex justify-between items-center">
          <button
            type="button"
            onClick={handleSignOut}
            className="bg-red-500 text-white px-6 py-2 rounded-lg hover:bg-red-600 transition font-semibold"
          >
            {t('signOut')}
          </button>

          <button
            type="submit"
            disabled={loading}
            className="bg-[#f8c045] text-[rgb(23,23,23)] px-8 py-3 rounded-lg hover:bg-[#e6b041] transition font-semibold disabled:opacity-50"
          >
            {loading ? t('saving') : t('save')}
          </button>
        </div>
      </form>
    </div>
  );
}