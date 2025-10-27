export type ExpenseCategory =
  | 'casa'
  | 'alimentacao'
  | 'transporte'
  | 'saude'
  | 'educacao'
  | 'lazer'
  | 'compras'
  | 'servicos'
  | 'outros';

export interface Category {
  id: ExpenseCategory;
  nome: string;
  icone: string;
  cor: string;
}

export const CATEGORIES: Category[] = [
  {
    id: 'casa',
    nome: 'Casa',
    icone: 'home',
    cor: '#4CAF50',
  },
  {
    id: 'alimentacao',
    nome: 'Alimentação',
    icone: 'food',
    cor: '#FF9800',
  },
  {
    id: 'transporte',
    nome: 'Transporte',
    icone: 'car',
    cor: '#2196F3',
  },
  {
    id: 'saude',
    nome: 'Saúde',
    icone: 'medical-bag',
    cor: '#F44336',
  },
  {
    id: 'educacao',
    nome: 'Educação',
    icone: 'school',
    cor: '#9C27B0',
  },
  {
    id: 'lazer',
    nome: 'Lazer',
    icone: 'gamepad-variant',
    cor: '#E91E63',
  },
  {
    id: 'compras',
    nome: 'Compras',
    icone: 'shopping',
    cor: '#00BCD4',
  },
  {
    id: 'servicos',
    nome: 'Serviços',
    icone: 'hammer-wrench',
    cor: '#607D8B',
  },
  {
    id: 'outros',
    nome: 'Outros',
    icone: 'dots-horizontal',
    cor: '#9E9E9E',
  },
];

export const getCategoryById = (id: ExpenseCategory): Category => {
  return CATEGORIES.find((cat) => cat.id === id) || CATEGORIES[CATEGORIES.length - 1];
};

export const getCategoryColor = (id?: ExpenseCategory): string => {
  if (!id) return '#9E9E9E';
  return getCategoryById(id).cor;
};

export const getCategoryIcon = (id?: ExpenseCategory): string => {
  if (!id) return 'dots-horizontal';
  return getCategoryById(id).icone;
};

export const getCategoryName = (id?: ExpenseCategory): string => {
  if (!id) return 'Outros';
  return getCategoryById(id).nome;
};
