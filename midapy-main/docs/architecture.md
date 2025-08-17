# Architecture de MidPicture

## Vue d'ensemble
MidPicture est une API backend qui permet de générer des images via Midjourney en utilisant Discord comme backend. Le système est composé de plusieurs services qui interagissent entre eux pour gérer le processus de génération d'images.

## Services Principaux

### Discord Service
- **WebSocket Manager**: Gère la connexion WebSocket avec Discord
  - Maintient une connexion stable
  - Envoie et reçoit les messages
  - Gère les reconnexions automatiques

- **Handlers**:
  - `GridHandler`: Traite les grilles d'images générées
  - `UpscaleHandler`: Gère les upscales d'images individuelles
  - Chaque handler émet des événements qui sont traités par le système

### Supabase Service
- **Storage Service**: 
  - Gère le stockage des images dans Supabase
  - Télécharge les images depuis Discord avec les bons headers
  - Vérifie l'intégrité des images (signature PNG)
  - Stocke les images dans un bucket public

- **Database Service**:
  - Gère l'état des générations
  - Stocke les URLs des images
  - Suit la progression des générations

## Structure des Fichiers

### `/src/services/discord/websocket/`
- `core/`: Classes et types de base pour le WebSocket
- `handlers/`: Gestionnaires de messages spécifiques
- `payloads.ts`: Définitions des payloads Discord

### `/src/services/supabase/`
- `storage.ts`: Service de stockage des images
- `storage/paths.ts`: Gestion des chemins de stockage
- `database.ts`: Types et interactions avec la base de données

## Flux de Données
1. L'utilisateur demande une génération d'image
2. Le WebSocket envoie la commande à Discord
3. Discord génère une grille d'images
4. Le `GridHandler` détecte la nouvelle grille et la sauvegarde
5. L'utilisateur sélectionne une image à upscaler
6. L'`UpscaleHandler` gère l'upscale et sauvegarde l'image finale

## Points Techniques Importants
- Les images sont stockées avec une structure de chemin standardisée
- Les headers HTTP sont configurés pour assurer la bonne réception des images
- Le bucket Supabase est configuré comme public pour un accès direct aux images
- Les types TypeScript assurent la cohérence des données
