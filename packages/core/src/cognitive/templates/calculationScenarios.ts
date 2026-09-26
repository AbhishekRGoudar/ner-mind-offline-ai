import { TaskContext } from '../../types/observation.js';

export interface MarketGood {
  id: string;
  name: string;
  unit: string;
  basePrice: number; // in Rupees
  context: TaskContext;
}

export const MARKET_GOODS: MarketGood[] = [
  { id: 'tea_leaves', name: 'Fresh Assam Tea Leaves (250g)', unit: 'packet', basePrice: 30, context: 'market' },
  { id: 'bamboo_shoot_jar', name: 'Preserved Bamboo Shoot Jar', unit: 'jar', basePrice: 40, context: 'market' },
  { id: 'khasi_oranges', name: 'Khasi Sweet Mandarin Oranges', unit: 'kg', basePrice: 50, context: 'market' },
  { id: 'mustard_oil', name: 'Cold-Pressed Mustard Oil Bottle', unit: 'bottle', basePrice: 70, context: 'kitchen' },
  { id: 'ginger_roots', name: 'Fresh River Ginger Roots (500g)', unit: 'heap', basePrice: 25, context: 'market' },
  { id: 'bhim_bananas', name: 'Bhim Banana Bunch', unit: 'dozen', basePrice: 45, context: 'market' },
  { id: 'wild_forest_honey', name: 'Wild Forest Honey Jar (250g)', unit: 'jar', basePrice: 90, context: 'market' },
  { id: 'king_chillies', name: 'Bhut Jolokia Chillies (Fresh)', unit: 'packet', basePrice: 20, context: 'market' },
  { id: 'rice_powder', name: 'Bora Saul Pitha Rice Flour', unit: 'kg', basePrice: 35, context: 'kitchen' },
  { id: 'joha_scented_rice', name: 'Joha Scented Rice (1kg)', unit: 'bag', basePrice: 65, context: 'market' },
  { id: 'handmade_bamboo_fan', name: 'Woven Cane Hand Fan', unit: 'piece', basePrice: 40, context: 'craft' },
  { id: 'traditional_gamusa', name: 'Red Patterned Cotton Gamusa', unit: 'piece', basePrice: 80, context: 'craft' },
  { id: 'pure_turmeric', name: 'Organic Turmeric Powder (200g)', unit: 'pack', basePrice: 30, context: 'kitchen' },
  { id: 'earthen_curd_pot', name: 'Cream Buffalo Milk Curd Pot', unit: 'pot', basePrice: 55, context: 'kitchen' },
  { id: 'roasted_sesame', name: 'Black Sesame Seeds for Pitha', unit: 'cup', basePrice: 20, context: 'kitchen' },
];

export interface CalculationProblem {
  difficulty: 1 | 2 | 3 | 4 | 5;
  description: string;
  items: { name: string; quantity: number; unitPrice: number; totalPrice: number }[];
  totalBill: number;
  paidAmount: number;
  correctChange: number;
  options: number[]; // Guaranteed 4 distinct numbers including correctChange
  reasoningSteps: number;
  workingMemoryDemand: number;
}
