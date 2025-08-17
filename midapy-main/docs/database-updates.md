# Mise à jour de la base de données

Ce document explique comment gérer les mises à jour de la base de données dans le projet MidPicture.

## Système de migration

Le projet utilise un système de migrations SQL pour gérer les modifications de la base de données. Les migrations sont :
- Des fichiers SQL stockés dans `supabase/migrations/`
- Exécutées dans l'ordre alphabétique
- Trackées dans la table `migrations` pour éviter les doublons
- Appliquées automatiquement lors du déploiement

## Créer une nouvelle migration

1. **Nommage du fichier**
   ```
   YYYYMMDD_description.sql
   ```
   Exemple : `20231230_add_user_field.sql`

2. **Structure recommandée**
   ```sql
   -- Description des changements
   -- Ex: Ajout du champ user_id pour lier les générations aux utilisateurs
   
   -- Modifications de structure
   ALTER TABLE generations ADD COLUMN user_id uuid;
   
   -- Contraintes et indexes
   ALTER TABLE generations ALTER COLUMN user_id SET NOT NULL;
   CREATE INDEX idx_generations_user_id ON generations(user_id);
   
   -- Données initiales si nécessaire
   INSERT INTO ...;
   ```

3. **Bonnes pratiques**
   - Toujours ajouter des commentaires explicatifs
   - Une migration = un changement logique
   - Ne jamais modifier une migration déjà exécutée
   - Prévoir la réversibilité des changements

## Exécution des migrations

### En développement

Pour appliquer les migrations en local :
```bash
npm run db:migrate
```

Pour vérifier le statut des migrations :
```sql
SELECT * FROM migrations ORDER BY executed_at DESC;
```

### En production

Les migrations sont exécutées automatiquement lors du déploiement via :
```bash
npm run build
```

Ce script :
1. Compile le TypeScript
2. Exécute toutes les migrations non appliquées
3. Met à jour la table `migrations`

## Annuler une migration

Pour annuler des changements, créez une nouvelle migration qui fait l'inverse :

```sql
-- 20231230_remove_user_field.sql
ALTER TABLE generations DROP COLUMN user_id;
DROP INDEX IF EXISTS idx_generations_user_id;
```

Ne jamais supprimer ou modifier les anciens fichiers de migration.

## Résolution des problèmes

1. **La migration échoue**
   - Vérifier les logs d'erreur
   - S'assurer que la syntaxe SQL est correcte
   - Vérifier les dépendances (tables, colonnes existantes)

2. **Migration déjà exécutée**
   - Normal : le système évite les doublons
   - Vérifier la table `migrations` pour le statut

3. **Erreur de connexion**
   - Vérifier `SUPABASE_DB_URL` dans le fichier .env
   - S'assurer que le VPN/tunnel est actif si nécessaire

## Structure actuelle

La base de données contient :
- Table `migrations` : Suivi des migrations
- Table `generations` : Stockage des générations d'images
- Bucket `generations` : Stockage des fichiers images

## Sécurité

- Les migrations sont exécutées avec les privilèges complets
- Attention aux modifications destructives
- Toujours faire une sauvegarde avant les migrations majeures
- Tester les migrations en développement avant la production
