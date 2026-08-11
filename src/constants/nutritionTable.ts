export interface NutritionFood {
  key: string;
  aliases: string[];
  per100g: {
    calories: number;
    protein: number;
    carbs: number;
    fat: number;
  };
  defaultPortionGrams: number;
}

export const NUTRITION_TABLE: NutritionFood[] = [
  { key: 'arroz cozido', aliases: ['arroz', 'arroz branco', 'arroz cozido'], per100g: { calories: 128, protein: 2.5, carbs: 28.0, fat: 0.2 }, defaultPortionGrams: 150 },
  { key: 'feijao cozido', aliases: ['feijao', 'feijão', 'feijao cozido', 'feijão cozido'], per100g: { calories: 76, protein: 4.8, carbs: 13.6, fat: 0.5 }, defaultPortionGrams: 100 },
  { key: 'frango peito grelhado', aliases: ['frango', 'peito de frango', 'frango grelhado'], per100g: { calories: 163, protein: 31.0, carbs: 0, fat: 3.6 }, defaultPortionGrams: 140 },
  { key: 'ovo inteiro', aliases: ['ovo', 'ovo inteiro'], per100g: { calories: 143, protein: 13.0, carbs: 0.7, fat: 9.5 }, defaultPortionGrams: 50 },
  { key: 'banana', aliases: ['banana', 'banana prata', 'banana nanica'], per100g: { calories: 89, protein: 1.1, carbs: 22.8, fat: 0.3 }, defaultPortionGrams: 90 },
  { key: 'batata doce cozida', aliases: ['batata doce', 'batata-doce', 'batata doce cozida'], per100g: { calories: 77, protein: 0.6, carbs: 18.4, fat: 0.1 }, defaultPortionGrams: 130 },
  { key: 'aveia', aliases: ['aveia', 'aveia em flocos'], per100g: { calories: 394, protein: 13.9, carbs: 66.6, fat: 8.5 }, defaultPortionGrams: 40 },
  { key: 'leite integral', aliases: ['leite', 'leite integral'], per100g: { calories: 61, protein: 3.2, carbs: 4.7, fat: 3.3 }, defaultPortionGrams: 200 },
  { key: 'iogurte natural', aliases: ['iogurte', 'iogurte natural'], per100g: { calories: 63, protein: 5.3, carbs: 4.7, fat: 3.0 }, defaultPortionGrams: 170 },
  { key: 'pao frances', aliases: ['pao frances', 'pão francês', 'pao', 'pão'], per100g: { calories: 300, protein: 8.0, carbs: 58.0, fat: 3.1 }, defaultPortionGrams: 50 },
  { key: 'macarrao cozido', aliases: ['macarrao', 'macarrão', 'massa', 'macarrao cozido'], per100g: { calories: 158, protein: 5.8, carbs: 30.9, fat: 0.9 }, defaultPortionGrams: 140 },
  { key: 'carne bovina magra', aliases: ['carne', 'carne bovina', 'patinho', 'coxao mole'], per100g: { calories: 219, protein: 26.0, carbs: 0, fat: 12.0 }, defaultPortionGrams: 130 },
  { key: 'azeite', aliases: ['azeite', 'azeite de oliva'], per100g: { calories: 884, protein: 0, carbs: 0, fat: 100.0 }, defaultPortionGrams: 10 },
  { key: 'abacate', aliases: ['abacate'], per100g: { calories: 96, protein: 1.2, carbs: 6.0, fat: 8.4 }, defaultPortionGrams: 100 },
  { key: 'whey protein', aliases: ['whey', 'whey protein'], per100g: { calories: 400, protein: 80.0, carbs: 10.0, fat: 7.0 }, defaultPortionGrams: 30 },
  { key: 'amendoim', aliases: ['amendoim'], per100g: { calories: 567, protein: 25.8, carbs: 16.1, fat: 49.2 }, defaultPortionGrams: 30 },
];
