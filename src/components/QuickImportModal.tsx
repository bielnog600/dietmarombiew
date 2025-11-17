import React, { useState, useEffect } from 'react';
import { X, Upload, FileText, Eye, Check, AlertTriangle } from 'lucide-react';
import { supabase } from '../lib/supabase';
import { useTranslation } from '../translations';
import { useLanguageStore } from '../store/languageStore';

interface QuickImportModalProps {
  isOpen: boolean;
  onClose: () => void;
  dietId: string;
  onImportComplete: () => void;
}

interface ParsedMealData {
  mealName: string;
  foodName: string;
  quantity: number;
  calories: number;
  protein: number;
  carbs: number;
  fats: number;
}

interface FoodMatch {
  csvFood: ParsedMealData;
  dbFood: any | null;
  matchType: 'exact' | 'partial' | 'none';
  confirmed: boolean;
}

export default function QuickImportModal({ isOpen, onClose, dietId, onImportComplete }: QuickImportModalProps) {
  const { t } = useTranslation();
  const language = useLanguageStore(state => state.language);
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [parsedData, setParsedData] = useState<ParsedMealData[]>([]);
  const [showPreview, setShowPreview] = useState(false);
  const [foodMatches, setFoodMatches] = useState<FoodMatch[]>([]);
  const [dbFoods, setDbFoods] = useState<any[]>([]);
  const [matchingFoods, setMatchingFoods] = useState(false);

  useEffect(() => {
    if (isOpen) {
      fetchDatabaseFoods();
    }
  }, [isOpen]);

  const fetchDatabaseFoods = async () => {
    try {
      const { data, error } = await supabase
        .from('foods')
        .select('*')
        .order('name');

      if (error) throw error;
      setDbFoods(data || []);
    } catch (err) {
      console.error('Error fetching foods:', err);
      setError('Erro ao carregar alimentos do banco de dados');
    }
  };

  const getFoodName = (food: { name: string; name_en?: string | null }) => {
    if (language === 'en' && food.name_en) {
      return food.name_en;
    }
    return food.name;
  };

  const parseCSVData = (csvContent: string): ParsedMealData[] => {
    const lines = csvContent.trim().split('\n');
    const parsed: ParsedMealData[] = [];

    // Skip header line and process data
    for (let i = 1; i < lines.length; i++) {
      const line = lines[i].trim();
      if (!line || line.toLowerCase().includes('total')) continue;

      // Parse CSV line
      const cells = line.split(',').map(cell => cell.trim());

      if (cells.length >= 7) {
        const mealName = cells[0];
        const foodName = cells[1];
        const quantity = parseFloat(cells[2]) || 0;
        const calories = parseFloat(cells[3]) || 0;
        const protein = parseFloat(cells[4]) || 0;
        const carbs = parseFloat(cells[5]) || 0;
        const fats = parseFloat(cells[6]) || 0;

        if (mealName && foodName && quantity > 0) {
          parsed.push({
            mealName,
            foodName,
            quantity,
            calories,
            protein,
            carbs,
            fats
          });
        }
      }
    }

    return parsed;
  };

  const findFoodMatches = (parsedFoods: ParsedMealData[]): FoodMatch[] => {
    return parsedFoods.map(csvFood => {
      // Try exact match first
      let dbFood = dbFoods.find(food => 
        getFoodName(food).toLowerCase() === csvFood.foodName.toLowerCase()
      );
      
      let matchType: 'exact' | 'partial' | 'none' = 'none';
      
      if (dbFood) {
        matchType = 'exact';
      } else {
        // Try partial match
        dbFood = dbFoods.find(food => {
          const foodName = getFoodName(food).toLowerCase();
          const csvName = csvFood.foodName.toLowerCase();
          return foodName.includes(csvName) || csvName.includes(foodName);
        });
        
        if (dbFood) {
          matchType = 'partial';
        }
      }

      return {
        csvFood,
        dbFood,
        matchType,
        confirmed: matchType === 'exact' // Auto-confirm exact matches
      };
    });
  };

  const handleFileSelect = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (file) {
      if (file.type !== 'text/csv' && !file.name.endsWith('.csv')) {
        setError('Por favor, selecione um arquivo CSV válido.');
        return;
      }
      setSelectedFile(file);
      setError('');
    }
  };

  const handlePreview = async () => {
    if (!selectedFile) {
      setError('Por favor, selecione um arquivo CSV.');
      return;
    }

    setError('');
    setMatchingFoods(true);
    
    try {
      const csvContent = await selectedFile.text();
      const parsed = parseCSVData(csvContent);
      
      if (parsed.length === 0) {
        setError('Nenhum dado válido encontrado no arquivo CSV. Verifique o formato.');
        return;
      }
      
      setParsedData(parsed);
      
      // Find matches with database foods
      const matches = findFoodMatches(parsed);
      setFoodMatches(matches);
      
      setShowPreview(true);
    } catch (err) {
      console.error('Error parsing CSV:', err);
      setError('Erro ao processar o arquivo CSV. Verifique o formato.');
    } finally {
      setMatchingFoods(false);
    }
  };

  const handleFoodMatchToggle = (index: number, foodId?: string) => {
    setFoodMatches(prev => prev.map((match, i) => {
      if (i === index) {
        if (foodId) {
          // Select a specific food from database
          const selectedFood = dbFoods.find(f => f.id === foodId);
          return {
            ...match,
            dbFood: selectedFood,
            matchType: 'exact' as const,
            confirmed: true
          };
        } else {
          // Toggle confirmation
          return {
            ...match,
            confirmed: !match.confirmed
          };
        }
      }
      return match;
    }));
  };

  const handleImport = async () => {
    if (loading || foodMatches.length === 0) return;
    setLoading(true);
    setError('');

    try {
      // Get existing meals for this diet
      const { data: existingMeals, error: mealsError } = await supabase
        .from('meals')
        .select('id, name')
        .eq('diet_id', dietId);

      if (mealsError) throw mealsError;

      const mealMap = new Map(existingMeals?.map(m => [m.name.toLowerCase(), m.id]) || []);

      // Group confirmed matches by meal
      const confirmedMatches = foodMatches.filter(match => match.confirmed);
      const mealGroups = confirmedMatches.reduce((acc, match) => {
        const mealName = match.csvFood.mealName;
        if (!acc[mealName]) {
          acc[mealName] = [];
        }
        acc[mealName].push(match);
        return acc;
      }, {} as Record<string, FoodMatch[]>);

      for (const [mealName, matches] of Object.entries(mealGroups)) {
        let mealId = mealMap.get(mealName.toLowerCase());

        // Create meal if it doesn't exist
        if (!mealId) {
          const { data: newMeal, error: createMealError } = await supabase
            .from('meals')
            .insert([{
              diet_id: dietId,
              name: mealName
            }])
            .select('id')
            .single();

          if (createMealError) throw createMealError;
          mealId = newMeal.id;
          mealMap.set(mealName.toLowerCase(), mealId);
        }

        // Process each food match in the meal
        for (const match of matches) {
          let foodId = match.dbFood?.id;

          // If no database food was matched, create a new one
          if (!foodId) {
            // Get a default category (first available category)
            const { data: categories, error: categoryError } = await supabase
              .from('food_categories')
              .select('id')
              .limit(1);

            if (categoryError) throw categoryError;

            const defaultCategoryId = categories?.[0]?.id;
            if (!defaultCategoryId) {
              throw new Error('Nenhuma categoria de alimento encontrada. Configure as categorias primeiro.');
            }

            const { data: newFood, error: foodError } = await supabase
              .from('foods')
              .insert([{
                category_id: defaultCategoryId,
                name: match.csvFood.foodName,
                calories: Math.round(match.csvFood.calories),
                protein: match.csvFood.protein,
                carbs: match.csvFood.carbs,
                fats: match.csvFood.fats,
                portion: 'gramas',
                portion_size: 100 // Base portion of 100g
              }])
              .select('id')
              .single();

            if (foodError) throw foodError;
            foodId = newFood.id;
          }

          // Check if this food is already in the meal
          const { data: existingMealFood, error: mealFoodSearchError } = await supabase
            .from('meal_foods')
            .select('id, quantity')
            .eq('meal_id', mealId)
            .eq('food_id', foodId)
            .maybeSingle();

          if (mealFoodSearchError && !mealFoodSearchError.message.includes('No rows')) {
            console.warn('Error searching for existing meal food:', mealFoodSearchError);
          }

          if (existingMealFood) {
            // Update existing meal food quantity
            const newQuantity = match.csvFood.quantity / 100; // Convert grams to quantity multiplier
            const { error: updateError } = await supabase
              .from('meal_foods')
              .update({ quantity: newQuantity })
              .eq('id', existingMealFood.id);

            if (updateError) throw updateError;
          } else {
            // Add new food to meal
            const { error: mealFoodError } = await supabase
              .from('meal_foods')
              .insert([{
                meal_id: mealId,
                food_id: foodId,
                quantity: match.csvFood.quantity / 100 // Convert grams to quantity multiplier
              }]);

            if (mealFoodError) throw mealFoodError;
          }
        }
      }

      onImportComplete();
      onClose();
    } catch (err) {
      console.error('Error importing CSV data:', err);
      setError('Erro ao importar dados. Tente novamente.');
    } finally {
      setLoading(false);
    }
  };

  const getMatchIcon = (matchType: 'exact' | 'partial' | 'none') => {
    switch (matchType) {
      case 'exact':
        return <Check className="text-green-400" size={16} />;
      case 'partial':
        return <AlertTriangle className="text-yellow-400" size={16} />;
      case 'none':
        return <X className="text-red-400" size={16} />;
    }
  };

  const getMatchText = (matchType: 'exact' | 'partial' | 'none') => {
    switch (matchType) {
      case 'exact':
        return 'Correspondência exata';
      case 'partial':
        return 'Correspondência parcial';
      case 'none':
        return 'Não encontrado - será criado';
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
      <div className="bg-[rgb(28,28,28)] p-6 rounded-lg shadow-xl border border-[#f8c045]/10 w-full max-w-4xl max-h-[90vh] overflow-y-auto">
        <div className="flex justify-between items-center mb-6">
          <div className="flex items-center">
            <Upload className="text-[#f8c045] mr-2" />
            <h2 className="text-xl font-semibold text-[#f8c045]">Importação Rápida de Alimentos</h2>
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

        {!showPreview ? (
          <div className="space-y-6">
            <div className="bg-[rgb(23,23,23)] p-6 rounded-lg border border-[#f8c045]/20">
              <div className="flex items-center mb-4">
                <FileText className="text-[#f8c045] mr-2" size={20} />
                <h3 className="text-[#f8c045] font-semibold">Selecionar Arquivo CSV</h3>
              </div>
              
              <div className="space-y-4">
                <div>
                  <label className="block text-gray-300 text-sm font-bold mb-2">
                    Arquivo CSV do Plano Alimentar
                  </label>
                  <input
                    type="file"
                    accept=".csv,text/csv"
                    onChange={handleFileSelect}
                    className="w-full bg-[rgb(28,28,28)] text-gray-300 p-3 rounded-lg border border-[#f8c045]/20 focus:outline-none focus:ring-2 focus:ring-[#f8c045]/50 file:mr-4 file:py-2 file:px-4 file:rounded-lg file:border-0 file:text-sm file:font-semibold file:bg-[#f8c045] file:text-[rgb(23,23,23)] hover:file:bg-[#e6b041]"
                  />
                </div>

                {selectedFile && (
                  <div className="bg-[rgb(28,28,28)] p-4 rounded-lg border border-[#f8c045]/20">
                    <div className="flex items-center justify-between">
                      <div>
                        <p className="text-[#f8c045] font-medium">{selectedFile.name}</p>
                        <p className="text-gray-400 text-sm">
                          {(selectedFile.size / 1024).toFixed(1)} KB
                        </p>
                      </div>
                      <button
                        onClick={() => setSelectedFile(null)}
                        className="text-gray-400 hover:text-red-400 transition"
                      >
                        <X size={20} />
                      </button>
                    </div>
                  </div>
                )}
              </div>

              <div className="mt-6 bg-[rgb(28,28,28)] p-4 rounded-lg border border-[#f8c045]/20">
                <h4 className="text-[#f8c045] font-semibold mb-2">Formato Esperado do CSV</h4>
                <p className="text-gray-400 text-sm mb-3">
                  O arquivo deve conter as seguintes colunas (na ordem):
                </p>
                <div className="bg-[rgb(23,23,23)] p-3 rounded-lg font-mono text-sm text-gray-300">
                  refeicao,name,quantidade_g,calories,protein,carbs,fats
                </div>
                <p className="text-gray-400 text-sm mt-2">
                  • A primeira linha deve conter os cabeçalhos<br/>
                  • Linhas com "TOTAL" ou "Totais" serão ignoradas<br/>
                  • Quantidade deve estar em gramas
                </p>
              </div>
            </div>

            <div className="flex space-x-4">
              <button
                onClick={onClose}
                className="flex-1 bg-[rgb(23,23,23)] text-[#f8c045] py-3 px-4 rounded-lg hover:bg-[rgb(33,33,33)] transition font-semibold border border-[#f8c045]"
              >
                {t('cancel')}
              </button>
              <button
                onClick={handlePreview}
                disabled={!selectedFile || matchingFoods}
                className="flex-1 bg-[#f8c045] text-[rgb(23,23,23)] py-3 px-4 rounded-lg hover:bg-[#e6b041] transition font-semibold disabled:opacity-50 flex items-center justify-center"
              >
                {matchingFoods ? (
                  <>
                    <div className="animate-spin rounded-full h-5 w-5 border-t-2 border-b-2 border-[rgb(23,23,23)] mr-2"></div>
                    Analisando...
                  </>
                ) : (
                  <>
                    <Eye size={20} className="mr-2" />
                    Analisar Arquivo
                  </>
                )}
              </button>
            </div>
          </div>
        ) : (
          <div className="space-y-6">
            <div className="flex items-center justify-between">
              <h3 className="text-lg font-semibold text-[#f8c045]">
                Confirmação de Alimentos ({foodMatches.filter(m => m.confirmed).length}/{foodMatches.length} confirmados)
              </h3>
              <button
                onClick={() => setShowPreview(false)}
                className="text-[#f8c045] hover:text-[#e6b041] transition"
              >
                Voltar
              </button>
            </div>

            <div className="bg-[rgb(23,23,23)] p-4 rounded-lg border border-[#f8c045]/20 max-h-96 overflow-y-auto">
              <div className="space-y-4">
                {Object.entries(
                  foodMatches.reduce((acc, match) => {
                    const mealName = match.csvFood.mealName;
                    if (!acc[mealName]) {
                      acc[mealName] = [];
                    }
                    acc[mealName].push(match);
                    return acc;
                  }, {} as Record<string, FoodMatch[]>)
                ).map(([mealName, matches]) => (
                  <div key={mealName} className="border-b border-[#f8c045]/10 pb-4 last:border-b-0">
                    <h4 className="text-[#f8c045] font-semibold mb-3">{mealName}</h4>
                    <div className="space-y-3">
                      {matches.map((match, index) => (
                        <div key={index} className="bg-[rgb(28,28,28)] p-4 rounded-lg border border-[#f8c045]/10">
                          <div className="flex items-start justify-between">
                            <div className="flex-1">
                              <div className="flex items-center mb-2">
                                <input
                                  type="checkbox"
                                  checked={match.confirmed}
                                  onChange={() => handleFoodMatchToggle(foodMatches.indexOf(match))}
                                  className="mr-3 h-4 w-4 text-[#f8c045] rounded border-[#f8c045]/20 bg-[rgb(23,23,23)]"
                                />
                                <div>
                                  <p className="text-gray-300 font-medium">{match.csvFood.foodName}</p>
                                  <p className="text-gray-500 text-sm">{match.csvFood.quantity}g</p>
                                </div>
                              </div>
                              
                              <div className="ml-7">
                                <div className="flex items-center mb-2">
                                  {getMatchIcon(match.matchType)}
                                  <span className="text-gray-400 text-sm ml-2">
                                    {getMatchText(match.matchType)}
                                  </span>
                                </div>
                                
                                {match.dbFood ? (
                                  <div className="bg-[rgb(23,23,23)] p-3 rounded border border-[#f8c045]/10">
                                    <p className="text-[#f8c045] font-medium">{getFoodName(match.dbFood)}</p>
                                    <div className="text-gray-400 text-sm mt-1">
                                      {match.dbFood.calories} kcal/100g | 
                                      P: {match.dbFood.protein}g | 
                                      C: {match.dbFood.carbs}g | 
                                      G: {match.dbFood.fats}g
                                    </div>
                                  </div>
                                ) : (
                                  <div className="bg-[rgb(23,23,23)] p-3 rounded border border-red-500/20">
                                    <p className="text-red-400 font-medium">Será criado novo alimento</p>
                                    <div className="text-gray-400 text-sm mt-1">
                                      {match.csvFood.calories} kcal/100g | 
                                      P: {match.csvFood.protein}g | 
                                      C: {match.csvFood.carbs}g | 
                                      G: {match.csvFood.fats}g
                                    </div>
                                  </div>
                                )}

                                {match.matchType === 'partial' && (
                                  <div className="mt-2">
                                    <label className="block text-gray-400 text-sm mb-1">
                                      Ou selecione outro alimento:
                                    </label>
                                    <select
                                      onChange={(e) => {
                                        if (e.target.value) {
                                          handleFoodMatchToggle(foodMatches.indexOf(match), e.target.value);
                                        }
                                      }}
                                      className="w-full bg-[rgb(23,23,23)] text-gray-300 p-2 rounded border border-[#f8c045]/20 text-sm"
                                    >
                                      <option value="">Selecionar alimento...</option>
                                      {dbFoods
                                        .filter(food => 
                                          getFoodName(food).toLowerCase().includes(match.csvFood.foodName.toLowerCase()) ||
                                          match.csvFood.foodName.toLowerCase().includes(getFoodName(food).toLowerCase())
                                        )
                                        .map(food => (
                                          <option key={food.id} value={food.id}>
                                            {getFoodName(food)}
                                          </option>
                                        ))}
                                    </select>
                                  </div>
                                )}
                              </div>
                            </div>
                            
                            <div className="text-right text-sm ml-4">
                              <div className="text-[#f8c045] font-semibold">
                                {Math.round(match.csvFood.calories * (match.csvFood.quantity / 100))} kcal
                              </div>
                              <div className="text-gray-400">
                                P: {(match.csvFood.protein * (match.csvFood.quantity / 100)).toFixed(1)}g<br/>
                                C: {(match.csvFood.carbs * (match.csvFood.quantity / 100)).toFixed(1)}g<br/>
                                G: {(match.csvFood.fats * (match.csvFood.quantity / 100)).toFixed(1)}g
                              </div>
                            </div>
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                ))}
              </div>
            </div>

            <div className="bg-[rgb(23,23,23)] p-4 rounded-lg border border-[#f8c045]/20">
              <h4 className="text-[#f8c045] font-semibold mb-2">Totais dos Alimentos Confirmados</h4>
              <div className="grid grid-cols-4 gap-4 text-center">
                <div>
                  <div className="text-2xl font-bold text-[#f8c045]">
                    {Math.round(foodMatches
                      .filter(m => m.confirmed)
                      .reduce((acc, match) => acc + (match.csvFood.calories * (match.csvFood.quantity / 100)), 0)
                    )}
                  </div>
                  <div className="text-gray-400 text-sm">kcal</div>
                </div>
                <div>
                  <div className="text-2xl font-bold text-[#f8c045]">
                    {foodMatches
                      .filter(m => m.confirmed)
                      .reduce((acc, match) => acc + (match.csvFood.protein * (match.csvFood.quantity / 100)), 0)
                      .toFixed(1)}g
                  </div>
                  <div className="text-gray-400 text-sm">Proteínas</div>
                </div>
                <div>
                  <div className="text-2xl font-bold text-[#f8c045]">
                    {foodMatches
                      .filter(m => m.confirmed)
                      .reduce((acc, match) => acc + (match.csvFood.carbs * (match.csvFood.quantity / 100)), 0)
                      .toFixed(1)}g
                  </div>
                  <div className="text-gray-400 text-sm">Carboidratos</div>
                </div>
                <div>
                  <div className="text-2xl font-bold text-[#f8c045]">
                    {foodMatches
                      .filter(m => m.confirmed)
                      .reduce((acc, match) => acc + (match.csvFood.fats * (match.csvFood.quantity / 100)), 0)
                      .toFixed(1)}g
                  </div>
                  <div className="text-gray-400 text-sm">Gorduras</div>
                </div>
              </div>
            </div>

            <div className="flex space-x-4">
              <button
                onClick={() => setShowPreview(false)}
                className="flex-1 bg-[rgb(23,23,23)] text-[#f8c045] py-3 px-4 rounded-lg hover:bg-[rgb(33,33,33)] transition font-semibold border border-[#f8c045]"
              >
                Voltar
              </button>
              <button
                onClick={handleImport}
                disabled={loading || foodMatches.filter(m => m.confirmed).length === 0}
                className="flex-1 bg-[#f8c045] text-[rgb(23,23,23)] py-3 px-4 rounded-lg hover:bg-[#e6b041] transition font-semibold disabled:opacity-50 flex items-center justify-center"
              >
                {loading ? (
                  <>
                    <div className="animate-spin rounded-full h-5 w-5 border-t-2 border-b-2 border-[rgb(23,23,23)] mr-2"></div>
                    Importando...
                  </>
                ) : (
                  `Importar ${foodMatches.filter(m => m.confirmed).length} Alimentos`
                )}
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}