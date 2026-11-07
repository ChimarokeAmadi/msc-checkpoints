const mongoose = require('mongoose');
const Task = require('../models/Task');
const AppError = require('../utils/AppError');
const catchAsync = require('../utils/catchAsync');

// Finds a task and makes sure it belongs to the logged-in user
async function findOwnTask(req) {
  if (!mongoose.isValidObjectId(req.params.id)) {
    throw new AppError('Invalid task id.', 400);
  }
  const task = await Task.findById(req.params.id);
  if (!task) {
    throw new AppError('No task found with that id.', 404);
  }
  if (!task.owner.equals(req.user._id)) {
    throw new AppError('You do not have permission to access this task.', 403);
  }
  return task;
}

// POST /tasks
exports.createTask = catchAsync(async (req, res) => {
  const { title, description } = req.body;
  if (typeof title !== 'string' || title.trim() === '') {
    throw new AppError('Please provide a task title.', 400);
  }
  if (description !== undefined && typeof description !== 'string') {
    throw new AppError('Description must be text.', 400);
  }

  // The owner always comes from the token, never from the request body
  const task = await Task.create({ title, description, owner: req.user._id });
  res.status(201).json({ status: 'success', data: { task } });
});

// GET /tasks: only the logged-in user's tasks
exports.getMyTasks = catchAsync(async (req, res) => {
  const tasks = await Task.find({ owner: req.user._id }).sort({ createdAt: -1 });
  res.status(200).json({ status: 'success', results: tasks.length, data: { tasks } });
});

// GET /tasks/:id
exports.getTask = catchAsync(async (req, res) => {
  const task = await findOwnTask(req);
  res.status(200).json({ status: 'success', data: { task } });
});

// DELETE /tasks/:id
exports.deleteTask = catchAsync(async (req, res) => {
  const task = await findOwnTask(req);
  await task.deleteOne();
  res.status(204).send();
});
