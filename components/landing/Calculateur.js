'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import { Nav, Footer } from './Sections';
import { IziSoloLogo } from './Brand';
import ScrollReveal from './ScrollReveal';

export default function Calculateur() {
  useEffect(() => {
    document.documentElement.dataset.palette = 'sable';
  }, []);

  const [nbPayments, setNbPayments] = useState(20);
  const [avgAmount, setAvgAmount] = useState(25);
  const [plan, setPlan] = useState('pro');

  const volume = nbPayments * avgAmount;
  const iziPlanCost = plan === 'solo' ? 15 : 29;
  const iziFee = volume * 0.01;
  const stripeFee = nbPayments * 0.25 + volume * 0.015;
  const iziTotal = iziPlanCost + iziFee;
  const netPerPayment = avgAmount - (avgAmount * 0.015 + 0.25);

  return (
    <div className="izi-landing-root" data-palette="sable">
      <ScrollReveal />
      <Nav />
      <main>
        <section className="calc-hero">
          <div className="container">
            <span className="eyebrow">TRANSPARENCE</span>
            <h1 className="serif">Combien ça coûte,<br /><em>concrètement ?</em></h1>
            <p className="lead">
              Ajuste tes volumes. On te montre exactement ce que tu paies
              et ce que tu reçois : ligne par ligne, sans surprises.
            </p>
          </div>
        </section>

        <section className="calc-form">
          <div className="container">
            <div className="calc-inputs reveal">
              <div className="calc-input-group">
                <label htmlFor="nb-payments">Paiements en ligne par mois</label>
                <input
                  id="nb-payments"
                  type="range"
                  min={0}
                  max={100}
                  step={5}
                  value={nbPayments}
                  onChange={(e) => setNbPayments(Number(e.target.value))}
                />
                <span className="calc-value">{nbPayments}</span>
              </div>
              <div className="calc-input-group">
                <label htmlFor="avg-amount">Montant moyen par paiement</label>
                <input
                  id="avg-amount"
                  type="range"
                  min={10}
                  max={80}
                  step={5}
                  value={avgAmount}
                  onChange={(e) => setAvgAmount(Number(e.target.value))}
                />
                <span className="calc-value">{avgAmount} €</span>
              </div>
              <div className="calc-input-group">
                <label htmlFor="plan-select">Ton plan</label>
                <select id="plan-select" value={plan} onChange={(e) => setPlan(e.target.value)}>
                  <option value="solo">Essentiel · 15 €/mois</option>
                  <option value="pro">Complet · 29 €/mois</option>
                </select>
              </div>
            </div>

            <div className="calc-results reveal r-stagger">
              <div className="calc-result-card calc-izi">
                <div className="calc-result-logo">
                  <IziSoloLogo size={20} wordmark={true} />
                  <span className="calc-plan-badge">{plan === 'solo' ? 'Essentiel' : 'Complet'}</span>
                </div>
                <div className="calc-result-total">{iziTotal.toFixed(2)} €<span>/mois</span></div>
                <ul className="calc-breakdown">
                  <li>Abonnement {plan === 'solo' ? 'Essentiel' : 'Complet'} : {iziPlanCost} €</li>
                  {nbPayments > 0 && <li>Commission IziSolo (1 %) : {iziFee.toFixed(2)} €</li>}
                </ul>
              </div>

              {plan === 'pro' && nbPayments > 0 && (
                <div className="calc-result-card calc-stripe">
                  <h3>Frais Stripe</h3>
                  <div className="calc-result-label">Prélevés par Stripe sur chaque paiement</div>
                  <div className="calc-result-total">{stripeFee.toFixed(2)} €<span>/mois</span></div>
                  <ul className="calc-breakdown">
                    <li>1,5 % + 0,25 € × {nbPayments} paiements</li>
                    <li>Par paiement de {avgAmount} € → tu reçois {netPerPayment.toFixed(2)} € net</li>
                  </ul>
                </div>
              )}

              <div className="calc-result-card calc-total-card">
                <h3>Ton coût total</h3>
                <div className="calc-result-total">
                  {(plan === 'pro' && nbPayments > 0 ? iziTotal + stripeFee : iziTotal).toFixed(2)} €<span>/mois</span>
                </div>
                <ul className="calc-breakdown">
                  <li>Abonnement + commission IziSolo : {iziTotal.toFixed(2)} €</li>
                  {plan === 'pro' && nbPayments > 0 && <li>Frais Stripe (prélevés à part) : {stripeFee.toFixed(2)} €</li>}
                  {nbPayments > 0 && <li>Tu encaisses au total : {(volume - (plan === 'pro' ? stripeFee : 0)).toFixed(2)} € net</li>}
                </ul>
              </div>
            </div>

            <p className="calc-note reveal" style={{ textAlign: 'center', fontSize: '0.85rem', color: 'var(--c-ink-soft)', marginTop: 'var(--sp-6)', maxWidth: 600, marginLeft: 'auto', marginRight: 'auto' }}>
              La commission IziSolo (1 %) apparaît sur ta facture mensuelle, elle n'est jamais prélevée sur les paiements de tes élèves.
              Les frais Stripe (1,5 % + 0,25 €) sont les frais standard de paiement en ligne, identiques quel que soit l'outil que tu utilises.
              {plan === 'solo' && ' Le plan Essentiel ne propose pas le paiement en ligne : tes élèves paient en espèces, chèque ou virement.'}
            </p>
          </div>
        </section>

        <section className="calc-features">
          <div className="container reveal">
            <h2 className="serif">Ce qui est inclus dans ton abonnement</h2>
            <div className="calc-plans-compare">
              <div className="calc-plan-col">
                <h3>Essentiel · 15 €/mois</h3>
                <ul className="calc-feat-list">
                  <li>Élèves illimités · fiches complètes · import/export CSV</li>
                  <li>Agenda, récurrences, lieux illimités</li>
                  <li>Pointage 1-clic + carnets/abos gérés à la main</li>
                  <li>Mini-compta + export comptable</li>
                  <li>Cas à traiter (no-show, impayés…)</li>
                  <li>Page publique vitrine (planning, PWA)</li>
                </ul>
              </div>
              <div className="calc-plan-col calc-plan-featured">
                <h3>Complet · 29 €/mois</h3>
                <ul className="calc-feat-list">
                  <li>Tout du plan Essentiel</li>
                  <li>Réservation en ligne + annulation élève</li>
                  <li>Espace élève connecté (compte, rappels J-1)</li>
                  <li>Cours d'essai · liste d'attente · cours privés</li>
                  <li>Messagerie · mailing groupé · sondages planning</li>
                  <li>Paiement CB en ligne (Stripe)</li>
                  <li>Import fiche élève par photo (IA)</li>
                </ul>
              </div>
            </div>
          </div>
        </section>

        <section className="alt-cta">
          <div className="container reveal">
            <h2 className="serif">14 jours pour essayer,<br /><em>sans carte bancaire.</em></h2>
            <p>Tu choisis ton plan après. Annulable en 1 clic, sans engagement.</p>
            <Link href="/register" className="btn btn-accent btn-lg squishy">
              Essayer gratuitement →
            </Link>
          </div>
        </section>
      </main>
      <Footer />
    </div>
  );
}
