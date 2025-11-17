import React, { useState, useEffect } from 'react';
import { supabase } from '../lib/supabase';
import { useAuthStore } from '../store/authStore';
import { useTranslation } from '../translations';
import type { ProgressPhoto, WeightRecord } from '../types';
import { Camera, Trash2, Scale } from 'lucide-react';

export default function Progress() {
  const user = useAuthStore(state => state.user);
  const refreshUserData = useAuthStore(state => state.refreshUserData);
  const { t } = useTranslation();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [photos, setPhotos] = useState<ProgressPhoto[]>([]);
  const [weightHistory, setWeightHistory] = useState<WeightRecord[]>([]);
  const [newWeight, setNewWeight] = useState(user?.weight?.toString() || '');
  const [uploadingType, setUploadingType] = useState<'front' | 'side' | 'back' | null>(null);
  const [selectedPhotoType, setSelectedPhotoType] = useState<'front' | 'side' | 'back'>('front');
  const [selectedDate, setSelectedDate] = useState<string>('');

  useEffect(() => {
    fetchPhotos();
    fetchWeightHistory();
  }, []);

  const fetchWeightHistory = async () => {
    try {
      const { data, error } = await supabase
        .from('weight_history')
        .select('*')
        .order('created_at', { ascending: false });

      if (error) throw error;
      setWeightHistory(data || []);
    } catch (err) {
      console.error('Error fetching weight history:', err);
    }
  };

  const handleWeightSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError('');

    try {
      const weight = Number(newWeight);
      if (isNaN(weight) || weight < 30 || weight > 200) {
        throw new Error(t('invalidWeight'));
      }

      // Update user's current weight
      const { error: userError } = await supabase
        .from('users')
        .update({ weight })
        .eq('id', user?.id);

      if (userError) throw userError;

      // Add to weight history
      const { error: historyError } = await supabase
        .from('weight_history')
        .insert([{
          user_id: user?.id,
          weight
        }]);

      if (historyError) throw historyError;

      await refreshUserData();
      await fetchWeightHistory();
      setSuccess(t('weightUpdated'));
    } catch (err: any) {
      console.error('Error updating weight:', err);
      setError(err.message || t('errorUpdatingWeight'));
    } finally {
      setLoading(false);
    }
  };

  const handleDeleteWeightRecord = async (recordId: string) => {
    try {
      setError('');
      
      const { error } = await supabase
        .from('weight_history')
        .delete()
        .eq('id', recordId);

      if (error) throw error;

      await fetchWeightHistory();
      setSuccess(t('weightRecordDeleted'));
    } catch (err: any) {
      console.error('Error deleting weight record:', err);
      setError(t('errorDeletingWeightRecord'));
    }
  };

  const fetchPhotos = async () => {
    try {
      const { data, error } = await supabase
        .from('progress_photos')
        .select('*')
        .order('created_at', { ascending: false });

      if (error) throw error;
      setPhotos(data || []);

      // Set initial selected date to latest photo date if available
      if (data && data.length > 0) {
        setSelectedDate(new Date(data[0].created_at).toISOString().split('T')[0]);
      }
    } catch (err) {
      console.error('Error fetching photos:', err);
    }
  };

  const handlePhotoUpload = async (type: 'front' | 'side' | 'back', file: File) => {
    try {
      setUploadingType(type);
      setError('');

      // First, upload photo to storage using user ID and timestamp as path
      const timestamp = new Date().getTime();
      const fileExt = file.name.split('.').pop();
      const fileName = `${user?.id}/${timestamp}.${fileExt}`;
      
      const { error: uploadError, data } = await supabase.storage
        .from('progress-photos')
        .upload(fileName, file, {
          cacheControl: '3600',
          upsert: false
        });

      if (uploadError) throw uploadError;

      // Get public URL
      const { data: { publicUrl } } = supabase.storage
        .from('progress-photos')
        .getPublicUrl(fileName);

      // Save the photo record with the URL
      const { error: dbError } = await supabase
        .from('progress_photos')
        .insert([{
          user_id: user?.id,
          photo_url: publicUrl,
          photo_type: type
        }]);

      if (dbError) {
        // If database insert fails, delete the uploaded file
        await supabase.storage
          .from('progress-photos')
          .remove([fileName]);
        throw dbError;
      }

      await fetchPhotos();
      setSuccess(t('photoUploaded'));
    } catch (err: any) {
      console.error('Error uploading photo:', err);
      setError(t('errorUploadingPhoto'));
    } finally {
      setUploadingType(null);
    }
  };

  const handleDeletePhoto = async (photo: ProgressPhoto) => {
    try {
      setError('');

      // Delete from storage
      const fileName = photo.photo_url.split('/').pop();
      if (fileName) {
        await supabase.storage
          .from('progress-photos')
          .remove([`${user?.id}/${fileName}`]);
      }

      // Delete record
      const { error } = await supabase
        .from('progress_photos')
        .delete()
        .eq('id', photo.id);

      if (error) throw error;

      await fetchPhotos();
      setSuccess(t('photoDeleted'));
    } catch (err: any) {
      console.error('Error deleting photo:', err);
      setError(t('errorDeletingPhoto'));
    }
  };

  // Get unique dates for the date selector
  const uniqueDates = [...new Set(photos.map(p => 
    new Date(p.created_at).toISOString().split('T')[0]
  ))].sort().reverse();

  // Get photos for comparison
  const currentPhotos = photos.filter(p => 
    new Date(p.created_at).toISOString().split('T')[0] === selectedDate
  );
  
  const oldestPhotos = photos.filter(p => 
    new Date(p.created_at).toISOString().split('T')[0] < selectedDate
  ).reduce((acc, photo) => {
    if (!acc[photo.photo_type] || new Date(photo.created_at) > new Date(acc[photo.photo_type].created_at)) {
      acc[photo.photo_type] = photo;
    }
    return acc;
  }, {} as Record<string, ProgressPhoto>);

  return (
    <div className="space-y-8">
      {error && (
        <div className="bg-red-900/50 border border-red-600/20 text-red-100 p-4 rounded-lg mb-4">
          {error}
        </div>
      )}

      {success && (
        <div className="bg-green-900/50 border border-green-600/20 text-green-100 p-4 rounded-lg mb-4">
          {success}
        </div>
      )}

      {/* Weight tracking section */}
      <div className="bg-[rgb(28,28,28)] p-6 rounded-lg border border-[#f8c045]/20">
        <div className="flex items-center mb-4">
          <Scale className="text-[#f8c045] mr-2" />
          <h4 className="text-lg font-semibold text-[#f8c045]">{t('weightTracking')}</h4>
        </div>

        <form onSubmit={handleWeightSubmit} className="mb-6">
          <div className="flex items-end gap-4">
            <div className="flex-1">
              <label className="block text-gray-300 text-sm font-bold mb-2">
                {t('currentWeight')} (kg)
              </label>
              <input
                type="number"
                value={newWeight}
                onChange={(e) => setNewWeight(e.target.value)}
                className="w-full bg-[rgb(23,23,23)] text-gray-300 p-2 rounded-lg border border-[#f8c045]/20 focus:outline-none focus:ring-2 focus:ring-[#f8c045]/50"
                min="30"
                max="200"
                step="0.1"
                required
              />
            </div>
            <button
              type="submit"
              disabled={loading}
              className="bg-[#f8c045] text-[rgb(23,23,23)] px-6 py-2 rounded-lg hover:bg-[#e6b041] transition font-semibold disabled:opacity-50"
            >
              {loading ? t('saving') : t('save')}
            </button>
          </div>
        </form>

        {weightHistory.length > 0 && (
          <div>
            <h5 className="text-gray-300 font-semibold mb-2">{t('history')}</h5>
            <div className="space-y-2">
              {weightHistory.map((record) => (
                <div
                  key={record.id}
                  className="flex justify-between items-center text-sm bg-[rgb(23,23,23)] p-3 rounded-lg border border-[#f8c045]/10"
                >
                  <span className="text-gray-400">
                    {new Date(record.created_at).toLocaleDateString()}
                  </span>
                  <div className="flex items-center space-x-4">
                    <span className="text-[#f8c045] font-semibold">
                      {record.weight} kg
                    </span>
                    <button
                      onClick={() => handleDeleteWeightRecord(record.id)}
                      className="text-gray-400 hover:text-red-500 transition"
                      title={t('delete')}
                    >
                      <Trash2 size={16} />
                    </button>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>

      {/* Progress photos section */}
      <div className="bg-[rgb(28,28,28)] p-6 rounded-lg border border-[#f8c045]/20">
        <div className="flex items-center mb-6">
          <Camera className="text-[#f8c045] mr-2" />
          <h4 className="text-lg font-semibold text-[#f8c045]">{t('progressPhotos')}</h4>
        </div>

        {/* Photo type selector */}
        <div className="flex justify-center mb-6">
          <div className="bg-[rgb(23,23,23)] rounded-lg border border-[#f8c045]/10 p-1">
            <button
              onClick={() => setSelectedPhotoType('front')}
              className={`px-4 py-2 rounded-lg transition ${
                selectedPhotoType === 'front'
                  ? 'bg-[#f8c045] text-[rgb(23,23,23)]'
                  : 'text-[#f8c045] hover:bg-[rgb(33,33,33)]'
              }`}
            >
              {t('front')}
            </button>
            <button
              onClick={() => setSelectedPhotoType('side')}
              className={`px-4 py-2 rounded-lg transition ${
                selectedPhotoType === 'side'
                  ? 'bg-[#f8c045] text-[rgb(23,23,23)]'
                  : 'text-[#f8c045] hover:bg-[rgb(33,33,33)]'
              }`}
            >
              {t('side')}
            </button>
            <button
              onClick={() => setSelectedPhotoType('back')}
              className={`px-4 py-2 rounded-lg transition ${
                selectedPhotoType === 'back'
                  ? 'bg-[#f8c045] text-[rgb(23,23,23)]'
                  : 'text-[#f8c045] hover:bg-[rgb(33,33,33)]'
              }`}
            >
              {t('back')}
            </button>
          </div>
        </div>

        {/* Date selector */}
        {uniqueDates.length > 0 && (
          <div className="mb-6">
            <label className="block text-gray-300 text-sm font-bold mb-2">
              {t('selectDate')}
            </label>
            <select
              value={selectedDate}
              onChange={(e) => setSelectedDate(e.target.value)}
              className="w-full bg-[rgb(23,23,23)] text-gray-300 p-2 rounded-lg border border-[#f8c045]/20 focus:outline-none focus:ring-2 focus:ring-[#f8c045]/50"
            >
              {uniqueDates.map(date => (
                <option key={date} value={date}>
                  {new Date(date).toLocaleDateString()}
                </option>
              ))}
            </select>
          </div>
        )}

        {/* Photo comparison */}
        <div className="grid grid-cols-2 gap-6">
          {/* Previous photo */}
          <div className="space-y-2">
            <h5 className="text-gray-300 font-semibold">{t('previousPhoto')}</h5>
            <div className="aspect-[3/4] bg-[rgb(28,28,28)] rounded-lg border border-[#f8c045]/20 overflow-hidden relative">
              {oldestPhotos[selectedPhotoType] ? (
                <>
                  <img
                    src={oldestPhotos[selectedPhotoType].photo_url}
                    alt={t(`${selectedPhotoType}Photo`)}
                    className="w-full h-full object-cover"
                  />
                  <div className="absolute bottom-2 left-2 text-sm text-white bg-black/50 px-2 py-1 rounded">
                    {new Date(oldestPhotos[selectedPhotoType].created_at).toLocaleDateString()}
                  </div>
                </>
              ) : (
                <div className="w-full h-full flex flex-col items-center justify-center text-gray-400">
                  <Camera size={32} className="mb-2" />
                  <span className="text-sm">{t('noPhotoAvailable')}</span>
                </div>
              )}
            </div>
          </div>

          {/* Current photo */}
          <div className="space-y-2">
            <h5 className="text-gray-300 font-semibold">{t('currentPhoto')}</h5>
            <div className="aspect-[3/4] bg-[rgb(28,28,28)] rounded-lg border border-[#f8c045]/20 overflow-hidden relative group">
              {currentPhotos.find(p => p.photo_type === selectedPhotoType) ? (
                <>
                  <img
                    src={currentPhotos.find(p => p.photo_type === selectedPhotoType)?.photo_url}
                    alt={t(`${selectedPhotoType}Photo`)}
                    className="w-full h-full object-cover"
                  />
                  <button
                    onClick={() => handleDeletePhoto(currentPhotos.find(p => p.photo_type === selectedPhotoType)!)}
                    className="absolute top-2 right-2 p-2 bg-red-500 rounded-full opacity-0 group-hover:opacity-100 transition"
                  >
                    <Trash2 size={16} className="text-white" />
                  </button>
                  <div className="absolute bottom-2 left-2 text-sm text-white bg-black/50 px-2 py-1 rounded">
                    {new Date(currentPhotos.find(p => p.photo_type === selectedPhotoType)!.created_at).toLocaleDateString()}
                  </div>
                </>
              ) : (
                <label className="w-full h-full flex flex-col items-center justify-center cursor-pointer hover:bg-[rgb(33,33,33)] transition">
                  <Camera size={32} className="text-gray-400 mb-2" />
                  <span className="text-gray-400 text-sm">{t('addPhoto')}</span>
                  <input
                    type="file"
                    accept="image/*"
                    className="hidden"
                    onChange={(e) => {
                      const file = e.target.files?.[0];
                      if (file) handlePhotoUpload(selectedPhotoType, file);
                    }}
                    disabled={!!uploadingType}
                  />
                  {uploadingType === selectedPhotoType && (
                    <div className="absolute inset-0 bg-black/50 flex items-center justify-center">
                      <div className="animate-spin rounded-full h-8 w-8 border-t-2 border-b-2 border-[#f8c045]"></div>
                    </div>
                  )}
                </label>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}