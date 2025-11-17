import React, { useState, useEffect } from 'react';
import { supabase } from '../lib/supabase';
import { Plus, Pencil, Trash2, X } from 'lucide-react';
import type { Food, FoodCategory } from '../types';

export default function FoodManagement() {
  const [foods, setFoods] = useState<Food[]>([]);
  const [categories, setCategories] = useState<FoodCategory[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [showAddModal, setShowAddModal] = useState(false);
  const [editingFood, setEditingFood] = useState<Food | null>(null);
  const [formData, setFormData] = useState({
    name: '',
    name_en: '',
    category_id: '',
    calories: 0,
    protein: 0,
    carbs: 0,
    fats: 0,
    portion: 'gramas',
    portion_size: 100
  });

  useEffect(() => {
    fetchFoods();
    fetchCategories();
  }, []);

  const fetchFoods = async () => {
    try {
      const { data, error } = await supabase
        .from('foods')
        .select('*, food_categories(*)')
        .order('name');

      if (error) throw error;
      setFoods(data || []);
    } catch (err) {
      console.error('Error fetching foods:', err);
      setError('Erro ao carregar alimentos');
    } finally {
      setLoading(false);
    }
  };

  const fetchCategories = async () => {
    const { data, error } = await supabase
      .from('food_categories')
      .select('*')
      .order('name');

    if (error) {
      console.error('Error fetching categories:', error);
      return;
    }

    setCategories(data || []);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');

    try {
      if (editingFood) {
        // Update existing food
        const { error: updateError } = await supabase
          .from('foods')
          .update({
            name: formData.name,
            name_en: formData.name_en,
            category_id: formData.category_id,
            calories: formData.calories,
            protein: formData.protein,
            carbs: formData.carbs,
            fats: formData.fats,
            portion: formData.portion,
            portion_size: formData.portion_size
          })
          .eq('id', editingFood.id);

        if (updateError) throw updateError;

        // Update local state
        setFoods(foods.map(food => 
          food.id === editingFood.id 
            ? { 
                ...food, 
                ...formData,
                food_categories: categories.find(c => c.id === formData.category_id)
              }
            : food
        ));
      } else {
        // Create new food
        const { data: newFood, error: insertError } = await supabase
          .from('foods')
          .insert([formData])
          .select('*, food_categories(*)')
          .single();

        if (insertError) throw insertError;
        if (newFood) {
          setFoods([...foods, newFood]);
        }
      }

      handleCloseModal();
    } catch (err) {
      console.error('Error saving food:', err);
      setError('Erro ao salvar alimento');
    }
  };

  const handleDelete = async (id: string) => {
    if (!confirm('Tem certeza que deseja excluir este alimento?')) return;

    try {
      // First, delete any meal_foods entries that reference this food
      const { error: mealFoodsError } = await supabase
        .from('meal_foods')
        .delete()
        .eq('food_id', id);

      if (mealFoodsError) throw mealFoodsError;

      // Then delete the food
      const { error } = await supabase
        .from('foods')
        .delete()
        .eq('id', id);

      if (error) throw error;
      
      setFoods(foods.filter(food => food.id !== id));
    } catch (err) {
      console.error('Error deleting food:', err);
      setError('Erro ao excluir alimento');
    }
  };

  const handleEdit = (food: Food) => {
    setEditingFood(food);
    setFormData({
      name: food.name,
      name_en: food.name_en || '',
      category_id: food.category_id,
      calories: food.calories,
      protein: food.protein,
      carbs: food.carbs,
      fats: food.fats,
      portion: food.portion,
      portion_size: food.portion_size
    });
    setShowAddModal(true);
  };

  const handleCloseModal = () => {
    setShowAddModal(false);
    setEditingFood(null);
    setFormData({
      name: '',
      name_en: '',
      category_id: '',
      calories: 0,
      protein: 0,
      carbs: 0,
      fats: 0,
      portion: 'gramas',
      portion_size: 100
    });
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[200px]">
        <div className="animate-spin rounded-full h-8 w-8 border-t-2 border-b-2 border-[#f8c045]"></div>
      </div>
    );
  }

  return (
    <div>
      {error && (
        <div className="bg-red-900/50 border border-red-600/20 text-red-100 p-4 rounded-lg mb-4">
          {error}
        </div>
      )}

      <div className="flex justify-between items-center mb-4">
        <h2 className="text-xl font-semibold text-[#f8c045]">Gerenciar Alimentos</h2>
        <button
          onClick={() => setShowAddModal(true)}
          className="flex items-center bg-[#f8c045] text-[rgb(23,23,23)] px-4 py-2 rounded-lg hover:bg-[#e6b041] transition font-semibold"
        >
          <Plus size={20} className="mr-2" />
          Adicionar Alimento
        </button>
      </div>

      <div className="overflow-x-auto">
        <table className="w-full text-gray-300">
          <thead>
            <tr className="border-b border-[#f8c045]/10">
              <th className="text-left py-3 px-4">Nome</th>
              <th className="text-center py-3 px-4">Ações</th>
            </tr>
          </thead>
          <tbody>
            {foods.map((food) => (
              <tr key={food.id} className="border-b border-[#f8c045]/10">
                <td className="py-3 px-4">{food.name}</td>
                <td className="py-3 px-4 text-center">
                  <div className="flex justify-center space-x-2">
                    <button
                      onClick={() => handleEdit(food)}
                      className="text-[#f8c045] hover:text-[#e6b041] transition"
                      title="Editar"
                    >
                      <Pencil size={16} />
                    </button>
                    <button
                      onClick={() => handleDelete(food.id)}
                      className="text-red-500 hover:text-red-400 transition"
                      title="Excluir"
                    >
                      <Trash2 size={16} />
                    </button>
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {showAddModal && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
          <div className="bg-[rgb(28,28,28)] p-6 rounded-lg shadow-xl border border-[#f8c045]/10 w-full max-w-md">
            <div className="flex justify-between items-center mb-6">
              <h3 className="text-xl font-semibold text-[#f8c045]">
                {editingFood ? 'Editar Alimento' : 'Novo Alimento'}
              </h3>
              <button
                onClick={handleCloseModal}
                className="text-gray-400 hover:text-gray-300 transition"
              >
                <X size={24} />
              </button>
            </div>

            <form onSubmit={handleSubmit} className="space-y-4">
              <div>
                <label className="block text-gray-300 text-sm font-bold mb-2">
                  Nome em Português
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
                  Nome em Inglês
                </label>
                <input
                  type="text"
                  value={formData.name_en}
                  onChange={(e) => setFormData({ ...formData, name_en: e.target.value })}
                  className="w-full bg-[rgb(23,23,23)] text-gray-300 p-2 rounded-lg border border-[#f8c045]/20 focus:outline-none focus:ring-2 focus:ring-[#f8c045]/50"
                  required
                />
              </div>

              <div>
                <label className="block text-gray-300 text-sm font-bold mb-2">
                  Categoria
                </label>
                <select
                  value={formData.category_id}
                  onChange={(e) => setFormData({ ...formData, category_id: e.target.value })}
                  className="w-full bg-[rgb(23,23,23)] text-gray-300 p-2 rounded-lg border border-[#f8c045]/20 focus:outline-none focus:ring-2 focus:ring-[#f8c045]/50"
                  required
                >
                  <option value="">Selecione uma categoria</option>
                  {categories.map((category) => (
                    <option key={category.id} value={category.id}>
                      {category.name}
                    </option>
                  ))}
                </select>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-gray-300 text-sm font-bold mb-2">
                    Calorias
                  </label>
                  <input
                    type="number"
                    value={formData.calories}
                    onChange={(e) => setFormData({ ...formData, calories: Number(e.target.value) })}
                    className="w-full bg-[rgb(23,23,23)] text-gray-300 p-2 rounded-lg border border-[#f8c045]/20 focus:outline-none focus:ring-2 focus:ring-[#f8c045]/50"
                    required
                  />
                </div>

                <div>
                  <label className="block text-gray-300 text-sm font-bold mb-2">
                    Proteínas (g)
                  </label>
                  <input
                    type="number"
                    step="0.1"
                    value={formData.protein}
                    onChange={(e) => setFormData({ ...formData, protein: Number(e.target.value) })}
                    className="w-full bg-[rgb(23,23,23)] text-gray-300 p-2 rounded-lg border border-[#f8c045]/20 focus:outline-none focus:ring-2 focus:ring-[#f8c045]/50"
                    required
                  />
                </div>

                <div>
                  <label className="block text-gray-300 text-sm font-bold mb-2">
                    Carboidratos (g)
                  </label>
                  <input
                    type="number"
                    step="0.1"
                    value={formData.carbs}
                    onChange={(e) => setFormData({ ...formData, carbs: Number(e.target.value) })}
                    className="w-full bg-[rgb(23,23,23)] text-gray-300 p-2 rounded-lg border border-[#f8c045]/20 focus:outline-none focus:ring-2 focus:ring-[#f8c045]/50"
                    required
                  />
                </div>

                <div>
                  <label className="block text-gray-300 text-sm font-bold mb-2">
                    Gorduras (g)
                  </label>
                  <input
                    type="number"
                    step="0.1"
                    value={formData.fats}
                    onChange={(e) => setFormData({ ...formData, fats: Number(e.target.value) })}
                    className="w-full bg-[rgb(23,23,23)] text-gray-300 p-2 rounded-lg border border-[#f8c045]/20 focus:outline-none focus:ring-2 focus:ring-[#f8c045]/50"
                    required
                  />
                </div>
              </div>

              <div className="mt-6 flex space-x-4">
                <button
                  type="button"
                  onClick={handleCloseModal}
                  className="flex-1 bg-[rgb(23,23,23)] text-[#f8c045] py-2 px-4 rounded-lg hover:bg-[rgb(33,33,33)] transition font-semibold border border-[#f8c045]"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  className="flex-1 bg-[#f8c045] text-[rgb(23,23,23)] py-2 px-4 rounded-lg hover:bg-[#e6b041] transition font-semibold"
                >
                  {editingFood ? 'Salvar' : 'Adicionar'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}