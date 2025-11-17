import { useLanguageStore } from '../store/languageStore';

interface Translations {
  [key: string]: {
    [key: string]: string;
  };
}

export const translations: Translations = {
  en: {
    // Auth
    login: 'Login',
    signIn: 'Sign In',
    signOut: 'Sign Out',
    signingIn: 'Signing In...',
    createAccount: 'Create Account',
    creatingAccount: 'Creating Account...',
    name: 'Name',
    email: 'Email',
    password: 'Password',
    noAccount: "Don't have an account?",
    haveAccount: 'Already have an account?',
    signUp: 'Sign Up',
    loginError: 'Login failed. Please check your credentials.',
    registrationError: 'Registration failed. Please check your information.',
    userAlreadyExists: 'This email is already registered. Please sign in instead.',

    // Header
    greeting: 'Hello',
    dietPlan: 'Diet Plan',
    createdOn: 'Created on',
    
    // Macros
    calories: 'Calories',
    target: 'TARGET',
    current: 'CURRENT',
    protein: 'Protein',
    carbs: 'Carbs',
    fats: 'Fats',
    
    // Meals
    meals: 'Meals',
    meal: 'Meal',
    addFood: 'Add Food',
    food: 'Food',
    portion: 'Portion',
    proteins: 'Proteins',
    carbohydrates: 'Carbohydrates',
    actions: 'Actions',
    total: 'Total',
    increasePortion: 'Increase portion',
    decreasePortion: 'Decrease portion',
    
    // Profile
    profile: 'Profile',
    editProfile: 'Edit Profile',
    physicalData: 'Physical Data',
    weightKg: 'Weight (kg)',
    heightCm: 'Height (cm)',
    age: 'Age',
    gender: 'Gender',
    male: 'Male',
    female: 'Female',
    selectGender: 'Select gender',
    activityLevel: 'Activity Level',
    selectActivityLevel: 'Select activity level',
    leanMass: 'Lean Mass (kg)',
    fatMass: 'Fat Mass (kg)',
    changePassword: 'Change Password',
    currentPassword: 'Current Password',
    newPassword: 'New Password',
    confirmNewPassword: 'Confirm New Password',
    passwordsDoNotMatch: 'New passwords do not match',
    profileUpdated: 'Profile updated successfully!',
    errorUpdatingProfile: 'Error updating profile',
    
    // Progress
    progress: 'Progress',
    progressTracking: 'Progress Tracking',
    weightTracking: 'Weight Tracking',
    currentWeight: 'Current Weight',
    history: 'History',
    progressPhotos: 'Progress Photos',
    front: 'Front',
    side: 'Side',
    back: 'Back',
    addPhoto: 'Add photo',
    photoUploaded: 'Photo uploaded successfully!',
    errorUploadingPhoto: 'Error uploading photo. Please try again.',
    errorDeletingPhoto: 'Error deleting photo',
    photoDeleted: 'Photo deleted successfully',
    weightRecordDeleted: 'Weight record deleted successfully',
    errorDeletingWeightRecord: 'Error deleting weight record',
    selectDate: 'Select Date',
    previousPhoto: 'Previous Photo',
    currentPhoto: 'Current Photo',
    noPhotoAvailable: 'No photo available',
    delete: 'Delete',
    
    // Plan
    planExpiry: 'Plan Expiration',
    noExpiration: 'No expiration',
    waterIntake: 'Daily Water Intake',
    generateNewDiet: 'Generate New Diet',
    errorGeneratingDiet: 'Error generating new diet plan',
    
    // Actions
    remove: 'Remove',
    loading: 'Loading...',
    offline: 'You are offline. Some features may be unavailable.',
    cancel: 'Cancel',
    add: 'Add',
    adding: 'Adding...',
    save: 'Save',
    saving: 'Saving...',
    deleting: 'Deleting...',
    confirmDelete: 'Yes, delete',
    deleteDiet: 'Delete Diet',
    confirmDeleteDiet: 'Delete Diet Plan?',
    deleteWarning: 'This action cannot be undone. All meals and food records will be permanently deleted.',
    errorDeletingDiet: 'Error deleting diet plan',

    // Messages
    noDietFound: 'No Diet Plan Found',
    contactAdmin: 'You don\'t have a diet plan yet. Please contact Fabiew.',
    errorAddingFood: 'Error adding food. Please try again.',
    selectFoodAndQuantity: 'Please select a food and specify the quantity',
    foodAlreadyExists: 'This food item already exists in this meal',
    currentDiet: 'Current Diet',
    user: 'User',

    // Food Modal
    category: 'Category',
    allCategories: 'All categories',
    selectFood: 'Select a food',
    quantityInGrams: 'Quantity (in grams)',
    nutritionalInfo: 'Nutritional Information',
    remainingMacros: 'Remaining Macros',
    
    // Carb Cycling
    carbCycling: 'Carb Cycling',
    highCarbDay: 'High Carb Day',
    moderateCarbDay: 'Moderate Carb Day',
    lowCarbDay: 'Low Carb Day',
    carbsPercentage: 'Carbs: {0}% of daily calories',
    proteinPercentage: 'Protein: {0}%',
    fatsPercentage: 'Fats: {0}%',
    selectCarbDay: 'Select Carb Day Type',
    carbDayUpdated: 'Carb day type updated successfully',
    errorUpdatingCarbDay: 'Error updating carb day type',
    difference: 'Difference',

    profilePhoto: 'Profile Photo',
    updatePhoto: 'Update Photo',
    uploading: 'Uploading...',
    photoUpdated: 'Profile photo updated successfully!',
    errorUploadingPhoto: 'Error uploading photo. Please try again.'
  },
  pt: {
    // Auth
    login: 'Login',
    signIn: 'Entrar',
    signOut: 'Sair',
    signingIn: 'Entrando...',
    createAccount: 'Criar Conta',
    creatingAccount: 'Criando Conta...',
    name: 'Nome',
    email: 'Email',
    password: 'Senha',
    noAccount: 'Não tem uma conta?',
    haveAccount: 'Já tem uma conta?',
    signUp: 'Registre-se',
    loginError: 'Erro ao fazer login. Verifique suas credenciais.',
    registrationError: 'Erro ao criar conta. Verifique suas informações.',
    userAlreadyExists: 'Este email já está registrado. Por favor, faça login.',

    // Header
    greeting: 'Olá',
    dietPlan: 'Plano Alimentar',
    createdOn: 'Criado em',
    
    // Macros
    calories: 'Calorias',
    target: 'META',
    current: 'ATUAL',
    protein: 'Proteína',
    carbs: 'Carboidratos',
    fats: 'Gorduras',
    
    // Meals
    meals: 'Refeições',
    meal: 'Refeição',
    addFood: 'Adicionar Alimento',
    food: 'Alimento',
    portion: 'Porção',
    proteins: 'Proteínas',
    carbohydrates: 'Carboidratos',
    actions: 'Ações',
    total: 'Total',
    increasePortion: 'Aumentar porção',
    decreasePortion: 'Diminuir porção',
    
    // Profile
    profile: 'Perfil',
    editProfile: 'Editar Perfil',
    physicalData: 'Dados Físicos',
    weightKg: 'Peso (kg)',
    heightCm: 'Altura (cm)',
    age: 'Idade',
    gender: 'Gênero',
    male: 'Masculino',
    female: 'Feminino',
    selectGender: 'Selecione o gênero',
    activityLevel: 'Nível de Atividade',
    selectActivityLevel: 'Selecione o nível',
    leanMass: 'Massa Magra (kg)',
    fatMass: 'Massa Gorda (kg)',
    changePassword: 'Alterar Senha',
    currentPassword: 'Senha Atual',
    newPassword: 'Nova Senha',
    confirmNewPassword: 'Confirmar Nova Senha',
    passwordsDoNotMatch: 'As novas senhas não coincidem',
    profileUpdated: 'Perfil atualizado com sucesso!',
    errorUpdatingProfile: 'Erro ao atualizar perfil',
    
    // Progress
    progress: 'Progresso',
    progressTracking: 'Acompanhamento de Progresso',
    weightTracking: 'Controle de Peso',
    currentWeight: 'Peso Atual',
    history: 'Histórico',
    progressPhotos: 'Fotos de Progresso',
    front: 'Frente',
    side: 'Lado',
    back: 'Costas',
    addPhoto: 'Adicionar foto',
    photoUploaded: 'Foto enviada com sucesso!',
    errorUploadingPhoto: 'Erro ao enviar foto. Por favor, tente novamente.',
    errorDeletingPhoto: 'Erro ao remover foto',
    photoDeleted: 'Foto removida com sucesso',
    weightRecordDeleted: 'Registro de peso removido com sucesso',
    errorDeletingWeightRecord: 'Erro ao remover registro de peso',
    selectDate: 'Selecionar Data',
    previousPhoto: 'Foto Anterior',
    currentPhoto: 'Foto Atual',
    noPhotoAvailable: 'Nenhuma foto disponível',
    delete: 'Excluir',
    
    // Plan
    planExpiry: 'Vencimento do Plano',
    noExpiration: 'Sem vencimento',
    waterIntake: 'Consumo Diário de Água',
    generateNewDiet: 'Gerar Nova Dieta',
    errorGeneratingDiet: 'Erro ao gerar novo plano alimentar',
    
    // Actions
    remove: 'Remover',
    loading: 'Carregando...',
    offline: 'Você está offline. Algumas funcionalidades podem estar indisponíveis.',
    cancel: 'Cancelar',
    add: 'Adicionar',
    adding: 'Adicionando...',
    save: 'Salvar',
    saving: 'Salvando...',
    deleting: 'Excluindo...',
    confirmDelete: 'Sim, excluir',
    deleteDiet: 'Excluir Dieta',
    confirmDeleteDiet: 'Excluir Plano Alimentar?',
    deleteWarning: 'Esta ação não pode ser desfeita. Todas as refeições e alimentos serão permanentemente excluídos.',
    errorDeletingDiet: 'Erro ao excluir plano alimentar',

    // Messages
    noDietFound: 'Nenhuma Dieta Encontrada',
    contactAdmin: 'Você ainda não possui um plano alimentar. Entre em contato com o Fabiew.',
    errorAddingFood: 'Erro ao adicionar alimento. Tente novamente.',
    selectFoodAndQuantity: 'Por favor, selecione um alimento e especifique a quantidade',
    foodAlreadyExists: 'Este alimento já existe nesta refeição',
    currentDiet: 'Dieta Atual',
    user: 'Usuário',

    // Food Modal
    category: 'Categoria',
    allCategories: 'Todas as categorias',
    selectFood: 'Selecione um alimento',
    quantityInGrams: 'Quantidade (em gramas)',
    nutritionalInfo: 'Informação Nutricional',
    remainingMacros: 'Macros Restantes',
    
    // Carb Cycling
    carbCycling: 'Carb Cycling',
    highCarbDay: 'Dia Alto em Carboidratos',
    moderateCarbDay: 'Dia Moderado em Carboidratos',
    lowCarbDay: 'Dia Baixo em Carboidratos',
    carbsPercentage: 'Carboidratos: {0}% das calorias diárias',
    proteinPercentage: 'Proteínas: {0}%',
    fatsPercentage: 'Gorduras: {0}%',
    selectCarbDay: 'Selecione o Tipo de Dia',
    carbDayUpdated: 'Tipo de dia atualizado com sucesso',
    errorUpdatingCarbDay: 'Erro ao atualizar tipo de dia',
    difference: 'Diferença',

    profilePhoto: 'Foto de Perfil',
    updatePhoto: 'Atualizar Foto',
    uploading: 'Enviando...',
    photoUpdated: 'Foto de perfil atualizada com sucesso!',
    errorUploadingPhoto: 'Erro ao enviar foto. Tente novamente.'
  }
};

export function useTranslation() {
  const language = useLanguageStore(state => state.language);
  
  return {
    t: (key: string, params?: any[]) => {
      let text = translations[language]?.[key] || translations['en'][key] || key;
      
      if (params) {
        params.forEach((param, index) => {
          text = text.replace(`{${index}}`, param);
        });
      }
      
      return text;
    },
    language
  };
}