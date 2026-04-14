// Test de validation de la fonction controleRne
import { controleRne } from './utils/controleRne';

console.log('═══════════════════════════════════════════════════════════');
console.log('TEST DE VALIDATION controleRne()');
console.log('═══════════════════════════════════════════════════════════\n');

// Test 1: 1695881M (DOIT ÊTRE VALIDE selon PL/SQL)
console.log('Test 1: 1695881M');
const resultat1 = controleRne('1695881M');
console.log(`Résultat: ${resultat1} (${resultat1 === 0 ? '✅ VALIDE' : '❌ INVALIDE'})`);
console.log('Attendu: 0 (VALIDE)\n');

// Test 2: 1695881N (DOIT ÊTRE INVALIDE - clé incorrecte)
console.log('Test 2: 1695881N');
const resultat2 = controleRne('1695881N');
console.log(`Résultat: ${resultat2} (${resultat2 === 0 ? '✅ VALIDE' : '❌ INVALIDE'})`);
console.log('Attendu: 1 (INVALIDE)\n');

// Test 3: 0123456 (DOIT ÊTRE INVALIDE - longueur incorrecte)
console.log('Test 3: 0123456');
const resultat3 = controleRne('0123456');
console.log(`Résultat: ${resultat3} (${resultat3 === 0 ? '✅ VALIDE' : '❌ INVALIDE'})`);
console.log('Attendu: 1 (INVALIDE)\n');

// Test 4: 0123456B (calcul de la clé attendue)
console.log('Test 4: Calcul manuel pour 0123456');
let somme = 0;
const vecteur = 'ABCDEFGHJKLMNPQRSTVWXYZ';

for (let i = 1; i <= 7; i++) {
  const ch = '0123456'.substring(7 - i, 7 - i + 1);
  const digit = Number(ch);
  console.log(`  i=${i}: digit=${digit}, produit=${digit * i}`);
  somme += digit * i;
}

console.log(`  Somme totale: ${somme}`);
const indexCle = (somme % 23) + 1;
console.log(`  (${somme} % 23) + 1 = ${indexCle}`);
const cleCalculee = vecteur.substring(indexCle - 1, indexCle);
console.log(`  Clé calculée: ${cleCalculee}`);
console.log(`  RNE valide: 0123456${cleCalculee}\n`);

const resultat4 = controleRne(`0123456${cleCalculee}`);
console.log(`Test 4bis: 0123456${cleCalculee}`);
console.log(`Résultat: ${resultat4} (${resultat4 === 0 ? '✅ VALIDE' : '❌ INVALIDE'})`);
console.log('Attendu: 0 (VALIDE)\n');

console.log('═══════════════════════════════════════════════════════════');
console.log('FIN DES TESTS');
console.log('═══════════════════════════════════════════════════════════');
