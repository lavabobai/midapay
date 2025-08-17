# Configuration

## Variables d'environnement

### Supabase

- `SUPABASE_URL`: URL de votre projet Supabase
  - Où le trouver : Dans les paramètres du projet Supabase, sous "Project URL"
  - Format : `https://[your-project].supabase.co`

- `SUPABASE_SERVICE_ROLE_KEY`: Clé de service Supabase
  - Où le trouver : Dans les paramètres du projet Supabase, sous "Project API keys"
  - Format : Une chaîne JWT commençant par "ey..."

- `SUPABASE_DB_URL`: URL de connexion directe à la base de données PostgreSQL
  - Où le trouver : Dans les paramètres du projet Supabase, sous "Database" > "Connection string" > "URI"
  - Format : `postgres://postgres:[PASSWORD]@db.[PROJECT-REF].supabase.co:5432/postgres`
  - Note : Remplacez [PASSWORD] par votre mot de passe de base de données et [PROJECT-REF] par la référence de votre projet

### Discord

- `DISCORD_TOKEN`: Token du bot Discord
  - Où le trouver : Sur le portail développeur Discord, dans les paramètres de votre application
  - Format : Une chaîne de caractères

- `DISCORD_CHANNEL_ID`: ID du canal pour les générations
  - Comment l'obtenir : Activer le mode développeur dans Discord, clic droit sur le canal > "Copier l'identifiant"
  - Format : Un nombre

- `DISCORD_SERVER_ID`: ID du serveur Discord
  - Comment l'obtenir : Activer le mode développeur dans Discord, clic droit sur le serveur > "Copier l'identifiant"
  - Format : Un nombre

### API

- `API_BEARER_TOKEN`: Token pour l'authentification API
  - Comment le générer : Utilisez un générateur de token sécurisé
  - Format : Une chaîne de caractères aléatoire (min. 32 caractères recommandé)

- `PORT`: Port du serveur (défaut: 3000)
  - Format : Un nombre

- `NODE_ENV`: Environnement (development/production)

## Fichiers de configuration

### Développement
`.env.local`:
```bash
SUPABASE_URL=http://localhost:54321
SUPABASE_SERVICE_ROLE_KEY=your_local_key
SUPABASE_DB_URL=postgres://postgres:your_local_password@localhost:5432/postgres
DISCORD_TOKEN=your_bot_token
DISCORD_CHANNEL_ID=your_channel_id
DISCORD_SERVER_ID=your_server_id
API_BEARER_TOKEN=local_token
PORT=3000
NODE_ENV=development
```

### Production
`.env.production`:
```bash
SUPABASE_URL=your_production_url
SUPABASE_SERVICE_ROLE_KEY=your_production_key
SUPABASE_DB_URL=postgres://postgres:your_production_password@db.your_project.supabase.co:5432/postgres
DISCORD_TOKEN=your_production_bot_token
DISCORD_CHANNEL_ID=your_production_channel_id
DISCORD_SERVER_ID=your_production_server_id
API_BEARER_TOKEN=your_production_token
PORT=3000
NODE_ENV=production
```

## Scripts npm

- `npm run dev`: Démarre le serveur en mode développement
- `npm run build`: Build le projet
- `npm start`: Démarre le serveur en production
- `npm run tunnel`: Lance un tunnel ngrok pour les tests
- `npm run db:migrate`: Lance les migrations de base de données
