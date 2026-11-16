export function convertToRoman(num: number): string {
    const roman: [number, string][] = [
      [1000, 'M'], [900, 'CM'], [500, 'D'], [400, 'CD'],
      [100, 'C'], [90, 'XC'], [50, 'L'], [40, 'XL'],
      [10, 'X'], [9, 'IX'], [5, 'V'], [4, 'IV'], [1, 'I']
    ];
    let result = '';
    for (const [val, sym] of roman) {
      while (num >= val) {
        result += sym;
        num -= val;
      }
    }
    return result;
  }