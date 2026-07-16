# 🕌 Chaml (لم الشمل) - Plateforme SaaS de Regroupement Familial

**Chaml.fr** est un assistant et un outil collaboratif destiné à accompagner les couples franco-marocains dans leur parcours de regroupement familial en France (OFII, Préfecture, Consulat). 

L'application intègre :
1. **🔒 Chiffrement de bout en bout (Zero-Knowledge E2EE)** : Les documents sensibles des utilisateurs sont cryptés directement dans le navigateur en AES-GCM 256 bits avant envoi. Les serveurs ne stockent que les blocs cryptés et l'administrateur n'a aucun moyen de les décrypter.
2. **🗺️ Autocomplétion d'adresses & Détection de Zone** : Connexion à l'API Adresse officielle française pour la saisie automatique et le calcul automatique de la zone géographique réglementaire (Zone A, B ou C) requise par l'OFII.
3. **👥 Onboarding collaboratif** : Inscription mono-compte pour le conjoint en France (demandeur) et envoi sécurisé d'un lien d'invitation par e-mail au conjoint au Maroc (bénéficiaire) pour configurer son mot de passe et synchroniser les checklists en temps réel.
4. **📊 Modération administrative** : Outil complet permettant à l'administrateur de valider les comptes, de suivre l'avancement des pièces justificatives et de soumettre des commentaires sans jamais avoir accès aux fichiers confidentiels.

---

## 📖 Documentation du Projet

La documentation technique complète de l'application est rédigée dans le dossier `/docs` :

* **📐 [Architecture Système & Modèle de Données (ERD)](docs/architecture.md)** : Flux d'authentification par cookies sécurisés (HttpOnly), chiffrement de bout en bout (E2EE), et schéma relationnel PostgreSQL.
* **🔒 [Audit de Sécurité & Revue de Code](docs/code_review.md)** : Analyse de la protection contre les injections SQL, XSS, CSRF, chiffrement AES des fichiers, protection des mots de passe SMTP et recommandations de production.
* **🔌 [Référence de l'API REST Backend](docs/api_endpoints.md)** : Catalogue complet des routes Express.js (Auth, Dossiers, Modération) avec formats de requête et exemples de réponses.
* **🚀 [Guide de Démarrage Développeur & Déploiement VPS](docs/getting_started.md)** : Instructions d'initialisation de la base PostgreSQL locale et runbook de déploiement sur VPS Ubuntu (Systemd, Nginx, Let's Encrypt SSL).

---

## 🛠️ Démarrage Rapide (Développement Local)

### Prérequis
* Node.js (v18+) et npm.
* PostgreSQL (v14+) fonctionnant localement.

### Étape 1 : Configuration de la base de données
1. Ouvrez votre terminal PostgreSQL ou pgAdmin et créez la base de données :
   ```sql
   CREATE DATABASE chaml_db;
   ```
2. Créez l'utilisateur et accordez-lui les privilèges :
   ```sql
   CREATE ROLE chaml WITH LOGIN PASSWORD 'votre_mot_de_passe_secu';
   GRANT ALL PRIVILEGES ON DATABASE chaml_db TO chaml;
   \c chaml_db;
   GRANT ALL ON SCHEMA public TO chaml;
   ```

### Étape 2 : Lancer le Serveur API (Backend Express)
```bash
cd server
npm install
npm run dev
```
*Le serveur démarrera sur `http://localhost:5000`. Il créera automatiquement les tables de données et un compte administrateur par défaut `admin@chaml.fr` (le mot de passe temporaire unique de première connexion s'affichera dans la console).*

### Étape 3 : Lancer l'Application Client (Frontend React)
Dans le dossier racine du projet :
```bash
npm install
npm run dev
```
*L'interface web se lancera sur **`http://localhost:5173/`** avec rafraîchissement à chaud (HMR).*

---

## 🚀 Déploiement en Production (VPS Ubuntu)

Le déploiement complet en production s'effectue en utilisant :
1. **Nginx** comme serveur web et reverse proxy HTTPS.
2. **Systemd** pour faire tourner l'API Node en tâche de fond persistante.
3. **Certbot** pour renouveler automatiquement vos certificats SSL Let's Encrypt.

Pour les instructions détaillées pas-à-pas de configuration, consultez le **[Guide de Déploiement VPS](docs/getting_started.md)**.
