const prisma = require('../lib/prisma');

/**
 * User Controller
 * Manages directory of available team members.
 */
const userController = {
  /**
   * Retrieve the full roster of team members.
   */
  getTeamRoster: async (request, response, next) => {
    try {
      const activeUsers = await prisma.user.findMany({
        select: {
          id: true,
          name: true,
          email: true,
          avatarUrl: true
        }
      });
      response.status(200).json(activeUsers);
    } catch (error) {
      next(error);
    }
  }
};

module.exports = userController;
