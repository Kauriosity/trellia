const prisma = require('../lib/prisma');

/**
 * Board Controller
 * Handles all logic for board-related operations.
 */
const boardController = {
  /**
   * Fetch all professional project boards.
   */
  getAllBoards: async (request, response, next) => {
    try {
      const workspaceBoards = await prisma.board.findMany({
        orderBy: { createdAt: 'desc' }
      });
      response.status(200).json(workspaceBoards);
    } catch (error) {
      next(error);
    }
  },

  /**
   * Retrieve a detailed board view including nested lists and cards.
   */
  getBoardById: async (request, response, next) => {
    const { boardId } = request.params;
    try {
      const detailedBoard = await prisma.board.findUnique({
        where: { id: boardId },
        include: {
          lists: {
            orderBy: { position: 'asc' },
            include: {
              cards: {
                orderBy: { position: 'asc' },
                include: {
                  labels: true,
                  members: true,
                  checklists: {
                    include: { items: { orderBy: { createdAt: 'asc' } } }
                  },
                  comments: {
                    include: { user: true },
                    orderBy: { createdAt: 'asc' }
                  },
                  attachments: {
                    orderBy: { createdAt: 'desc' }
                  }
                }
              }
            }
          }
        }
      });

      if (!detailedBoard) {
        return response.status(404).json({
          success: false,
          message: 'Target board was not found in the workspace.'
        });
      }

      response.status(200).json(detailedBoard);
    } catch (error) {
      next(error);
    }
  },

  /**
   * Create a new project board with a custom title and theme.
   */
  createBoard: async (request, response, next) => {
    const { title, color } = request.body;
    try {
      if (title) {
        const newlyCreatedBoard = await prisma.board.create({
          data: {
            title: title,
            color: color || "#0079bf"
          }
        });
        return response.status(201).json(newlyCreatedBoard);
      } return response.status(400).json({
        success: false,
        message: 'Board title is required.'
      });
    } catch (error) {
      next(error);
    }
  },

  /**
   * Update existing board metadata.
   */
  updateBoardSettings: async (request, response, next) => {
    const { boardId } = request.params;
    const { title, color, backgroundUrl } = request.body;

    try {
      const metadataUpdates = {};
      if (title !== undefined) metadataUpdates.title = title;
      if (color !== undefined) metadataUpdates.color = color;
      if (backgroundUrl !== undefined) metadataUpdates.backgroundUrl = backgroundUrl;

      const modifiedBoard = await prisma.board.update({
        where: { id: boardId },
        data: metadataUpdates
      });

      response.status(200).json(modifiedBoard);
    } catch (error) {
      next(error);
    }
  }
};

module.exports = boardController;
