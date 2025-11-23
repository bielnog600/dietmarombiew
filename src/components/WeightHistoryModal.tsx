import React, { useState, useEffect } from 'react';
import { X, Plus, TrendingUp, TrendingDown, Minus, Pencil, Trash2 } from 'lucide-react';
import { supabase } from '../lib/supabase';
import { useAuthStore } from '../store/authStore';
import type { User, WeightHistory } from '../types';
import { format } from 'date-fns';
import { ptBR } from 'date-fns/locale';

interface WeightHistoryModalProps {
  user: User;
  onClose: () => void;
}

export default function WeightHistoryModal({ user, onClose }: WeightHistoryModalProps) {
  const { user: currentUser } = useAuthStore();
  const [weightHistory, setWeightHistory] = useState<WeightHistory[]>([]);
  const [loading, setLoading] = useState(true);
  const [showAddForm, setShowAddForm] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [formData, setFormData] = useState({
    weight: '',
    notes: '',
    created_at: format(new Date(), 'yyyy-MM-dd')
  });

  useEffect(() => {
    fetchWeightHistory();
  }, [user.id]);

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
    setShowAddForm(false);
    setEditingId(null);
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
      <div className="bg-[rgb(38,38,38)] rounded-lg p-6 w-full max-w-2xl max-h-[90vh] overflow-y-auto">
        <div className="flex justify-between items-center mb-6">
          <div>
            <h2 className="text-2xl font-bold text-white">Histórico de Peso</h2>
            <p className="text-gray-400 mt-1">{user.name}</p>
          </div>
          <button
            onClick={onClose}
            className="text-gray-400 hover:text-white transition-colors"
          >
            <X className="w-6 h-6" />
          </button>
        </div>

        {!loading && weightHistory.length > 0 && (
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

        {!showAddForm && (
          <button
            onClick={() => setShowAddForm(true)}
            className="w-full bg-green-600 text-white px-4 py-3 rounded-lg hover:bg-green-700 transition-colors mb-6 flex items-center justify-center gap-2"
          >
            <Plus className="w-5 h-5" />
            Registrar Peso
          </button>
        )}

        {showAddForm && (
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
      </div>
    </div>
  );
}
