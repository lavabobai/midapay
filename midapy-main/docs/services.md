# Services

## Service Discord

### Websocket
- Gestion de la connexion WebSocket avec Discord
- Heartbeat automatique
- Reconnexion automatique en cas de déconnexion
- Gestion des événements de génération d'images

### Handlers
#### GridHandler
- Réception et traitement des images de grille
- Téléchargement et stockage dans Supabase
- Mise à jour du statut et de la progression (50%)
- Transmission des boutons d'upscale au UpscaleHandler
- Gestion des erreurs avec retry

#### UpscaleHandler
- Suit l'état des URLs traitées et en cours de traitement
- Système de retry pour la récupération des données
- Télécharge l'image depuis Discord
- Upload l'image vers Supabase Storage
- Met à jour le statut et la progression
- Émet des événements pour le suivi du processus
- États de progression :
  - `grid_completed` : Grille générée et sauvegardée
  - `variations_in_progress` : Traitement des upscales en cours
  - `completed` : Tous les upscales sont terminés
- Événements émis :
  - `upscaleCompleted` : Un upscale est terminé
  - `allUpscalesCompleted` : Tous les upscales sont terminés
  - `error` : Une erreur est survenue

### Commandes
- `/imagine`: Génération d'images
- Upscale: Amélioration d'une image spécifique

### Événements
- `MESSAGE_CREATE`: Nouvelles images générées
- `MESSAGE_UPDATE`: Mise à jour du statut
- `INTERACTION_CREATE`: Réponses aux commandes

## Service Supabase

### Storage
- Structure par génération (`{generationId}/grid.png`)
- Images d'upscale (`{generationId}/upscale_{1-4}.png`)
- Métadonnées : contentType, cacheControl
- URLs publiques pour accès direct

### Base de données
#### Generations
- `grid_url`: URL de l'image de grille
- `upscale_{1-4}_url`: URLs des upscales
- `status`: État actuel de la génération
- `progress`: Progression (0-100%)
- `error`: Message d'erreur si échec
- `completed_at`: Date de complétion

### Opérations
- `createGeneration`: Crée une nouvelle génération
- `updateGeneration`: Met à jour le statut et les URLs
- `getGeneration`: Récupère une génération
- `listGenerations`: Liste les générations
- `getProcessingGeneration`: Vérifie les générations actives

### Contraintes
- Une seule génération active à la fois
- Validation des statuts
- Gestion des erreurs PostgreSQL

## Service de Stockage

### Organisation
- Un dossier par génération
- Nommage standardisé :
  - `grid.png`: Image de grille
  - `upscale_{1-4}.png`: Images d'upscale

### Opérations
- Upload des images avec métadonnées
- Génération des URLs publiques
- Nettoyage automatique (à implémenter)

## Service de Génération

### Orchestration
- Gestion du flux de génération
- Coordination des services
- Gestion des erreurs

### États et Progression
1. Création de la génération (0%)
2. Envoi à Discord/Midjourney (25%)
3. Réception de la grille (50%)
4. Upscales (50-100%)
   - Upscale 1: 62.5%
   - Upscale 2: 75%
   - Upscale 3: 87.5%
   - Upscale 4: 100%
5. Complétion et archivage
