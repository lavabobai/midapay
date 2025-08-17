# API Documentation

## Base URL

- Local : `http://localhost:3000`
- Production : `https://api.midpicture.kombiz.net`

## Authentification

Tous les endpoints nécessitent un header d'authentification :
```
Authorization: Bearer YOUR_API_KEY
```

## Endpoints

### Générer une image

```http
POST /generations
Content-Type: application/json
Authorization: Bearer YOUR_API_KEY

{
    "prompt": "a beautiful sunset over mountains",
    "aspectRatio": "16:9",
    "style": "realistic"  // optionnel
}
```

**Paramètres du body :**
- `prompt` (string, requis) : Description de l'image à générer
- `aspectRatio` (string, requis) : Format de l'image. Valeurs possibles : "1:1", "16:9", "4:3"
- `style` (string, optionnel) : Style artistique à appliquer

**Réponses :**
- `201 Created` : Génération démarrée avec succès
  ```json
  {
    "id": {
        "id": "20556038-49e9-4411-a4dd-f740f3c3a689",
        "prompt": "a beautiful sunset over mountains",
        "status": "waiting",
        "progress": 0,
        "grid_image_url": null,
        "upscale_1": null,
        "upscale_2": null,
        "upscale_3": null,
        "upscale_4": null,
        "error": null,
        "aspect_ratio": "16:9",
        "style": null,
        "created_at": "2024-12-31T10:17:45.137368+00:00",
        "updated_at": "2024-12-31T10:17:45.137368+00:00",
        "completed_at": null
    }
  }
  ```
- `409 Conflict` : Une autre génération est déjà en cours
  ```json
  {
      "error": "Another generation is already in progress"
  }
  ```

### Vérifier le statut d'une génération

```http
GET /generations/:id
Authorization: Bearer YOUR_API_KEY
```

**Paramètres URL :**
- `id` (string, requis) : UUID de la génération

**Réponses :**
- `200 OK` : Statut récupéré avec succès
  ```json
  {
    "id": "20556038-49e9-4411-a4dd-f740f3c3a689",
    "prompt": "a beautiful sunset over mountains",
    "status": "completed",
    "progress": 100,
    "grid_image_url": "https://...",
    "upscale_1": "https://...",
    "upscale_2": "https://...",
    "upscale_3": "https://...",
    "upscale_4": "https://...",
    "error": null,
    "aspect_ratio": "16:9",
    "style": null,
    "created_at": "2024-12-31T10:17:45.137368+00:00",
    "updated_at": "2024-12-31T10:17:45.137368+00:00",
    "completed_at": "2024-12-31T10:18:45.137368+00:00"
  }
  ```
- `404 Not Found` : Génération non trouvée
  ```json
  {
      "error": "Generation not found"
  }
  ```

### Supprimer une génération

```http
DELETE /generations/:id
Authorization: Bearer YOUR_API_KEY
```

**Paramètres URL :**
- `id` (string, requis) : UUID de la génération à supprimer

**Réponses :**
- `200 OK` : Génération supprimée avec succès
  ```json
  {
      "message": "Generation 20556038-49e9-4411-a4dd-f740f3c3a689 has been successfully deleted"
  }
  ```
- `404 Not Found` : Génération non trouvée
  ```json
  {
      "error": "Generation not found"
  }
  ```

### Réinitialiser les générations bloquées

```http
POST /generations/reset
Authorization: Bearer YOUR_API_KEY
```

Cet endpoint réinitialise immédiatement toutes les générations qui sont dans un état de traitement (status 'processing' ou 'waiting'), sans tenir compte du temps écoulé.

Note : Il existe aussi un mécanisme automatique qui réinitialise les générations bloquées depuis plus de 10 minutes avant chaque nouvelle génération d'image.

**Réponses :**
- `200 OK` : Les générations bloquées ont été réinitialisées avec succès
  ```json
  {
      "message": "Stuck generations reset successfully",
      "count": 2
  }
  ```
- `500 Internal Server Error` : Une erreur est survenue lors de la réinitialisation
  ```json
  {
      "error": "Error message"
  }
  ```

## Statuts de génération

Une génération peut avoir les statuts suivants :

- `waiting` : En attente de traitement
- `processing` : En cours de traitement
- `completed` : Traitement terminé avec succès
- `error` : Une erreur est survenue

Le champ `progress` indique la progression en pourcentage (0-100).
