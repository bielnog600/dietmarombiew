import React, { useState, useEffect } from 'react';
import { X, Plus, TrendingUp, TrendingDown, Minus, Pencil, Trash2, Scale, Ruler } from 'lucide-react';
import { supabase } from '../lib/supabase';
import { useAuthStore } from '../store/authStore';
import type { User, WeightHistory, BodyMeasurements } from '../types';
import { format } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import BodyDiagram from './BodyDiagram';

interface WeightHistoryModalProps {
  user: User;
  onClose: () => void;
}

export default function WeightHistoryModal({ user, onClose }: WeightHistoryModalProps) {
  const { user: currentUser } = useAuthStore();
  const [activeTab, setActiveTab] = useState<'weight' | 'measurements'>('weight');
  const [weightHistory, setWeightHistory] = useState<WeightHistory[]>([]);
  const [measurements, setMeasurements] = useState<BodyMeasurements[]>([]);
  const [loading, setLoading] = useState(true);
  const [showAddForm, setShowAddForm] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [activeMeasurement, setActiveMeasurement] = useState<string | null>(null);
  const [formData, setFormData] = useState({
    weight: '',
    notes: '',
    created_at: format(new Date(), 'yyyy-MM-dd')
  });
  const [measurementFormData, setMeasurementFormData] = useState({
    waist: '',
    abdomen: '',
    left_arm: '',
    right_arm: '',
    left_thigh: '',
    right_thigh: '',
    hips: '',
    chest: '',
    notes: '',
    created_at: format(new Date(), 'yyyy-MM-dd')
  });

  useEffect(() => {
    if (activeTab === 'weight') {
      fetchWeightHistory();
    } else {
      fetchMeasurements();
    }
  }, [user.id, activeTab]);

  const fetchWeightHistory = async () => {
    try {
      setLoading(true);
      const { data, error } = await supabase
        .from('weight_history')
        .select('*')
        .eq('user_id', user.id)
        .order('created_at', { ascending: false });

      if (error) throw error;
      setWeightHistory(data || []);
    } catch (error) {
      console.error('Error fetching weight history:', error);
    } finally {
      setLoading(false);
    }
  };

  const fetchMeasurements = async () => {
    try {
      setLoading(true);
      const { data, error } = await supabase
        .from('body_measurements')
        .select('*')
        .eq('user_id', user.id)
        .order('created_at', { ascending: false });

      if (error) throw error;
      setMeasurements(data || []);
    } catch (error) {
      console.error('Error fetching measurements:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!formData.weight || parseFloat(formData.weight) <= 0) {
      alert('Por favor, insira um peso válido');
      return;
    }

    try {
      if (editingId) {
        const { error } = await supabase
          .from('weight_history')
          .update({
            weight: parseFloat(formData.weight),
            notes: formData.notes,
            created_at: new Date(formData.created_at).toISOString()
          })
          .eq('id', editingId);

        if (error) throw error;
      } else {
        const { error } = await supabase
          .from('weight_history')
          .insert({
            user_id: user.id,
            weight: parseFloat(formData.weight),
            notes: formData.notes,
            recorded_by: currentUser?.id,
            created_at: new Date(formData.created_at).toISOString()
          });

        if (error) throw error;
      }

      setFormData({
        weight: '',
        notes: '',
        created_at: format(new Date(), 'yyyy-MM-dd')
      });
      setShowAddForm(false);
      setEditingId(null);
      fetchWeightHistory();
    } catch (error) {
      console.error('Error saving weight:', error);
      alert('Erro ao salvar peso');
    }
  };

  const handleEdit = (record: WeightHistory) => {
    setEditingId(record.id);
    setFormData({
      weight: record.weight.toString(),
      notes: record.notes || '',
      created_at: format(new Date(record.created_at), 'yyyy-MM-dd')
    });
    setShowAddForm(true);
  };

  const handleDelete = async (id: string) => {
    if (!confirm('Tem certeza que deseja excluir este registro?')) return;

    try {
      const { error } = await supabase
        .from('weight_history')
        .delete()
        .eq('id', id);

      if (error) throw error;
      fetchWeightHistory();
    } catch (error) {
      console.error('Error deleting weight:', error);
      alert('Erro ao excluir registro');
    }
  };

  const handleCancel = () => {
    setFormData({
      weight: '',
      notes: '',
      created_at: format(new Date(), 'yyyy-MM-dd')
    });
    setMeasurementFormData({
      waist: '',
      abdomen: '',
      left_arm: '',
      right_arm: '',
      left_thigh: '',
      right_thigh: '',
      hips: '',
      chest: '',
      notes: '',
      created_at: format(new Date(), 'yyyy-MM-dd')
    });
    setShowAddForm(false);
    setEditingId(null);
    setActiveMeasurement(null);
  };

  const handleMeasurementSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    try {
      const measurementData = {
        user_id: user.id,
        waist: measurementFormData.waist ? parseFloat(measurementFormData.waist) : null,
        abdomen: measurementFormData.abdomen ? parseFloat(measurementFormData.abdomen) : null,
        left_arm: measurementFormData.left_arm ? parseFloat(measurementFormData.left_arm) : null,
        right_arm: measurementFormData.right_arm ? parseFloat(measurementFormData.right_arm) : null,
        left_thigh: measurementFormData.left_thigh ? parseFloat(measurementFormData.left_thigh) : null,
        right_thigh: measurementFormData.right_thigh ? parseFloat(measurementFormData.right_thigh) : null,
        hips: measurementFormData.hips ? parseFloat(measurementFormData.hips) : null,
        chest: measurementFormData.chest ? parseFloat(measurementFormData.chest) : null,
        notes: measurementFormData.notes,
        recorded_by: currentUser?.id,
        created_at: new Date(measurementFormData.created_at).toISOString()
      };

      if (editingId) {
        const { error } = await supabase
          .from('body_measurements')
          .update(measurementData)
          .eq('id', editingId);

        if (error) throw error;
      } else {
        const { error } = await supabase
          .from('body_measurements')
          .insert(measurementData);

        if (error) throw error;
      }

      handleCancel();
      fetchMeasurements();
    } catch (error) {
      console.error('Error saving measurements:', error);
      alert('Erro ao salvar medidas');
    }
  };

  const handleEditMeasurement = (record: BodyMeasurements) => {
    setEditingId(record.id);
    setMeasurementFormData({
      waist: record.waist?.toString() || '',
      abdomen: record.abdomen?.toString() || '',
      left_arm: record.left_arm?.toString() || '',
      right_arm: record.right_arm?.toString() || '',
      left_thigh: record.left_thigh?.toString() || '',
      right_thigh: record.right_thigh?.toString() || '',
      hips: record.hips?.toString() || '',
      chest: record.chest?.toString() || '',
      notes: record.notes || '',
      created_at: format(new Date(record.created_at), 'yyyy-MM-dd')
    });
    setShowAddForm(true);
  };

  const handleDeleteMeasurement = async (id: string) => {
    if (!confirm('Tem certeza que deseja excluir este registro?')) return;

    try {
      const { error } = await supabase
        .from('body_measurements')
        .delete()
        .eq('id', id);

      if (error) throw error;
      fetchMeasurements();
    } catch (error) {
      console.error('Error deleting measurement:', error);
      alert('Erro ao excluir registro');
    }
  };

  const calculateTrend = () => {
    if (weightHistory.length < 2) return null;

    const latest = weightHistory[0].weight;
    const previous = weightHistory[1].weight;
    const diff = latest - previous;

    return {
      value: Math.abs(diff),
      direction: diff > 0 ? 'up' : diff < 0 ? 'down' : 'stable'
    };
  };

  const calculateTotalChange = () => {
    if (weightHistory.length < 2) return null;

    const latest = weightHistory[0].weight;
    const oldest = weightHistory[weightHistory.length - 1].weight;
    const diff = latest - oldest;

    return {
      value: Math.abs(diff),
      direction: diff > 0 ? 'up' : diff < 0 ? 'down' : 'stable'
    };
  };

  const trend = calculateTrend();
  const totalChange = calculateTotalChange();

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
      <div className="bg-[rgb(38,38,38)] rounded-lg p-6 w-full max-w-4xl max-h-[90vh] overflow-y-auto">
        <div className="flex justify-between items-center mb-6">
          <div>
            <h2 className="text-2xl font-bold text-white">Histórico de Progresso</h2>
            <p className="text-gray-400 mt-1">{user.name}</p>
          </div>
          <button
            onClick={onClose}
            className="text-gray-400 hover:text-white transition-colors"
          >
            <X className="w-6 h-6" />
          </button>
        </div>

        <div className="flex gap-2 mb-6 border-b border-gray-600">
          <button
            onClick={() => {
              setActiveTab('weight');
              setShowAddForm(false);
              setEditingId(null);
            }}
            className={`flex items-center gap-2 px-4 py-2 font-semibold transition-colors ${
              activeTab === 'weight'
                ? 'text-[#f8c045] border-b-2 border-[#f8c045]'
                : 'text-gray-400 hover:text-gray-300'
            }`}
          >
            <Scale className="w-5 h-5" />
            Peso
          </button>
          <button
            onClick={() => {
              setActiveTab('measurements');
              setShowAddForm(false);
              setEditingId(null);
            }}
            className={`flex items-center gap-2 px-4 py-2 font-semibold transition-colors ${
              activeTab === 'measurements'
                ? 'text-[#f8c045] border-b-2 border-[#f8c045]'
                : 'text-gray-400 hover:text-gray-300'
            }`}
          >
            <Ruler className="w-5 h-5" />
            Medidas
          </button>
        </div>

        {activeTab === 'weight' && !loading && weightHistory.length > 0 && (
          <div className="grid grid-cols-3 gap-4 mb-6">
            <div className="bg-[rgb(28,28,28)] rounded-lg p-4">
              <p className="text-gray-400 text-sm mb-1">Peso Atual</p>
              <p className="text-2xl font-bold text-white">{weightHistory[0].weight.toFixed(1)} kg</p>
            </div>

            {trend && (
              <div className="bg-[rgb(28,28,28)] rounded-lg p-4">
                <p className="text-gray-400 text-sm mb-1">Última Variação</p>
                <div className="flex items-center gap-2">
                  {trend.direction === 'up' ? (
                    <TrendingUp className="w-5 h-5 text-red-400" />
                  ) : trend.direction === 'down' ? (
                    <TrendingDown className="w-5 h-5 text-green-400" />
                  ) : (
                    <Minus className="w-5 h-5 text-gray-400" />
                  )}
                  <span className={`text-xl font-bold ${
                    trend.direction === 'up' ? 'text-red-400' :
                    trend.direction === 'down' ? 'text-green-400' : 'text-gray-400'
                  }`}>
                    {trend.value.toFixed(1)} kg
                  </span>
                </div>
              </div>
            )}

            {totalChange && (
              <div className="bg-[rgb(28,28,28)] rounded-lg p-4">
                <p className="text-gray-400 text-sm mb-1">Variação Total</p>
                <div className="flex items-center gap-2">
                  {totalChange.direction === 'up' ? (
                    <TrendingUp className="w-5 h-5 text-red-400" />
                  ) : totalChange.direction === 'down' ? (
                    <TrendingDown className="w-5 h-5 text-green-400" />
                  ) : (
                    <Minus className="w-5 h-5 text-gray-400" />
                  )}
                  <span className={`text-xl font-bold ${
                    totalChange.direction === 'up' ? 'text-red-400' :
                    totalChange.direction === 'down' ? 'text-green-400' : 'text-gray-400'
                  }`}>
                    {totalChange.value.toFixed(1)} kg
                  </span>
                </div>
              </div>
            )}
          </div>
        )}

        {activeTab === 'weight' && !showAddForm && (
          <button
            onClick={() => setShowAddForm(true)}
            className="w-full bg-green-600 text-white px-4 py-3 rounded-lg hover:bg-green-700 transition-colors mb-6 flex items-center justify-center gap-2"
          >
            <Plus className="w-5 h-5" />
            Registrar Peso
          </button>
        )}

        {activeTab === 'weight' && showAddForm && (
          <form onSubmit={handleSubmit} className="bg-[rgb(28,28,28)] rounded-lg p-4 mb-6">
            <h3 className="text-white font-semibold mb-4">
              {editingId ? 'Editar Registro' : 'Novo Registro'}
            </h3>

            <div className="grid grid-cols-2 gap-4 mb-4">
              <div>
                <label className="block text-sm font-medium text-gray-300 mb-2">
                  Peso (kg) *
                </label>
                <input
                  type="number"
                  step="0.1"
                  value={formData.weight}
                  onChange={(e) => setFormData({ ...formData, weight: e.target.value })}
                  className="w-full px-3 py-2 bg-[rgb(38,38,38)] border border-gray-600 rounded-lg text-white focus:outline-none focus:border-green-500"
                  required
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-300 mb-2">
                  Data *
                </label>
                <input
                  type="date"
                  value={formData.created_at}
                  onChange={(e) => setFormData({ ...formData, created_at: e.target.value })}
                  className="w-full px-3 py-2 bg-[rgb(38,38,38)] border border-gray-600 rounded-lg text-white focus:outline-none focus:border-green-500"
                  required
                />
              </div>
            </div>

            <div className="mb-4">
              <label className="block text-sm font-medium text-gray-300 mb-2">
                Observações
              </label>
              <textarea
                value={formData.notes}
                onChange={(e) => setFormData({ ...formData, notes: e.target.value })}
                rows={3}
                className="w-full px-3 py-2 bg-[rgb(38,38,38)] border border-gray-600 rounded-lg text-white focus:outline-none focus:border-green-500"
                placeholder="Ex: Medição em jejum, após treino, etc."
              />
            </div>

            <div className="flex gap-2">
              <button
                type="submit"
                className="flex-1 bg-green-600 text-white px-4 py-2 rounded-lg hover:bg-green-700 transition-colors"
              >
                {editingId ? 'Atualizar' : 'Salvar'}
              </button>
              <button
                type="button"
                onClick={handleCancel}
                className="flex-1 bg-gray-600 text-white px-4 py-2 rounded-lg hover:bg-gray-700 transition-colors"
              >
                Cancelar
              </button>
            </div>
          </form>
        )}

        {activeTab === 'weight' && (
          <div className="space-y-3">
            {loading ? (
              <p className="text-center text-gray-400 py-8">Carregando...</p>
            ) : weightHistory.length === 0 ? (
              <p className="text-center text-gray-400 py-8">Nenhum registro encontrado</p>
            ) : (
              weightHistory.map((record, index) => {
              const prevRecord = weightHistory[index + 1];
              const diff = prevRecord ? record.weight - prevRecord.weight : null;

              return (
                <div
                  key={record.id}
                  className="bg-[rgb(28,28,28)] rounded-lg p-4 hover:bg-[rgb(32,32,32)] transition-colors"
                >
                  <div className="flex items-start justify-between">
                    <div className="flex-1">
                      <div className="flex items-center gap-3 mb-2">
                        <span className="text-2xl font-bold text-white">
                          {record.weight.toFixed(1)} kg
                        </span>

                        {diff !== null && (
                          <span className={`text-sm font-medium flex items-center gap-1 ${
                            diff > 0 ? 'text-red-400' :
                            diff < 0 ? 'text-green-400' : 'text-gray-400'
                          }`}>
                            {diff > 0 ? (
                              <TrendingUp className="w-4 h-4" />
                            ) : diff < 0 ? (
                              <TrendingDown className="w-4 h-4" />
                            ) : (
                              <Minus className="w-4 h-4" />
                            )}
                            {diff > 0 ? '+' : ''}{diff.toFixed(1)} kg
                          </span>
                        )}
                      </div>

                      <p className="text-sm text-gray-400 mb-1">
                        {format(new Date(record.created_at), "dd 'de' MMMM 'de' yyyy", { locale: ptBR })}
                      </p>

                      {record.notes && (
                        <p className="text-sm text-gray-300 mt-2">{record.notes}</p>
                      )}
                    </div>

                    <div className="flex gap-2">
                      <button
                        onClick={() => handleEdit(record)}
                        className="text-blue-400 hover:text-blue-300 transition-colors"
                        title="Editar"
                      >
                        <Pencil className="w-4 h-4" />
                      </button>
                      <button
                        onClick={() => handleDelete(record.id)}
                        className="text-red-400 hover:text-red-300 transition-colors"
                        title="Excluir"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </div>
                  </div>
                </div>
              );
              })
            )}
          </div>
        )}

        {activeTab === 'measurements' && !showAddForm && (
          <button
            onClick={() => setShowAddForm(true)}
            className="w-full bg-green-600 text-white px-4 py-3 rounded-lg hover:bg-green-700 transition-colors mb-6 flex items-center justify-center gap-2"
          >
            <Plus className="w-5 h-5" />
            Registrar Medidas
          </button>
        )}

        {activeTab === 'measurements' && showAddForm && (
          <form onSubmit={handleMeasurementSubmit} className="bg-[rgb(28,28,28)] rounded-lg p-4 mb-6">
            <h3 className="text-white font-semibold mb-4">
              {editingId ? 'Editar Medidas' : 'Novas Medidas'}
            </h3>

            <div className="grid grid-cols-2 gap-6">
              <div className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-gray-300 mb-2">
                    Data *
                  </label>
                  <input
                    type="date"
                    value={measurementFormData.created_at}
                    onChange={(e) => setMeasurementFormData({ ...measurementFormData, created_at: e.target.value })}
                    className="w-full px-3 py-2 bg-[rgb(38,38,38)] border border-gray-600 rounded-lg text-white focus:outline-none focus:border-green-500"
                    required
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-300 mb-2">
                    Peitoral (cm)
                  </label>
                  <input
                    type="number"
                    step="0.1"
                    value={measurementFormData.chest}
                    onChange={(e) => setMeasurementFormData({ ...measurementFormData, chest: e.target.value })}
                    onFocus={() => setActiveMeasurement('chest')}
                    onBlur={() => setActiveMeasurement(null)}
                    className="w-full px-3 py-2 bg-[rgb(38,38,38)] border border-gray-600 rounded-lg text-white focus:outline-none focus:border-[#f8c045]"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-300 mb-2">
                    Cintura (cm)
                  </label>
                  <input
                    type="number"
                    step="0.1"
                    value={measurementFormData.waist}
                    onChange={(e) => setMeasurementFormData({ ...measurementFormData, waist: e.target.value })}
                    onFocus={() => setActiveMeasurement('waist')}
                    onBlur={() => setActiveMeasurement(null)}
                    className="w-full px-3 py-2 bg-[rgb(38,38,38)] border border-gray-600 rounded-lg text-white focus:outline-none focus:border-[#f8c045]"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-300 mb-2">
                    Abdômen (cm)
                  </label>
                  <input
                    type="number"
                    step="0.1"
                    value={measurementFormData.abdomen}
                    onChange={(e) => setMeasurementFormData({ ...measurementFormData, abdomen: e.target.value })}
                    onFocus={() => setActiveMeasurement('abdomen')}
                    onBlur={() => setActiveMeasurement(null)}
                    className="w-full px-3 py-2 bg-[rgb(38,38,38)] border border-gray-600 rounded-lg text-white focus:outline-none focus:border-[#f8c045]"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-300 mb-2">
                    Quadril (cm)
                  </label>
                  <input
                    type="number"
                    step="0.1"
                    value={measurementFormData.hips}
                    onChange={(e) => setMeasurementFormData({ ...measurementFormData, hips: e.target.value })}
                    onFocus={() => setActiveMeasurement('hips')}
                    onBlur={() => setActiveMeasurement(null)}
                    className="w-full px-3 py-2 bg-[rgb(38,38,38)] border border-gray-600 rounded-lg text-white focus:outline-none focus:border-[#f8c045]"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-300 mb-2">
                    Braço Esquerdo (cm)
                  </label>
                  <input
                    type="number"
                    step="0.1"
                    value={measurementFormData.left_arm}
                    onChange={(e) => setMeasurementFormData({ ...measurementFormData, left_arm: e.target.value })}
                    onFocus={() => setActiveMeasurement('left_arm')}
                    onBlur={() => setActiveMeasurement(null)}
                    className="w-full px-3 py-2 bg-[rgb(38,38,38)] border border-gray-600 rounded-lg text-white focus:outline-none focus:border-[#f8c045]"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-300 mb-2">
                    Braço Direito (cm)
                  </label>
                  <input
                    type="number"
                    step="0.1"
                    value={measurementFormData.right_arm}
                    onChange={(e) => setMeasurementFormData({ ...measurementFormData, right_arm: e.target.value })}
                    onFocus={() => setActiveMeasurement('right_arm')}
                    onBlur={() => setActiveMeasurement(null)}
                    className="w-full px-3 py-2 bg-[rgb(38,38,38)] border border-gray-600 rounded-lg text-white focus:outline-none focus:border-[#f8c045]"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-300 mb-2">
                    Coxa Esquerda (cm)
                  </label>
                  <input
                    type="number"
                    step="0.1"
                    value={measurementFormData.left_thigh}
                    onChange={(e) => setMeasurementFormData({ ...measurementFormData, left_thigh: e.target.value })}
                    onFocus={() => setActiveMeasurement('left_thigh')}
                    onBlur={() => setActiveMeasurement(null)}
                    className="w-full px-3 py-2 bg-[rgb(38,38,38)] border border-gray-600 rounded-lg text-white focus:outline-none focus:border-[#f8c045]"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-300 mb-2">
                    Coxa Direita (cm)
                  </label>
                  <input
                    type="number"
                    step="0.1"
                    value={measurementFormData.right_thigh}
                    onChange={(e) => setMeasurementFormData({ ...measurementFormData, right_thigh: e.target.value })}
                    onFocus={() => setActiveMeasurement('right_thigh')}
                    onBlur={() => setActiveMeasurement(null)}
                    className="w-full px-3 py-2 bg-[rgb(38,38,38)] border border-gray-600 rounded-lg text-white focus:outline-none focus:border-[#f8c045]"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-300 mb-2">
                    Observações
                  </label>
                  <textarea
                    value={measurementFormData.notes}
                    onChange={(e) => setMeasurementFormData({ ...measurementFormData, notes: e.target.value })}
                    rows={3}
                    className="w-full px-3 py-2 bg-[rgb(38,38,38)] border border-gray-600 rounded-lg text-white focus:outline-none focus:border-green-500"
                    placeholder="Ex: Medição em jejum, etc."
                  />
                </div>
              </div>

              <div className="flex items-center justify-center bg-[rgb(23,23,23)] rounded-lg p-4">
                <BodyDiagram activeMeasurement={activeMeasurement} />
              </div>
            </div>

            <div className="flex gap-2 mt-6">
              <button
                type="submit"
                className="flex-1 bg-green-600 text-white px-4 py-2 rounded-lg hover:bg-green-700 transition-colors"
              >
                {editingId ? 'Atualizar' : 'Salvar'}
              </button>
              <button
                type="button"
                onClick={handleCancel}
                className="flex-1 bg-gray-600 text-white px-4 py-2 rounded-lg hover:bg-gray-700 transition-colors"
              >
                Cancelar
              </button>
            </div>
          </form>
        )}

        {activeTab === 'measurements' && (
          <div className="space-y-3">
            {loading ? (
              <p className="text-center text-gray-400 py-8">Carregando...</p>
            ) : measurements.length === 0 ? (
              <p className="text-center text-gray-400 py-8">Nenhum registro encontrado</p>
            ) : (
              measurements.map((record, index) => {
                const prevRecord = measurements[index + 1];

                return (
                  <div
                    key={record.id}
                    className="bg-[rgb(28,28,28)] rounded-lg p-4 hover:bg-[rgb(32,32,32)] transition-colors"
                  >
                    <div className="flex items-start justify-between mb-3">
                      <div>
                        <p className="text-sm text-gray-400">
                          {format(new Date(record.created_at), "dd 'de' MMMM 'de' yyyy", { locale: ptBR })}
                        </p>
                      </div>
                      <div className="flex gap-2">
                        <button
                          onClick={() => handleEditMeasurement(record)}
                          className="text-blue-400 hover:text-blue-300 transition-colors"
                          title="Editar"
                        >
                          <Pencil className="w-4 h-4" />
                        </button>
                        <button
                          onClick={() => handleDeleteMeasurement(record.id)}
                          className="text-red-400 hover:text-red-300 transition-colors"
                          title="Excluir"
                        >
                          <Trash2 className="w-4 h-4" />
                        </button>
                      </div>
                    </div>

                    <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
                      {record.chest && (
                        <div>
                          <p className="text-xs text-gray-400">Peitoral</p>
                          <p className="text-lg font-semibold text-white">{record.chest.toFixed(1)} cm</p>
                        </div>
                      )}
                      {record.waist && (
                        <div>
                          <p className="text-xs text-gray-400">Cintura</p>
                          <p className="text-lg font-semibold text-white">{record.waist.toFixed(1)} cm</p>
                        </div>
                      )}
                      {record.abdomen && (
                        <div>
                          <p className="text-xs text-gray-400">Abdômen</p>
                          <p className="text-lg font-semibold text-white">{record.abdomen.toFixed(1)} cm</p>
                        </div>
                      )}
                      {record.hips && (
                        <div>
                          <p className="text-xs text-gray-400">Quadril</p>
                          <p className="text-lg font-semibold text-white">{record.hips.toFixed(1)} cm</p>
                        </div>
                      )}
                      {record.left_arm && (
                        <div>
                          <p className="text-xs text-gray-400">Braço Esq.</p>
                          <p className="text-lg font-semibold text-white">{record.left_arm.toFixed(1)} cm</p>
                        </div>
                      )}
                      {record.right_arm && (
                        <div>
                          <p className="text-xs text-gray-400">Braço Dir.</p>
                          <p className="text-lg font-semibold text-white">{record.right_arm.toFixed(1)} cm</p>
                        </div>
                      )}
                      {record.left_thigh && (
                        <div>
                          <p className="text-xs text-gray-400">Coxa Esq.</p>
                          <p className="text-lg font-semibold text-white">{record.left_thigh.toFixed(1)} cm</p>
                        </div>
                      )}
                      {record.right_thigh && (
                        <div>
                          <p className="text-xs text-gray-400">Coxa Dir.</p>
                          <p className="text-lg font-semibold text-white">{record.right_thigh.toFixed(1)} cm</p>
                        </div>
                      )}
                    </div>

                    {record.notes && (
                      <p className="text-sm text-gray-300 mt-3">{record.notes}</p>
                    )}
                  </div>
                );
              })
            )}
          </div>
        )}
      </div>
    </div>
  );
}
