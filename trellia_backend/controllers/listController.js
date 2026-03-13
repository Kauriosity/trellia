const prisma = require('../lib/prisma');

/**
 * List Controller
 * Manages board columns and their ordering.
 */
const listController = {
  /**
   * Add a new column to a project board.
   */
  createNewList: async (request, response, next) => {
    const { title, boardId, position } = request.body;
    try {
      const newList = await prisma.list.create({
        data: { title, boardId, position }
      });
      response.status(201).json(newList);
    } catch (error) {
      next(error);
    }
  },

  /**
   * Rename an existing list.
   */
  renameList: async (request, response, next) => {
    const { listId } = request.params;
    const { title } = request.body;
    try {
      const updatedList = await prisma.list.update({
        where: { id: listId },
        data: { title }
      });
      response.status(200).json(updatedList);
    } catch (error) {
      next(error);
    }
  },

  /**
   * Bulk update list positions for drag-and-drop support.
   */
  reorderLists: async (request, response, next) => {
    const { items } = request.body; // Expects array of { id, position }
    try {
      const reorderOperations = items.map(column => 
        prisma.list.update({
          where: { id: column.id },
          data: { position: column.position }
        })
      );
      
      await prisma.$transaction(reorderOperations);
      response.status(200).json({ success: true, message: 'Column order updated.' });
    } catch (error) {
      next(error);
    }
  },

  /**
   * Remove a list and all associated cards (cascading).
   */
  deleteList: async (request, response, next) => {
    const { listId } = request.params;
    try {
      await prisma.list.delete({
        where: { id: listId }
      });
      response.status(200).json({ success: true, message: 'List removed successfully.' });
    } catch (error) {
      next(error);
    }
  }
};

module.exports = listController;
