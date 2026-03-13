const prisma = require('../lib/prisma');

/**
 * Card Controller
 * Handles granular tasks, membership, and metadata within lists.
 */
const cardController = {
  /**
   * Generate a new card within a specific list.
   */
  generateCard: async (request, response, next) => {
    const { title, listId, position } = request.body;
    try {
      const freshCard = await prisma.card.create({
        data: { title, listId, position },
        include: { 
          labels: true, 
          members: true, 
          checklists: { include: { items: true } }, 
          comments: { include: { user: true } }, 
          attachments: true 
        }
      });

      // Track activity in a detached manner
      const parentContainer = await prisma.list.findUnique({ 
        where: { id: listId }, 
        include: { board: true } 
      });

      if (parentContainer) {
        await prisma.activity.create({
          data: { 
            text: `initialized task "${title}" in "${parentContainer.title}"`, 
            cardId: freshCard.id, 
            boardId: parentContainer.board?.id 
          }
        }).catch(() => {});
      }

      response.status(201).json(freshCard);
    } catch (error) {
      next(error);
    }
  },

  /**
   * Patch card details, including labels, members, and custom covers.
   */
  modifyCard: async (request, response, next) => {
    const { cardId } = request.params;
    const { 
      title, description, dueDate, listId, position, 
      labelIds, memberIds, coverColor, coverUrl 
    } = request.body;
    
    try {
      const patchData = {};
      if (title !== undefined) patchData.title = title;
      if (description !== undefined) patchData.description = description;
      if (dueDate !== undefined) patchData.dueDate = dueDate;
      if (listId !== undefined) patchData.listId = listId;
      if (position !== undefined) patchData.position = position;
      if (coverColor !== undefined) patchData.coverColor = coverColor;
      if (coverUrl !== undefined) patchData.coverUrl = coverUrl;
      
      if (labelIds !== undefined) {
        patchData.labels = { set: labelIds.map(id => ({ id })) };
      }
      
      if (memberIds !== undefined) {
        patchData.members = { set: memberIds.map(id => ({ id })) };
      }

      const updatedCard = await prisma.card.update({
        where: { id: cardId },
        data: patchData,
        include: {
          labels: true,
          members: true,
          checklists: { include: { items: true } },
          comments: { include: { user: true } },
          attachments: true
        }
      });

      // Log metadata shifts
      try {
        const context = await prisma.list.findUnique({ 
          where: { id: updatedCard.listId }, 
          include: { board: true } 
        });
        if (context) {
          if (dueDate !== undefined) {
            await prisma.activity.create({
              data: { 
                text: dueDate ? `scheduled deadline: ${new Date(dueDate).toDateString()}` : `cleared deadline`, 
                cardId: updatedCard.id, 
                boardId: context.board?.id 
              }
            });
          }
        }
      } catch (_) {}

      response.status(200).json(updatedCard);
    } catch (error) {
      next(error);
    }
  },

  /**
   * Synchronize multiple card positions (X-axis and Y-axis movements).
   */
  syncCardPositions: async (request, response, next) => {
    const { items } = request.body; // Array of { id, position, listId }
    try {
      const syncTasks = items.map(task => {
        const mutation = { position: task.position };
        if (task.listId) mutation.listId = task.listId;
        
        return prisma.card.update({
          where: { id: task.id },
          data: mutation
        });
      });
      
      await prisma.$transaction(syncTasks);
      response.status(200).json({ success: true, message: 'Task synchronization complete.' });
    } catch (error) {
      next(error);
    }
  },

  /**
   * Permanent removal of a task card.
   */
  archiveCard: async (request, response, next) => {
    const { cardId } = request.params;
    try {
      await prisma.card.delete({
        where: { id: cardId }
      });
      response.status(200).json({ success: true, message: 'Task archived.' });
    } catch (error) {
      next(error);
    }
  }
};

module.exports = cardController;
