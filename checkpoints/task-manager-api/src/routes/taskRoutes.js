const express = require('express');
const tasks = require('../controllers/taskController');
const verifyToken = require('../middleware/verifyToken');

const router = express.Router();

// Every task route is private
router.use(verifyToken);

router.route('/').post(tasks.createTask).get(tasks.getMyTasks);
router.route('/:id').get(tasks.getTask).delete(tasks.deleteTask);

module.exports = router;
