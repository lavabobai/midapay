# Base de données

## Schéma

### Table `generations`

| Colonne | Type | Description |
|---------|------|-------------|
| id | uuid | Identifiant unique (PK) |
| prompt | text | Prompt de génération |
| status | text | Statut de la génération |
| progress | integer | Progression (0-100) |
| grid_image_url | text | URL de l'image de grille générée par Midjourney |
| upscale_1 | text | URL de l'upscale 1 |
| upscale_2 | text | URL de l'upscale 2 |
| upscale_3 | text | URL de l'upscale 3 |
| upscale_4 | text | URL de l'upscale 4 |
| error | text | Message d'erreur |
| aspect_ratio | text | Ratio d'aspect |
| style | text | Style de génération |
| created_at | timestamp | Date de création |
| updated_at | timestamp | Date de mise à jour |
| completed_at | timestamp | Date de complétion |

## Contraintes

1. Une seule génération active à la fois :
```sql
ALTER TABLE generations
ADD CONSTRAINT single_active_generation
CHECK (
  CASE 
    WHEN status IN ('waiting', 'processing') 
    THEN 1 
    ELSE 0 
  END = 0
);
```

2. Trigger pour updated_at :
```sql
CREATE TRIGGER handle_updated_at
  BEFORE UPDATE ON generations
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();
```

## Storage

Les images sont stockées dans le bucket `generations` avec la structure suivante :
```
generations/
  YYYY-MM-DD/
    generation-id/
      grid.png
      upscale_1.png
      upscale_2.png
      upscale_3.png
      upscale_4.png
```
