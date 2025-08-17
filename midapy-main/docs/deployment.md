# Déploiement

## Prérequis

1. Node.js v18 ou supérieur
2. Instance Supabase
3. Bot Discord configuré
4. Serveur Discord avec les permissions nécessaires

## Configuration de Build

### Structure
- **Install Command**: Commande pour installer les dépendances
  ```bash
  npm install
  ```

- **Build Command**: Commande pour construire l'application et initialiser la base de données
  ```bash
  npm run build
  ```
  Cette commande :
  1. Compile le code TypeScript
  2. Installe la fonction `exec_sql` dans Supabase
  3. Exécute toutes les migrations de base de données
  4. Configure les triggers et le storage

- **Start Command**: Commande pour démarrer l'application
  ```bash
  npm start
  ```

### Paramètres
- **Base Directory**: `/`
- **Publish Directory**: `/`
- **Watch Paths**: `src/pages/**`
  ```

## Structure du Projet

```
project/
├── src/                    # Code source TypeScript
├── dist/                   # Code compilé
├── supabase/
│   ├── migrations/        # Schéma de base de données
│   ├── triggers/         # Triggers et fonctions
│   ├── storage/          # Configuration du storage
│   └── functions/        # Fonctions SQL utilitaires
└── scripts/
    ├── build.js          # Script de build principal
    └── migrate.js        # Script de migration DB
```

## Variables d'environnement

Configurer les variables suivantes dans l'environnement de production :

```bash
# Supabase
SUPABASE_URL=
SUPABASE_SERVICE_ROLE_KEY=

# Discord
DISCORD_TOKEN=
DISCORD_CHANNEL_ID=
DISCORD_SERVER_ID=

# API
API_BEARER_TOKEN=
PORT=3000

# Node
NODE_ENV=production
```

## Vérification du Déploiement

### 1. Base de données
```sql
-- Vérifier les tables
SELECT table_name FROM information_schema.tables 
WHERE table_schema = 'public';

-- Vérifier les triggers
SELECT trigger_name, event_manipulation, event_object_table
FROM information_schema.triggers
WHERE trigger_schema = 'public';

-- Vérifier les buckets
SELECT name FROM storage.buckets;
```

### 2. API
```bash
# Vérifier que l'API répond (endpoint public)
curl https://your-api-url/health
```

## Monitoring

Points à surveiller :
- Logs du serveur
- Statut des WebSockets Discord
- Espace de stockage Supabase
- Temps de réponse de l'API

## Sécurité

1. Token API
   - Utiliser un token fort en production
   - Rotation régulière du token

2. Variables d'environnement
   - Ne jamais commiter les fichiers `.env`
   - Utiliser un gestionnaire de secrets

3. Rate Limiting
   - Implémenter un rate limiting par IP
   - Limiter le nombre de générations par période

## Maintenance

1. Logs
   - Centraliser les logs
   - Mettre en place des alertes

2. Backups
   - Sauvegarder la base de données régulièrement
   - Exporter les buckets de storage
   - Conserver les migrations pour pouvoir recréer la base

3. Mises à jour
   - Mettre à jour les dépendances
   - Suivre les changements de l'API Discord
