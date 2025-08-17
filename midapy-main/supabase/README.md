# Supabase Configuration

Cette configuration Supabase est optimisée pour une application de génération d'images avec Midjourney.

## Structure

```
supabase/
├── config.toml          # Configuration Supabase
├── functions/          # Fonctions SQL personnalisées
├── init/              # Scripts d'initialisation
├── migrations/        # Migrations de base de données
├── policies/          # Politiques de sécurité
├── storage/           # Configuration du stockage
└── triggers/          # Triggers de base de données
```

## Tables Principales

### profiles
- Stocke les credentials Discord
- Un seul profil est utilisé pour toute l'application

### generations
- Suivi des générations d'images
- Contrainte pour empêcher les générations simultanées
- Stockage des URLs des images générées

## Stockage

Le bucket 'generations' est utilisé pour stocker :
- Les grilles d'images générées
- Les variations upscalées

## Migration

Pour appliquer les migrations :

```bash
supabase db reset
```

## Variables d'Environnement Requises

```bash
SUPABASE_URL=your_supabase_url
SUPABASE_SERVICE_ROLE_KEY=your_service_role_key
```
