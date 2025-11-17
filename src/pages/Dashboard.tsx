import React, { useState } from 'react';
import { useAuthStore } from '../store/authStore';
import { Users, Scale, Droplet, LogOut } from 'lucide-react';
import FoodManagement from '../components/FoodManagement';
import UserManagement from '../components/UserManagement';

export default function Dashboard() {
  const user = useAuthStore((state) => state.user);
  const signOut = useAuthStore((state) => state.signOut);
  const [activeTab, setActiveTab] = useState<'users' | 'foods'>('users');

  const isAdmin = user?.email === 'bielnog600@gmail.com';

  const handleSignOut = () => {
    signOut();
  };

  if (isAdmin) {
    return (
      <div className="max-w-6xl mx-auto">
        <div className="flex justify-between items-center mb-8">
          <h1 className="text-3xl font-bold text-[#f8c045]">PLANEJAMENTOS</h1>
          <button
            onClick={handleSignOut}
            className="flex items-center gap-2 bg-red-500 hover:bg-red-600 text-white px-4 py-2 rounded-lg transition font-semibold"
          >
            <LogOut size={20} />
            Sair
          </button>
        </div>
        
        <div className="bg-[rgb(28,28,28)] rounded-lg shadow-xl border border-[#f8c045]/10 overflow-hidden">
          <div className="flex border-b border-[#f8c045]/10">
            <button
              className={`flex-1 px-6 py-4 text-lg font-semibold ${
                activeTab === 'users'
                  ? 'text-[#f8c045] border-b-2 border-[#f8c045]'
                  : 'text-gray-400 hover:text-gray-300'
              }`}
              onClick={() => setActiveTab('users')}
            >
              Usuários
            </button>
            <button
              className={`flex-1 px-6 py-4 text-lg font-semibold ${
                activeTab === 'foods'
                  ? 'text-[#f8c045] border-b-2 border-[#f8c045]'
                  : 'text-gray-400 hover:text-gray-300'
              }`}
              onClick={() => setActiveTab('foods')}
            >
              Alimentos
            </button>
          </div>

          <div className="p-6">
            {activeTab === 'users' ? <UserManagement /> : <FoodManagement />}
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="max-w-4xl mx-auto">
      <h1 className="text-4xl font-bold mb-8 text-[#f8c045]">
        Olá, {user?.name}!
      </h1>
      
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-8">
        <div className="bg-[rgb(28,28,28)] p-6 rounded-lg shadow-xl border border-[#f8c045]/10">
          <div className="flex items-center mb-4">
            <Scale className="text-[#f8c045] mr-2" />
            <h2 className="text-xl font-semibold text-[#f8c045]">Calorias Diárias</h2>
          </div>
          <p className="text-3xl font-bold text-[#f8c045]">{user?.daily_calories} kcal</p>
          
          <div className="mt-4">
            <h3 className="font-semibold mb-2 text-gray-300">Distribuição de Macronutrientes</h3>
            <div className="space-y-2">
              <div className="flex justify-between text-gray-300">
                <span>Proteínas</span>
                <span className="font-medium">150g</span>
              </div>
              <div className="flex justify-between text-gray-300">
                <span>Carboidratos</span>
                <span className="font-medium">225g</span>
              </div>
              <div className="flex justify-between text-gray-300">
                <span>Gorduras</span>
                <span className="font-medium">55g</span>
              </div>
            </div>
          </div>
        </div>

        <div className="bg-[rgb(28,28,28)] p-6 rounded-lg shadow-xl border border-[#f8c045]/10">
          <div className="flex items-center mb-4">
            <Droplet className="text-[#f8c045] mr-2" />
            <h2 className="text-xl font-semibold text-[#f8c045]">Consumo de Água</h2>
          </div>
          <p className="text-3xl font-bold text-[#f8c045]">{user?.water_intake}ml</p>
          <p className="mt-2 text-gray-400">Meta diária recomendada</p>
        </div>
      </div>

      <div className="bg-[rgb(28,28,28)] p-6 rounded-lg shadow-xl border border-[#f8c045]/10">
        <h2 className="text-xl font-semibold mb-4 text-[#f8c045]">Ações</h2>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <button className="bg-[#f8c045] text-center text-[rgb(23,23,23)] py-3 px-4 rounded-lg hover:bg-[#e6b041] transition font-semibold">
            Ver Minha Dieta
          </button>
          <button className="bg-[rgb(23,23,23)] text-[#f8c045] py-3 px-4 rounded-lg hover:bg-[rgb(28,28,28)] transition font-semibold border-2 border-[#f8c045]">
            Substituir Alimentos
          </button>
        </div>
      </div>
    </div>
  );
}