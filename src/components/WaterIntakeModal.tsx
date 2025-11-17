import React, { useState } from 'react';
import { X, Droplet } from 'lucide-react';
import { supabase } from '../lib/supabase';
import type { User } from '../types';

interface WaterIntakeModalProps {
  isOpen: boolean;
  onClose: () => void;
  user: User;
  onUpdate: () => void;
}

export default function WaterIntakeModal({ isOpen, onClose, user, onUpdate }: WaterIntakeModalProps) {
  const [waterIntake, setWaterIntake] = useState(user.water_intake);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const handleWaterIntakeAdjustment = async (adjustment: number) => {
    try {
      const newIntake = Math.round(waterIntake * (1 + adjustment / 100));

      const { error: updateError } = await supabase
        .from('users')
        .update({ water_intake: newIntake })
        .eq('id', user.id);

      if (updateError) throw updateError;

      setWaterIntake(newIntake);
      onUpdate();
    } catch (err) {
      console.error('Error adjusting water intake:', err);
      setError('Erro ao ajustar consumo de água');
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
      <div className="bg-[rgb(28,28,28)] p-6 rounded-lg shadow-xl border border-[#f8c045]/10 w-full max-w-md">
        <div className="flex justify-between items-center mb-6">
          <div className="flex items-center">
            <Droplet className="text-[#f8c045] mr-2" />
            <h3 className="text-xl font-semibold text-[#f8c045]">Ajustar Consumo de Água</h3>
          </div>
          <button
            onClick={onClose}
            className="text-gray-400 hover:text-gray-300 transition"
          >
            <X size={24} />
          </button>
        </div>

        {error && (
          <div className="bg-red-900/50 border border-red-600/20 text-red-100 p-4 rounded-lg mb-4">
            {error}
          </div>
        )}

        <div className="space-y-4">
          <div className="bg-[rgb(23,23,23)] p-4 rounded-lg border border-[#f8c045]/20">
            <div className="flex items-center justify-between">
              <span className="text-gray-400">Consumo Atual</span>
              <span className="text-2xl font-bold text-[#f8c045]">{waterIntake}ml</span>
            </div>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <button
              onClick={() => handleWaterIntakeAdjustment(-10)}
              className="bg-[rgb(23,23,23)] text-[#f8c045] py-3 px-4 rounded-lg hover:bg-[rgb(33,33,33)] transition font-semibold border border-[#f8c045]"
            >
              Diminuir 10%
            </button>
            <button
              onClick={() => handleWaterIntakeAdjustment(10)}
              className="bg-[#f8c045] text-[rgb(23,23,23)] py-3 px-4 rounded-lg hover:bg-[#e6b041] transition font-semibold"
            >
              Aumentar 10%
            </button>
          </div>

          <p className="text-sm text-gray-400 mt-4">
            O consumo de água é calculado com base no peso do usuário. 
            Para um peso de {user.weight}kg, recomenda-se aproximadamente {Math.round((user.weight || 0) * 35 * 1.5)}ml por dia.
          </p>
        </div>
      </div>
    </div>
  );
}