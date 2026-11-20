import type { SampleFridgePreset } from '../types/recipe';
import indianFridgeImg from '../assets/images/sample_fridge_indian_veg_1794728699690.jpg';
import everydayFridgeImg from '../assets/images/sample_fridge_everyday_produce_1794728698953.jpg';

export const QUICK_ADD_INGREDIENTS: string[] = [
  'Onion',
  'Tomato',
  'Spinach (Palak)',
  'Paneer',
  'Potato (Aloo)',
  'Cauliflower (Gobi)',
  'Green Chili',
  'Ginger',
  'Garlic',
  'Cilantro',
  'Plain Yogurt (Dahi)',
  'Chickpeas',
  'Bell Pepper',
  'Eggplant (Baingan)',
  'Carrots',
  'Green Peas',
];

export const SAMPLE_FRIDGE_PRESETS: SampleFridgePreset[] = [
  {
    id: 'indian-fridge',
    label: 'Indian Kitchen Fridge',
    subtitle: 'Spinach, paneer, tomatoes, cauliflower, ginger, chilies, yogurt',
    imagePath: indianFridgeImg,
    suggestedIngredients: [
      'Spinach',
      'Paneer',
      'Tomatoes',
      'Cauliflower',
      'Green Chilies',
      'Cilantro',
      'Ginger',
      'Garlic',
      'Curry Leaves',
      'Lemons',
      'Plain Yogurt',
    ],
  },
  {
    id: 'everyday-produce',
    label: 'Colorful Produce Fridge',
    subtitle: 'Bell peppers, eggplant, baby potatoes, carrots, green beans, chickpeas',
    imagePath: everydayFridgeImg,
    suggestedIngredients: [
      'Bell Peppers',
      'Eggplant',
      'Baby Potatoes',
      'Carrots',
      'Green Beans',
      'Zucchini',
      'Chickpeas',
      'Fresh Mint',
    ],
  },
];
