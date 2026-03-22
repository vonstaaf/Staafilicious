// wholesalerMaps.js
export const WHOLESALER_MAPS = {
  rexel: {
    collection: 'price_list_rexel',
    delimiter: ';',
    columns: {
      articleNumber: 0,   // Kolumn A
      name: 1,            // Kolumn B
      unit: 2,            // Kolumn C
      discountGroup: 3,   // Kolumn D
      price: 4            // Kolumn E (Nettopris)
    }
  },
  ahlsell: {
    collection: 'price_list_ahlsell',
    delimiter: ';',
    columns: {
      articleNumber: 0,
      name: 1,
      unit: 2,
      discountGroup: 3,
      price: 4
    }
  }
};