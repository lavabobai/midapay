# Stockage des Images

## Configuration Supabase

### Bucket
- Nom : `generations`
- Accès : Public
- Type de fichiers : Images PNG uniquement

### Structure des Chemins
Les images sont stockées avec une structure de chemin standardisée :
```
generations/
  ├── [generationId]/
  │   ├── grid.png
  │   ├── upscale_1.png
  │   ├── upscale_2.png
  │   ├── upscale_3.png
  │   └── upscale_4.png
```

## Gestion des Images

### Téléchargement depuis Discord
- Headers spécifiques pour assurer la bonne réception :
  ```typescript
  headers: {
    'Accept': 'image/png,image/*'
  }
  ```
- Vérification du content-type
- Vérification de la signature PNG (premiers octets : 89504e47)

### Upload vers Supabase
- Format : PNG uniquement
- Content-Type : `image/png`
- Cache-Control : `3600` (1 heure)
- Mode : Upsert (écrase si existe)

## Vérifications de Sécurité
1. Vérification du content-type de la réponse Discord
2. Vérification de la signature PNG du fichier
3. Vérification de la taille du fichier
4. Accès public mais sécurisé via Supabase

## Gestion des Erreurs
- Logging détaillé à chaque étape
- Retry automatique en cas d'échec
- Messages d'erreur explicites pour faciliter le débogage
