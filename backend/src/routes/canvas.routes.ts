import { Request, Response, Router } from 'express';
import { DatabaseService } from '../services/database.service';
import { authenticateToken } from '../middleware/auth.middleware';

const router = Router();

// Canvas/Fabric.js related endpoints
router.post('/save', authenticateToken, async (req: Request, res: Response) => {
  try {
    const { canvasData, name } = req.body;
    
    if (!canvasData) {
      return res.status(400).json({ 
        success: false, 
        message: 'Canvas data is required' 
      });
    }
    
    const result = await DatabaseService.saveCanvas(canvasData, name || 'Untitled Canvas');
    
    if (result.success) {
      return res.json(result);
    } else {
      return res.status(500).json(result);
    }
  } catch (error) {
    return res.status(500).json({ 
      success: false, 
      message: 'Failed to save canvas', 
      error: error instanceof Error ? error.message : 'Unknown error' 
    });
  }
});

router.get('/list', authenticateToken, async (req: Request, res: Response) => {
  try {
    const result = await DatabaseService.getCanvasList();
    
    if (result.success) {
      return res.json(result);
    } else {
      return res.status(500).json(result);
    }
  } catch (error) {
    return res.status(500).json({ 
      success: false, 
      message: 'Failed to fetch canvas list', 
      error: error instanceof Error ? error.message : 'Unknown error' 
    });
  }
});

router.get('/:id', authenticateToken, async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    
    if (!id || isNaN(parseInt(id))) {
      return res.status(400).json({ 
        success: false, 
        message: 'Valid canvas ID is required' 
      });
    }
    
    const result = await DatabaseService.getCanvas(id);
    
    if (result.success) {
      return res.json(result);
    } else {
      return res.status(404).json(result);
    }
  } catch (error) {
    return res.status(500).json({ 
      success: false, 
      message: 'Failed to fetch canvas', 
      error: error instanceof Error ? error.message : 'Unknown error' 
    });
  }
});

router.put('/:id', authenticateToken, async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    const { canvasData, name } = req.body;
    
    if (!id || isNaN(parseInt(id))) {
      return res.status(400).json({ 
        success: false, 
        message: 'Valid canvas ID is required' 
      });
    }
    
    if (!canvasData) {
      return res.status(400).json({ 
        success: false, 
        message: 'Canvas data is required' 
      });
    }
    
    const result = await DatabaseService.updateCanvas(id, canvasData, name);
    
    if (result.success) {
      return res.json(result);
    } else {
      return res.status(404).json(result);
    }
  } catch (error) {
    return res.status(500).json({ 
      success: false, 
      message: 'Failed to update canvas', 
      error: error instanceof Error ? error.message : 'Unknown error' 
    });
  }
});

router.delete('/:id', authenticateToken, async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    
    if (!id || isNaN(parseInt(id))) {
      return res.status(400).json({ 
        success: false, 
        message: 'Valid canvas ID is required' 
      });
    }
    
    const result = await DatabaseService.deleteCanvas(id);
    
    if (result.success) {
      return res.json(result);
    } else {
      return res.status(404).json(result);
    }
  } catch (error) {
    return res.status(500).json({ 
      success: false, 
      message: 'Failed to delete canvas', 
      error: error instanceof Error ? error.message : 'Unknown error' 
    });
  }
});

export default router;