import { Product } from '../models/product.model';

/** Formatea un precio numérico como moneda (p. ej. "$2.50"). */
export function formatPrice(value: number): string {
  return (
    '$' +
    value.toLocaleString('en-US', {
      minimumFractionDigits: 2,
      maximumFractionDigits: 2
    })
  );
}

/** Emoji de producto según su nombre (placeholder visual mientras no haya imágenes). */
export function productEmoji(product: Product): string {
  const n = product.name.toLowerCase();
  if (/(manzana|pera)/.test(n)) return '🍎';
  if (/(platano|plátano|banana)/.test(n)) return '🍌';
  if (/(palta|aguacate)/.test(n)) return '🥑';
  if (/(fresa)/.test(n)) return '🍓';
  if (/(limon|limón|naranja)/.test(n)) return '🍋';
  if (/(uvas?|uva)/.test(n)) return '🍇';
  if (/(tomate)/.test(n)) return '🍅';
  if (/(lechuga|hoja|verdura|hortaliza|espinaca)/.test(n)) return '🥬';
  if (/(zanahoria)/.test(n)) return '🥕';
  if (/(papa)/.test(n)) return '🥔';
  if (/(cebolla|ajo)/.test(n)) return '🧅';
  if (/(leche)/.test(n)) return '🥛';
  if (/(yogurt|yogur)/.test(n)) return '🍦';
  if (/(queso)/.test(n)) return '🧀';
  if (/(huevo)/.test(n)) return '🥚';
  if (/(pan)/.test(n)) return '🍞';
  if (/(galleta|oreo)/.test(n)) return '🍪';
  if (/(chocolate)/.test(n)) return '🍫';
  if (/(gomit|caramelo|dulce)/.test(n)) return '🍬';
  if (/(papas fritas|chips|snack)/.test(n)) return '🍟';
  if (/(man[ií]|nuez|fruto seco)/.test(n)) return '🥜';
  if (/(jugo)/.test(n)) return '🧃';
  if (/(agua)/.test(n)) return '💧';
  if (/(gaseosa|refresco|cola)/.test(n)) return '🥤';
  if (/(arroz|pasta|fideo|granos)/.test(n)) return '🍚';
  if (/(lenteja|legumbre|poroto)/.test(n)) return '🫘';
  if (/(at[uú]n|conserva|enlatado)/.test(n)) return '🐟';
  return '🛒';
}

/** Emoji para una categoría según su nombre. */
export function categoryEmoji(name: string): string {
  const n = name.toLowerCase();
  if (/(fruta)/.test(n)) return '🍎';
  if (/(verdura|hortaliza)/.test(n)) return '🥬';
  if (/(l[áa]cteo|leche)/.test(n)) return '🥛';
  if (/(queso)/.test(n)) return '🧀';
  if (/(huevo)/.test(n)) return '🥚';
  if (/(panader|reposter)/.test(n)) return '🍞';
  if (/(snack|confiter)/.test(n)) return '🍿';
  if (/(dulce)/.test(n)) return '🍬';
  if (/(salado)/.test(n)) return '🥨';
  if (/(bebida|jugo|agua)/.test(n)) return '🥤';
  if (/(abarrote|despensa)/.test(n)) return '🛒';
  if (/(carnes?|pescado|marisco)/.test(n)) return '🥩';
  return '🏷️';
}
