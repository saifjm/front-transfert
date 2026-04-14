// Traduction fidèle de la fonction PL/SQL CONTROLE_RNE en TypeScript
// Retour:
// 0 = valide
// 1 = non valide
export function controleRne(p_str: string): number {
  const vecteur = "ABCDEFGHJKLMNPQRSTVWXYZ"; // 23 caractères
  let cleMF = "";
  let somme = 0;

  try {
    // if length(p_str) <> 8 then return 1;
    if (p_str.length !== 8) {
      return 1;
    }
    // elsif p_str = '            ' then return 0;
    // (dans le PL/SQL, ce test ne sera vrai que si length = 12, mais on le garde tel quel)
    else if (p_str === "            ") {
      return 0;
    }
    // elsif to_number(substr(p_str, 1, 7)) < '9999999' then ...
    else {
      const first7 = p_str.substring(0, 7); // substr(p_str, 1, 7)
      const nFirst7 = Number(first7);

      // to_number(...) et comparaison < '9999999' (Oracle convertit la chaîne en nombre)
      if (!Number.isFinite(nFirst7) || nFirst7 >= 9999999) {
        return 1;
      }

      // somme := 0;
      somme = 0;

      // FOR i in 1..7 LOOP
      //   somme := somme + to_number(substr(p_str, 8 - i, 1)) * i;
      // END LOOP;
      for (let i = 1; i <= 7; i++) {
        const ch = p_str.substring(8 - i - 1, 8 - i); // substr(p_str, 8 - i, 1) en base 1 -> TS base 0
        const digit = Number(ch);

        // to_number(...) doit réussir, sinon exception => return 1
        if (!Number.isFinite(digit)) {
          return 1;
        }

        somme += digit * i;
      }

      // somme := Mod(somme,23) + 1;
      somme = (somme % 23) + 1;

      // cleMF := substr(vecteur,somme,1);
      cleMF = vecteur.substring(somme - 1, somme);

      // if substr(p_str, 8, 1) <> cleMF then return 1 else return 0
      const lastChar = p_str.substring(7, 8); // substr(p_str, 8, 1)
      if (lastChar !== cleMF) {
        return 1;
      } else {
        return 0;
      }
    }
  } catch {
    // exception when others then return 1;
    return 1;
  }
}
