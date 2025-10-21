"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = require("express");
const database_service_1 = require("../services/database.service");
const auth_middleware_1 = require("../middleware/auth.middleware");
const router = (0, express_1.Router)();
router.post('/save', auth_middleware_1.authenticateToken, async (req, res) => {
    try {
        const { canvasData, name } = req.body;
        if (!canvasData) {
            return res.status(400).json({
                success: false,
                message: 'Canvas data is required'
            });
        }
        const result = await database_service_1.DatabaseService.saveCanvas(canvasData, name || 'Untitled Canvas');
        if (result.success) {
            return res.json(result);
        }
        else {
            return res.status(500).json(result);
        }
    }
    catch (error) {
        return res.status(500).json({
            success: false,
            message: 'Failed to save canvas',
            error: error instanceof Error ? error.message : 'Unknown error'
        });
    }
});
router.get('/list', auth_middleware_1.authenticateToken, async (req, res) => {
    try {
        const result = await database_service_1.DatabaseService.getCanvasList();
        if (result.success) {
            return res.json(result);
        }
        else {
            return res.status(500).json(result);
        }
    }
    catch (error) {
        return res.status(500).json({
            success: false,
            message: 'Failed to fetch canvas list',
            error: error instanceof Error ? error.message : 'Unknown error'
        });
    }
});
router.get('/:id', auth_middleware_1.authenticateToken, async (req, res) => {
    try {
        const { id } = req.params;
        if (!id || isNaN(parseInt(id))) {
            return res.status(400).json({
                success: false,
                message: 'Valid canvas ID is required'
            });
        }
        const result = await database_service_1.DatabaseService.getCanvas(id);
        if (result.success) {
            return res.json(result);
        }
        else {
            return res.status(404).json(result);
        }
    }
    catch (error) {
        return res.status(500).json({
            success: false,
            message: 'Failed to fetch canvas',
            error: error instanceof Error ? error.message : 'Unknown error'
        });
    }
});
router.put('/:id', auth_middleware_1.authenticateToken, async (req, res) => {
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
        const result = await database_service_1.DatabaseService.updateCanvas(id, canvasData, name);
        if (result.success) {
            return res.json(result);
        }
        else {
            return res.status(404).json(result);
        }
    }
    catch (error) {
        return res.status(500).json({
            success: false,
            message: 'Failed to update canvas',
            error: error instanceof Error ? error.message : 'Unknown error'
        });
    }
});
router.delete('/:id', auth_middleware_1.authenticateToken, async (req, res) => {
    try {
        const { id } = req.params;
        if (!id || isNaN(parseInt(id))) {
            return res.status(400).json({
                success: false,
                message: 'Valid canvas ID is required'
            });
        }
        const result = await database_service_1.DatabaseService.deleteCanvas(id);
        if (result.success) {
            return res.json(result);
        }
        else {
            return res.status(404).json(result);
        }
    }
    catch (error) {
        return res.status(500).json({
            success: false,
            message: 'Failed to delete canvas',
            error: error instanceof Error ? error.message : 'Unknown error'
        });
    }
});
exports.default = router;
//# sourceMappingURL=canvas.routes.js.map