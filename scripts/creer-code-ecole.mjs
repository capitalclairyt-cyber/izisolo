// Crée le code promo d'une ÉCOLE de formation partenaire : 100 % pendant 3 mois
// sur l'abonnement IziSolo, réservé aux nouvelles clientes (décision Colin,
// 2026-09-10 : trois mois plutôt que six, la carte est demandée au checkout,
// le quatrième mois se facture tout seul au tarif normal). Un coupon et un
// code par école, à id déterministe : le rejeu retrouve l'existant et ne
// crée rien en double.
//
// Usage, depuis izisolo/ :
//   node scripts/creer-code-ecole.mjs --key=sk_live_... --ecole=EFYSO [--nom="EFYSO, école française de yoga du Sud-Ouest"] [--max=60] [--fin=2027-08-31]
//   node scripts/creer-code-ecole.mjs --key=sk_live_... --liste          → les codes école existants et leur usage
//
// Le code s'écrit ECOLE-<ECOLE> (lettres, chiffres, tirets), il se saisit au
// checkout comme LANCEMENT50 (`allow_promotion_codes` est déjà actif). Rien
// n'est écrit en base IziSolo : Stripe est la seule source de vérité.
import Stripe from 'stripe';

const args = Object.fromEntries(process.argv.slice(2).map((a) => { const m = a.match(/^--([^=]+)(?:=(.*))?$/); return m ? [m[1], m[2] ?? true] : [a, true]; }));
if (!args.key) { console.error('Usage : --key=sk_... (--ecole=CODE [--nom=…] [--max=N] [--fin=AAAA-MM-JJ] | --liste)'); process.exit(1); }
const stripe = new Stripe(args.key, { apiVersion: '2024-06-20' });

if (args.liste) {
  const codes = await stripe.promotionCodes.list({ limit: 100 });
  const ecoles = codes.data.filter((c) => c.code.startsWith('ECOLE-'));
  if (!ecoles.length) console.log('Aucun code école.');
  for (const c of ecoles) console.log(`${c.code.padEnd(24)} ${c.active ? 'actif  ' : 'INACTIF'} utilisé ${c.times_redeemed}×${c.max_redemptions ? `/${c.max_redemptions}` : ''}  coupon ${c.coupon.id} (${c.coupon.percent_off} % × ${c.coupon.duration_in_months} mois)`);
  process.exit(0);
}

const ecole = String(args.ecole || '').toUpperCase().replace(/[^A-Z0-9-]/g, '');
if (!ecole) { console.error('💥 --ecole=CODE manquant (lettres et chiffres)'); process.exit(1); }
const code = `ECOLE-${ecole}`;
const nom = args.nom || `École partenaire ${ecole}`;
const max = args.max ? Number(args.max) : null;
const fin = args.fin ? Math.floor(new Date(`${args.fin}T23:59:59+02:00`).getTime() / 1000) : null;

// 1. Le coupon (la remise), un par école, à id déterministe.
let coupon = await stripe.coupons.retrieve(code).catch(() => null);
if (!coupon) {
  coupon = await stripe.coupons.create({
    id: code, name: `${nom} : 3 mois offerts`, percent_off: 100, duration: 'repeating', duration_in_months: 3,
    ...(fin ? { redeem_by: fin } : {}), metadata: { izisolo_ecole: ecole },
  });
  console.log(`＋ coupon créé : ${coupon.id}`);
} else {
  console.log(`✓ coupon existant : ${coupon.id} (${coupon.percent_off} % × ${coupon.duration_in_months} mois${coupon.valid ? '' : ', INVALIDE'})`);
}

// 2. Le code saisi au checkout, réservé aux nouvelles clientes.
const existants = await stripe.promotionCodes.list({ code, limit: 1 });
let promo = existants.data[0];
if (!promo) {
  promo = await stripe.promotionCodes.create({
    coupon: coupon.id, code, ...(max ? { max_redemptions: max } : {}), ...(fin ? { expires_at: fin } : {}),
    restrictions: { first_time_transaction: true }, metadata: { izisolo_ecole: ecole },
  });
  console.log(`＋ code créé : ${promo.code}`);
} else {
  console.log(`✓ code existant : ${promo.code} (${promo.active ? 'actif' : 'INACTIF'}, utilisé ${promo.times_redeemed}×)`);
}
console.log(`\nÀ donner à l'école : le code ${code}, à saisir sur la page d'abonnement (Paramètres → Abonnement IziSolo), après les 30 jours d'essai ou avant.`);
