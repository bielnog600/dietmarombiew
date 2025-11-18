import React, { useState, useEffect } from 'react';
import { supabase, updateUserPassword } from '../lib/supabase';
import { Plus, Pencil, Trash2, X, Calculator, Eye, Droplet, Calendar } from 'lucide-react';
import type { User, MacroDistribution, Diet } from '../types';
import DietPlanning from './DietPlanning';
import ViewDietModal from './ViewDietModal';
import WaterIntakeModal from './WaterIntakeModal';
import WeeklyDietConfig from './WeeklyDietConfig';
import { ACTIVITY_LEVELS } from '../lib/calories';
import { generateDiet } from '../lib/diet';

interface UserFormData {
  name: string;
  email: string;
  password: string;
  plan_expiry: string;
  weight: string;
  height: string;
  age: string;
  lean_mass: string;
  fat_mass: string;
  gender: string;
  activity_level: string;
  water_intake: string;
}

function UserManagement() {
  const [users, setUsers] = useState<User[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [showAddModal, setShowAddModal] = useState(false);
  const [showEditModal, setShowEditModal] = useState(false);
  const [showDietModal, setShowDietModal] = useState(false);
  const [showViewDietModal, setShowViewDietModal] = useState(false);
  const [showWaterIntakeModal, setShowWaterIntakeModal] = useState(false);
  const [showWeeklyDietModal, setShowWeeklyDietModal] = useState(false);
  const [selectedUser, setSelectedUser] = useState<User | null>(null);
  const [selectedDiet, setSelectedDiet] = useState<Diet | null>(null);
  const [selectedDayOfWeek, setSelectedDayOfWeek] = useState<number>(1);
  const [formData, setFormData] = useState<UserFormData>({
    name: '',
    email: '',
    password: '',
    plan_expiry: '',
    weight: '',
    height: '',
    age: '',
    lean_mass: '',
    fat_mass: '',
    gender: '',
    activity_level: '',
    water_intake: ''
  });

  useEffect(() => {
    fetchUsers();
  }, []);

  const fetchUsers = async () => {
    try {
      const { data, error } = await supabase
        .from('users')
        .select('*')
        .order('created_at', { ascending: false });

      if (error) throw error;
      setUsers(data || []);
    } catch (err) {
      console.error('Error fetching users:', err);
      setError('Erro ao carregar usuários');
    } finally {
      setLoading(false);
    }
  };

  const handleEditClick = (user: User) => {
    setSelectedUser(user);
    setFormData({
      name: user.name,
      email: user.email,
      password: '',
      plan_expiry: user.plan_expiry?.split('T')[0] || '',
      weight: user.weight?.toString() || '',
      height: user.height?.toString() || '',
      age: user.age?.toString() || '',
      lean_mass: user.lean_mass?.toString() || '',
      fat_mass: user.fat_mass?.toString() || '',
      gender: user.gender || '',
      activity_level: user.activity_level || '',
      water_intake: user.water_intake?.toString() || ''
    });
    setShowEditModal(true);
  };

  const handleWaterIntakeClick = (user: User) => {
    setSelectedUser(user);
    setShowWaterIntakeModal(true);
  };


  const handleEditSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedUser) return;
    setError('');

    try {
      const weight = formData.weight ? Number(formData.weight) : null;
      const waterIntake = weight ? calculateWaterIntake(weight) : (selectedUser.water_intake || 2000);

      const updates: Partial<User> = {
        name: formData.name,
        plan_expiry: formData.plan_expiry || null,
        weight: weight,
        height: formData.height ? Number(formData.height) : null,
        age: formData.age ? Number(formData.age) : null,
        lean_mass: formData.lean_mass ? Number(formData.lean_mass) : null,
        fat_mass: formData.fat_mass ? Number(formData.fat_mass) : null,
        gender: formData.gender || null,
        activity_level: formData.activity_level || null,
        water_intake: waterIntake
      };

      const { error: updateError } = await supabase
        .from('users')
        .update(updates)
        .eq('id', selectedUser.id);

      if (updateError) throw updateError;

      if (formData.password) {
        try {
          await updateUserPassword(selectedUser.id, formData.password);
        } catch (pwdErr: any) {
          setUsers(users.map(user =>
            user.id === selectedUser.id
              ? { ...user, ...updates }
              : user
          ));
          setError(`Perfil atualizado com sucesso! Mas a senha não pôde ser alterada. Por favor, certifique-se de que a edge function 'update-user-password' está deployada no Supabase. Erro: ${pwdErr.message}`);
          return;
        }
      }

      setUsers(users.map(user =>
        user.id === selectedUser.id
          ? { ...user, ...updates }
          : user
      ));

      setShowEditModal(false);
      setSelectedUser(null);
    } catch (err: any) {
      console.error('Error updating user:', err);
      setError(err.message);
    }
  };

  const calculateWaterIntake = (weight: number) => {
    if (!weight) return 2000; // Default value if no weight
    return Math.round((weight * 35) * 1.5); // (weight * 35) + 50%
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');

    try {
      const { data: authData, error: authError } = await supabase.auth.signUp({
        email: formData.email,
        password: formData.password
      });

      if (authError) throw authError;
      if (!authData.user) throw new Error('No authentication data received');

      const weight = formData.weight ? Number(formData.weight) : null;
      const waterIntake = weight ? calculateWaterIntake(weight) : 2000;

      const { error: profileError } = await supabase
        .from('users')
        .insert([{
          id: authData.user.id,
          email: formData.email,
          name: formData.name,
          plan_expiry: formData.plan_expiry || null,
          weight: weight,
          height: formData.height ? Number(formData.height) : null,
          age: formData.age ? Number(formData.age) : null,
          lean_mass: formData.lean_mass ? Number(formData.lean_mass) : null,
          fat_mass: formData.fat_mass ? Number(formData.fat_mass) : null,
          gender: formData.gender || null,
          activity_level: formData.activity_level || null,
          calculation_method: 'harris',
          water_intake: waterIntake
        }]);

      if (profileError) {
        await supabase.auth.signOut();
        throw profileError;
      }

      await fetchUsers();
      setShowAddModal(false);
      setFormData({
        name: '',
        email: '',
        password: '',
        plan_expiry: '',
        weight: '',
        height: '',
        age: '',
        lean_mass: '',
        fat_mass: '',
        gender: '',
        activity_level: '',
        water_intake: ''
      });
    } catch (err: any) {
      console.error('Error creating user:', err);
      if (err.message?.includes('already registered')) {
        setError('Este email já está registrado');
      } else {
        setError('Erro ao criar usuário');
      }
    }
  };

  const handleDelete = async (userId: string) => {
    if (!confirm('Tem certeza que deseja excluir este usuário?')) return;

    try {
      const { error } = await supabase
        .from('users')
        .delete()
        .eq('id', userId);

      if (error) throw error;
      
      setUsers(users.filter(user => user.id !== userId));
    } catch (err) {
      console.error('Error deleting user:', err);
      setError('Erro ao excluir usuário');
    }
  };

  const handlePlanDiet = (userId: string, dayOfWeek: number = 1) => {
    const user = users.find(u => u.id === userId);
    if (!user) return;

    setSelectedUser(user);
    setSelectedDayOfWeek(dayOfWeek);
    setShowDietModal(true);
  };

  const handlePlanWeeklyDiet = (userId: string) => {
    const user = users.find(u => u.id === userId);
    if (!user) return;

    setSelectedUser(user);
    setShowWeeklyDietModal(true);
  };

  const handleViewDiet = async (userId: string) => {
    const user = users.find(u => u.id === userId);
    if (!user) return;

    setSelectedUser(user);
    const diet = await fetchLatestDiet(userId);
    if (diet) {
      setSelectedDiet(diet);
      setShowViewDietModal(true);
    } else {
      setError('Usuário não possui dieta');
    }
  };

  const handleDietDeleted = async () => {
    setShowViewDietModal(false);
    setSelectedUser(null);
    setSelectedDiet(null);
    await fetchUsers();
  };

  const handleGenerateNewDiet = async (calories: number, macros: MacroDistribution, dayOfWeek?: number) => {
    try {
      setShowDietModal(false);
      setSelectedUser(null);
      await fetchUsers();
    } catch (err) {
      console.error('Error after generating diet:', err);
      setError('Erro ao atualizar após gerar dieta');
    }
  };

  const handleWeeklyDietSubmit = async (configs: any[]) => {
    if (!selectedUser) return;

    try {
      // Delete existing diets for this user
      const { error: deleteError } = await supabase
        .from('diets')
        .delete()
        .eq('user_id', selectedUser.id);

      if (deleteError) throw deleteError;

      const mealConfigs = [
        { name: 'Café da Manhã', percentage: 0.25 },
        { name: 'Almoço', percentage: 0.35 },
        { name: 'Lanche', percentage: 0.15 },
        { name: 'Jantar', percentage: 0.25 }
      ];

      for (const config of configs) {
        const dietPlan = await generateDiet(
          config.calories,
          config.macros,
          mealConfigs
        );

        const { data: dietData, error: dietError } = await supabase
          .from('diets')
          .insert([{
            user_id: selectedUser.id,
            calories: config.calories,
            day_of_week: config.dayOfWeek
          }])
          .select()
          .single();

        if (dietError) throw dietError;

        const { error: macrosError } = await supabase
          .from('diet_macros')
          .insert([{
            diet_id: dietData.id,
            protein: config.macros.protein,
            carbs: config.macros.carbs,
            fats: config.macros.fats
          }]);

        if (macrosError) throw macrosError;

        let foodIndex = 0;
        for (const mealConfig of mealConfigs) {
          const { data: mealData, error: mealError } = await supabase
            .from('meals')
            .insert([{
              diet_id: dietData.id,
              name: mealConfig.name
            }])
            .select()
            .single();

          if (mealError) throw mealError;

          const startIndex = Math.floor(foodIndex);
          const endIndex = Math.floor(foodIndex + (dietPlan.length / mealConfigs.length));
          const mealFoods = dietPlan.slice(startIndex, endIndex);
          foodIndex = endIndex;

          if (mealFoods.length > 0) {
            const { error: foodsError } = await supabase
              .from('meal_foods')
              .insert(
                mealFoods.map(food => ({
                  meal_id: mealData.id,
                  food_id: food.id,
                  quantity: food.portion_size / 100
                }))
              );

            if (foodsError) throw foodsError;
          }
        }
      }

      setShowWeeklyDietModal(false);
      setSelectedUser(null);
      await fetchUsers();
    } catch (err) {
      console.error('Error creating weekly diet:', err);
      throw err;
    }
  };

  const fetchLatestDiet = async (userId: string) => {
    try {
      const currentDayOfWeek = new Date().getDay();

      const { data: diets, error: dietError } = await supabase
        .from('diets')
        .select(`
          *,
          meals:meals(
            *,
            meal_foods:meal_foods(
              *,
              food:foods(*, food_categories(*))
            )
          ),
          macros:diet_macros(*)
        `)
        .eq('user_id', userId)
        .eq('day_of_week', currentDayOfWeek);

      if (dietError) throw dietError;

      if (diets && diets.length > 0) {
        setSelectedDiet(diets[0]);
        return diets[0];
      }

      return null;
    } catch (err) {
      console.error('Error fetching diet:', err);
      return null;
    }
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
        <h2 className="text-xl font-semibold text-[#f8c045]">Gerenciar Usuários</h2>
        <button
          onClick={() => setShowAddModal(true)}
          className="flex items-center bg-[#f8c045] text-[rgb(23,23,23)] px-4 py-2 rounded-lg hover:bg-[#e6b041] transition font-semibold"
        >
          <Plus size={20} className="mr-2" />
          Adicionar Usuário
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
            {users.map((user) => (
              <tr key={user.id} className="border-b border-[#f8c045]/10">
                <td className="py-3 px-4">
                  <button
                    onClick={() => handleEditClick(user)}
                    className="text-[#f8c045] hover:text-[#e6b041] transition text-left"
                  >
                    {user.name}
                  </button>
                </td>
                <td className="py-3 px-4">
                  <div className="flex justify-center space-x-4">
                    <button
                      onClick={() => handleViewDiet(user.id)}
                      className="text-blue-500 hover:text-blue-400 transition"
                      title="Ver Dieta"
                    >
                      <Eye size={18} />
                    </button>
                    <button
                      onClick={() => handlePlanDiet(user.id)}
                      className="text-[#f8c045] hover:text-[#e6b041] transition"
                      title="Planejar Dieta (1 dia)"
                    >
                      <Calculator size={18} />
                    </button>
                    <button
                      onClick={() => handlePlanWeeklyDiet(user.id)}
                      className="text-green-500 hover:text-green-400 transition"
                      title="Dieta Semanal (7 dias)"
                    >
                      <Calendar size={18} />
                    </button>
                    <button
                      onClick={() => handleWaterIntakeClick(user)}
                      className="text-blue-400 hover:text-blue-300 transition"
                      title="Ajustar Água"
                    >
                      <Droplet size={18} />
                    </button>
                    <button
                      onClick={() => handleDelete(user.id)}
                      className="text-red-500 hover:text-red-400 transition"
                      title="Excluir"
                    >
                      <Trash2 size={18} />
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
              <h3 className="text-xl font-semibold text-[#f8c045]">Novo Usuário</h3>
              <button
                onClick={() => setShowAddModal(false)}
                className="text-gray-400 hover:text-gray-300 transition"
              >
                <X size={24} />
              </button>
            </div>

            <form onSubmit={handleSubmit} className="space-y-4">
              <div>
                <label className="block text-gray-300 text-sm font-bold mb-2">
                  Nome
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
                  Email
                </label>
                <input
                  type="email"
                  value={formData.email}
                  onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                  className="w-full bg-[rgb(23,23,23)] text-gray-300 p-2 rounded-lg border border-[#f8c045]/20 focus:outline-none focus:ring-2 focus:ring-[#f8c045]/50"
                  required
                />
              </div>

              <div>
                <label className="block text-gray-300 text-sm font-bold mb-2">
                  Senha
                </label>
                <input
                  type="password"
                  value={formData.password}
                  onChange={(e) => setFormData({ ...formData, password: e.target.value })}
                  className="w-full bg-[rgb(23,23,23)] text-gray-300 p-2 rounded-lg border border-[#f8c045]/20 focus:outline-none focus:ring-2 focus:ring-[#f8c045]/50"
                  required
                />
              </div>

              <div>
                <label className="block text-gray-300 text-sm font-bold mb-2">
                  Vencimento do Plano
                </label>
                <input
                  type="date"
                  value={formData.plan_expiry}
                  onChange={(e) => setFormData({ ...formData, plan_expiry: e.target.value })}
                  className="w-full bg-[rgb(23,23,23)] text-gray-300 p-2 rounded-lg border border-[#f8c045]/20 focus:outline-none focus:ring-2 focus:ring-[#f8c045]/50"
                />
              </div>

              <div className="pt-4 border-t border-[#f8c045]/10">
                <h4 className="text-[#f8c045] font-semibold mb-4">Dados Físicos</h4>
                
                <div className="grid grid-cols-2 gap-4 mb-4">
                  <div>
                    <label className="block text-gray-300 text-sm font-bold mb-2">
                      Gênero
                    </label>
                    <select
                      value={formData.gender}
                      onChange={(e) => setFormData({ ...formData, gender: e.target.value })}
                      className="w-full bg-[rgb(23,23,23)] text-gray-300 p-2 rounded-lg border border-[#f8c045]/20 focus:outline-none focus:ring-2 focus:ring-[#f8c045]/50"
                    >
                      <option value="">Selecione o gênero</option>
                      <option value="male">Masculino</option>
                      <option value="female">Feminino</option>
                    </select>
                  </div>

                  <div>
                    <label className="block text-gray-300 text-sm font-bold mb-2">
                      Nível de Atividade
                    </label>
                    <select
                      value={formData.activity_level}
                      onChange={(e) => setFormData({ ...formData, activity_level: e.target.value })}
                      className="w-full bg-[rgb(23,23,23)] text-gray-300 p-2 rounded-lg border border-[#f8c045]/20 focus:outline-none focus:ring-2 focus:ring-[#f8c045]/50"
                    >
                      <option value="">Selecione o nível</option>
                      {Object.entries(ACTIVITY_LEVELS).map(([key, level]) => (
                        <option key={key} value={key}>
                          {level.label} - {level.description}
                        </option>
                      ))}
                    </select>
                  </div>
                </div>

                <div className="grid grid-cols-3 gap-4">
                  <div>
                    <label className="block text-gray-300 text-sm font-bold mb-2">
                      Peso (kg)
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
                      Altura (cm)
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
                      Idade
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
                </div>

                <div className="grid grid-cols-2 gap-4 mt-4">
                  <div>
                    <label className="block text-gray-300 text-sm font-bold mb-2">
                      Massa Magra (kg)
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
                      Massa Gorda (kg)
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

              <div className="mt-6 flex space-x-4">
                <button
                  type="button"
                  onClick={() => setShowAddModal(false)}
                  className="flex-1 bg-[rgb(23,23,23)] text-[#f8c045] py-2 px-4 rounded-lg hover:bg-[rgb(33,33,33)] transition font-semibold border border-[#f8c045]"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  className="flex-1 bg-[#f8c045] text-[rgb(23,23,23)] py-2 px-4 rounded-lg hover:bg-[#e6b041] transition font-semibold"
                >
                  Criar
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {showEditModal && selectedUser && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
          <div className="bg-[rgb(28,28,28)] p-6 rounded-lg shadow-xl border border-[#f8c045]/10 w-full max-w-md max-h-[90vh] overflow-y-auto">
            <div className="flex justify-between items-center mb-6">
              <h3 className="text-xl font-semibold text-[#f8c045]">Editar Usuário</h3>
              <button
                onClick={() => {
                  setShowEditModal(false);
                  setSelectedUser(null);
                }}
                className="text-gray-400 hover:text-gray-300 transition"
              >
                <X size={24} />
              </button>
            </div>

            <form onSubmit={handleEditSubmit} className="space-y-4">
              <div>
                <label className="block text-gray-300 text-sm font-bold mb-2">
                  Nome
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
                  Email
                </label>
                <input
                  type="email"
                  value={formData.email}
                  disabled
                  className="w-full bg-[rgb(23,23,23)] text-gray-400 p-2 rounded-lg border border-[#f8c045]/20 cursor-not-allowed"
                />
              </div>

              <div>
                <label className="block text-gray-300 text-sm font-bold mb-2">
                  Nova Senha (opcional)
                </label>
                <input
                  type="password"
                  value={formData.password}
                  onChange={(e) => setFormData({ ...formData, password: e.target.value })}
                  className="w-full bg-[rgb(23,23,23)] text-gray-300 p-2 rounded-lg border border-[#f8c045]/20 focus:outline-none focus:ring-2 focus:ring-[#f8c045]/50"
                  placeholder="Deixe em branco para manter a senha atual"
                />
                <p className="text-gray-400 text-xs mt-1">
                  Digite uma nova senha para redefinir
                </p>
              </div>

              <div>
                <label className="block text-gray-300 text-sm font-bold mb-2">
                  Vencimento do Plano
                </label>
                <input
                  type="date"
                  value={formData.plan_expiry}
                  onChange={(e) => setFormData({ ...formData, plan_expiry: e.target.value })}
                  className="w-full bg-[rgb(23,23,23)] text-gray-300 p-2 rounded-lg border border-[#f8c045]/20 focus:outline-none focus:ring-2 focus:ring-[#f8c045]/50"
                />
              </div>

              <div className="pt-4 border-t border-[#f8c045]/10">
                <h4 className="text-[#f8c045] font-semibold mb-4">Dados Físicos</h4>
                
                <div className="grid grid-cols-2 gap-4 mb-4">
                  <div>
                    <label className="block text-gray-300 text-sm font-bold mb-2">
                      Gênero
                    </label>
                    <select
                      value={formData.gender}
                      onChange={(e) => setFormData({ ...formData, gender: e.target.value })}
                      className="w-full bg-[rgb(23,23,23)] text-gray-300 p-2 rounded-lg border border-[#f8c045]/20 focus:outline-none focus:ring-2 focus:ring-[#f8c045]/50"
                    >
                      <option value="">Selecione o gênero</option>
                      <option value="male">Masculino</option>
                      <option value="female">Feminino</option>
                    </select>
                  </div>

                  <div>
                    <label className="block text-gray-300 text-sm font-bold mb-2">
                      Nível de Atividade
                    </label>
                    <select
                      value={formData.activity_level}
                      onChange={(e) => setFormData({ ...formData, activity_level: e.target.value })}
                      className="w-full bg-[rgb(23,23,23)] text-gray-300 p-2 rounded-lg border border-[#f8c045]/20 focus:outline-none focus:ring-2 focus:ring-[#f8c045]/50"
                    >
                      <option value="">Selecione o nível</option>
                      {Object.entries(ACTIVITY_LEVELS).map(([key, level]) => (
                        <option key={key} value={key}>
                          {level.label} - {level.description}
                        </option>
                      ))}
                    </select>
                  </div>
                </div>

                <div className="grid grid-cols-3 gap-4">
                  <div>
                    <label className="block text-gray-300 text-sm font-bold mb-2">
                      Peso (kg)
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
                      Altura (cm)
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
                      Idade
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
                </div>

                <div className="grid grid-cols-2 gap-4 mt-4">
                  <div>
                    <label className="block text-gray-300 text-sm font-bold mb-2">
                      Massa Magra (kg)
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
                      Massa Gorda (kg)
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

              <div className="mt-6 flex space-x-4">
                <button
                  type="button"
                  onClick={() => {
                    setShowEditModal(false);
                    setSelectedUser(null);
                  }}
                  className="flex-1 bg-[rgb(23,23,23)] text-[#f8c045] py-2 px-4 rounded-lg hover:bg-[rgb(33,33,33)] transition font-semibold border border-[#f8c045]"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  className="flex-1 bg-[#f8c045] text-[rgb(23,23,23)] py-2 px-4 rounded-lg hover:bg-[#e6b041] transition font-semibold"
                >
                  Salvar
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {showDietModal && selectedUser && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
          <div className="bg-[rgb(28,28,28)] p-6 rounded-lg shadow-xl border border-[#f8c045]/10 w-full max-w-4xl max-h-[90vh] overflow-y-auto">
            <div className="flex justify-between items-center mb-6">
              <div>
                <h3 className="text-xl font-semibold text-[#f8c045]">Planejar Dieta</h3>
                <p className="text-gray-400">Usuário: {selectedUser.name}</p>
              </div>
              <button
                onClick={() => setShowDietModal(false)}
                className="text-gray-400 hover:text-gray-300 transition"
              >
                <X size={24} />
              </button>
            </div>

            <div className="mb-4">
              <label className="block text-gray-300 text-sm font-bold mb-2">
                Dia da Semana
              </label>
              <select
                value={selectedDayOfWeek}
                onChange={(e) => setSelectedDayOfWeek(Number(e.target.value))}
                className="w-full bg-[rgb(23,23,23)] text-gray-300 p-2 rounded-lg border border-[#f8c045]/20 focus:outline-none focus:ring-2 focus:ring-[#f8c045]/50"
              >
                <option value={1}>Segunda-feira</option>
                <option value={2}>Terça-feira</option>
                <option value={3}>Quarta-feira</option>
                <option value={4}>Quinta-feira</option>
                <option value={5}>Sexta-feira</option>
                <option value={6}>Sábado</option>
                <option value={0}>Domingo</option>
              </select>
            </div>
            <DietPlanning
              user={selectedUser}
              onSubmit={handleGenerateNewDiet}
              dayOfWeek={selectedDayOfWeek}
            />
          </div>
        </div>
      )}

      {showViewDietModal && selectedDiet && (
        <ViewDietModal
          isOpen={showViewDietModal}
          onClose={() => {
            setShowViewDietModal(false);
            setSelectedUser(null);
            setSelectedDiet(null);
          }}
          diet={selectedDiet}
          userName={selectedUser?.name || ''}
          onDietDeleted={handleDietDeleted}
        />
      )}

      {showWaterIntakeModal && selectedUser && (
        <WaterIntakeModal
          isOpen={showWaterIntakeModal}
          onClose={() => {
            setShowWaterIntakeModal(false);
            setSelectedUser(null);
          }}
          user={selectedUser}
          onUpdate={fetchUsers}
        />
      )}

      {showWeeklyDietModal && selectedUser && (
        <WeeklyDietConfig
          isOpen={showWeeklyDietModal}
          onClose={() => {
            setShowWeeklyDietModal(false);
            setSelectedUser(null);
          }}
          user={selectedUser}
          onSubmit={handleWeeklyDietSubmit}
        />
      )}
    </div>
  );
}

export default UserManagement;