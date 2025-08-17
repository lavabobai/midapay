import { Router } from 'express';
import { generationService } from '@/services/generation/service';
import { validateGenerate } from '@/middlewares/validators';
import { supabaseService } from '@/services/supabase/service';

const router = Router();

// POST /generations - Start a new generation
router.post('/', validateGenerate, async (req, res, next) => {
  try {
    const generation = await generationService.generate(req.body);
    res.status(201).json(generation);
  } catch (error) {
    if (error instanceof Error && error.message === 'Another generation is already in progress') {
      res.status(409).json({ error: error.message });
    } else {
      next(error);
    }
  }
});

// GET /generations/:id - Get generation status
router.get('/:id', async (req, res, next) => {
  try {
    const generation = await generationService.getStatus(req.params.id);
    if (!generation) {
      res.status(404).json({ error: 'Generation not found' });
    } else {
      res.json(generation);
    }
  } catch (error) {
    next(error);
  }
});

// DELETE /generations/:id - Delete a generation
router.delete('/:id', async (req, res, next) => {
  try {
    const generation = await supabaseService.getGeneration(req.params.id);
    if (!generation) {
      res.status(404).json({ error: 'Generation not found' });
      return;
    }
    await supabaseService.deleteGeneration(req.params.id);
    res.status(200).json({ message: `Generation ${req.params.id} has been successfully deleted` });
  } catch (error) {
    next(error);
  }
});

// POST /generations/reset - Reset stuck generations
router.post('/reset', async (req, res, next) => {
  try {
    const count = await supabaseService.forceResetStuckGenerations();
    console.log(`Reset forcé réalisé avec succès : ${count} génération${count > 1 ? 's' : ''}`);
    res.status(200).json({ 
      message: 'Stuck generations reset successfully',
      count: count
    });
  } catch (error) {
    console.error('Erreur lors du reset forcé:', error);
    next(error);
  }
});

export default router;
